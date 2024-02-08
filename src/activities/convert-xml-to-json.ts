import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { Context } from '@temporalio/activity';
import {
  CopyObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  PutObjectCommandOutput,
} from '@aws-sdk/client-s3';
import {
  constructEPPVersionS3FilePath, getEPPS3Client, getPrefixlessKey, S3File,
} from '../S3Bucket';
import { MecaFiles } from './extract-meca';
import { config } from '../config';

type TransformXmlResponse = {
  xml: string,
  logs: string[],
};

type TransformXmlToJsonResponse = {
  json: string,
  version: string,
};

type ConvertXmlToJsonOutput = {
  result: PutObjectCommandOutput,
  path: S3File,
  xsltLogs: string[],
  encodaVersion: string,
};

export const transformXML = async (xmlInput: string): Promise<TransformXmlResponse> => {
  Context.current().heartbeat('Starting XML transform');
  const transformedResponse = await axios.post<TransformXmlResponse>(config.xsltTransformAddress, xmlInput);

  Context.current().heartbeat('Finishing XML transform');
  return transformedResponse.data;
};

export const transformXMLToJson = async (xmlInput: string, version: string, replacementPath?: string): Promise<TransformXmlToJsonResponse> => {
  Context.current().heartbeat('Starting XML to JSON transform');
  const transformedResponse = await axios.post<TransformXmlToJsonResponse>(config.encodaTransformAddress, xmlInput, {
    params: replacementPath ? { replacementPath } : {},
    headers: {
      accept: `application/vnd.elife.encoda.${version}+json`,
    },
  });
  Context.current().heartbeat('Finishing XML to JSON transform');
  return transformedResponse.data;
};

const copySourceXmlToKnownPath = async (source: S3File, version: VersionedReviewedPreprint) => {
  const s3 = getEPPS3Client();

  const sourceBucketAndPath = `${source.Bucket}/${source.Key}`;
  const sourceXMLDestination = constructEPPVersionS3FilePath('article-source.xml', version);

  let destinationETag;
  try {
    const destinationExistsResult = await s3.send(new HeadObjectCommand({
      Bucket: sourceXMLDestination.Bucket,
      Key: sourceXMLDestination.Key,
    }));
    destinationETag = destinationExistsResult.ETag;
    console.info('convertXmlToJson - Source XML Destination exists - will compare ETag. ', source);
  } catch (e) {
    if (!(e instanceof NotFound)) {
      throw e;
    }
  }
  try {
    await s3.send(new CopyObjectCommand({
      Bucket: sourceXMLDestination.Bucket,
      Key: sourceXMLDestination.Key,
      CopySource: sourceBucketAndPath,
      CopySourceIfNoneMatch: destinationETag,
    }));
  } catch (e: any) {
    if (!(e.Code && e.Code === 'PreconditionFailed')) {
      throw e;
    }
  }
};

export const convertXmlToJson = async (version: VersionedReviewedPreprint, mecaFiles: MecaFiles): Promise<ConvertXmlToJsonOutput> => {
  const tmpDirectory = await mkdtemp(`${tmpdir()}/epp_json`);
  const localXmlFilePath = `${tmpDirectory}/${mecaFiles.article.path}`;
  // mkdir incase the article path is in a subdirectory
  fs.mkdirSync(path.dirname(localXmlFilePath), { recursive: true });

  const s3 = getEPPS3Client();
  const source = constructEPPVersionS3FilePath(mecaFiles.article.path, version);

  await copySourceXmlToKnownPath(source, version);

  const object = await s3.send(new GetObjectCommand(source));

  const xml = await object.Body?.transformToString();
  if (!xml) {
    throw new Error('Unable to retrieve XML from S3');
  }

  const transformedXMLResponse = await transformXML(xml);

  // store the transformed XML for downstream processing
  const transformedXMLDestination = constructEPPVersionS3FilePath('article-transformed.xml', version);
  await s3.send(new PutObjectCommand({
    Bucket: transformedXMLDestination.Bucket,
    Key: transformedXMLDestination.Key,
    Body: transformedXMLResponse.xml,
  }));

  fs.writeFileSync(localXmlFilePath, transformedXMLResponse.xml);

  const replacementPathToken = 'replacementPathToken/';
  const transformedJsonResponse = await transformXMLToJson(
    transformedXMLResponse.xml,
    config.encodaDefaultVersion,
    replacementPathToken,
  );

  // correct any paths in the json
  const corrected = mecaFiles.supportingFiles.reduce((json, mecaFile) => {
    // this where the files would have been relative to the article in the meca archive
    const oldPath = path.join(replacementPathToken, mecaFile.path);

    // this is where the path would be relative to the S3 root directory + meca path
    const newPath = getPrefixlessKey(constructEPPVersionS3FilePath(mecaFile.path, version));

    return json.replaceAll(oldPath, newPath);
  }, transformedJsonResponse.json);

  // Upload destination in S3
  const destination = constructEPPVersionS3FilePath('article.json', version);
  const result = await s3.send(new PutObjectCommand({
    Bucket: destination.Bucket,
    Key: destination.Key,
    Body: corrected,
  }));

  // Delete tmpDirectory
  fs.rmSync(tmpDirectory, { recursive: true, force: true });

  return {
    result,
    path: destination,
    xsltLogs: transformedXMLResponse.logs,
    encodaVersion: transformedJsonResponse.version,
  };
};
