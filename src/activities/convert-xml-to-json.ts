import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { convert } from '@stencila/encoda';
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

type TransformResponse = {
  xml: string,
  logs: string[],
};

type ConvertXmlToJsonOutput = {
  result: PutObjectCommandOutput,
  path: S3File,
  xsltLogs: string[],
};

export const transformXML = async (xmlInput: string): Promise<TransformResponse> => {
  Context.current().heartbeat('Starting XML transform');
  const transformedResponse = await axios.post<TransformResponse>(config.xsltTransformAddress, xmlInput);

  Context.current().heartbeat('Finishing XML transform');
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
  s3.send(new CopyObjectCommand({
    Bucket: sourceXMLDestination.Bucket,
    Key: sourceXMLDestination.Key,
    CopySource: sourceBucketAndPath,
    CopySourceIfNoneMatch: destinationETag,
  }));
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

  const transformedXML = await transformXML(xml);

  // store the transformed XML for downstream processing
  const transformedXMLDestination = constructEPPVersionS3FilePath('article-transformed.xml', version);
  await s3.send(new PutObjectCommand({
    Bucket: transformedXMLDestination.Bucket,
    Key: transformedXMLDestination.Key,
    Body: transformedXML.xml,
  }));

  fs.writeFileSync(localXmlFilePath, transformedXML.xml);

  const converted = await convert(
    localXmlFilePath,
    undefined, // require undefined to return html, causes console output
    {
      from: 'jats',
      to: 'json',
      encodeOptions: {
        isBundle: false,
      },
    },
  );

  if (converted === undefined) {
    throw new Error(`Could not convert XML file ${localXmlFilePath}`);
  }

  // correct any paths in the json
  const corrected = mecaFiles.supportingFiles.reduce((json, mecaFile) => {
    // this is a construct of where the files would have been relative to the article in the meca archive
    const oldPath = path.join(tmpDirectory, mecaFile.path);

    // this is where the path would be relative to the S3 root directory + meca path
    const newPath = getPrefixlessKey(constructEPPVersionS3FilePath(mecaFile.path, version));

    return json.replaceAll(oldPath, newPath);
  }, converted);

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
    xsltLogs: transformedXML.logs,
  };
};
