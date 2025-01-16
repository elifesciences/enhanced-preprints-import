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
import { WorkflowArgs } from '../types';

type TransformXmlResponse = {
  xml: string,
  logs: string[],
};

type TransformXmlToJsonResponse = {
  version: string,
  body: string,
};

type ConvertXmlToJsonArgs = WorkflowArgs & {
  version: VersionedReviewedPreprint,
  mecaFiles: MecaFiles,
};

type ConvertXmlToJsonOutput = {
  result: PutObjectCommandOutput,
  path: S3File,
  xsltLogs: string[],
  encodaVersion: string,
};

type TransformXmlArgs = {
  xml: string,
  xsltBlacklist?: string,
  xsltTransformPassthrough?: boolean,
};

export const transformXML = async ({ xml, xsltBlacklist, xsltTransformPassthrough }: TransformXmlArgs): Promise<TransformXmlResponse> => {
  Context.current().heartbeat('Starting XML transform');
  const headers: Record<string, string> = {};

  if (xsltBlacklist) {
    headers['X-Blacklist'] = xsltBlacklist;
  }

  if (xsltTransformPassthrough) {
    headers['X-Passthrough'] = 'true';
  }

  const transformedResponse = await axios.post<TransformXmlResponse>(
    config.xsltTransformAddress,
    xml,
    ...(Object.keys(headers).length ? [{
      headers,
    }] : []),
  );

  Context.current().heartbeat('Finishing XML transform');
  return transformedResponse.data;
};

export const transformXMLToJson = async (xml: string, version: string, replacementPath?: string): Promise<TransformXmlToJsonResponse> => {
  Context.current().heartbeat('Starting XML to JSON transform');
  const transformedResponse = await axios.post<TransformXmlToJsonResponse>(config.encodaTransformAddress, xml, {
    params: {
      ...replacementPath ? { replacementPath } : {},
    },
    headers: {
      accept: `application/vnd.elife.encoda.v${version}+json`,
    },
  });
  Context.current().heartbeat('Finishing XML to JSON transform');
  return {
    version: transformedResponse.headers['content-type'].split(';').map((i: string) => i.trim())[0],
    body: JSON.stringify(transformedResponse.data),
  };
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

export const convertXmlToJson = async ({ version, mecaFiles, workflowArgs }: ConvertXmlToJsonArgs): Promise<ConvertXmlToJsonOutput> => {
  const tmpDirectory = await mkdtemp(`${tmpdir()}/epp_json`);
  const localXmlFilePath = `${tmpDirectory}/${mecaFiles.article.path}`;
  // mkdir in case the article path is in a subdirectory
  fs.mkdirSync(path.dirname(localXmlFilePath), { recursive: true });

  const s3 = getEPPS3Client();
  const source = constructEPPVersionS3FilePath(mecaFiles.article.path, version);

  await copySourceXmlToKnownPath(source, version);

  const object = await s3.send(new GetObjectCommand(source));

  const xml = await object.Body?.transformToString();
  if (!xml) {
    throw new Error('Unable to retrieve XML from S3');
  }

  const transformedXMLResponse = await transformXML({ xml, ...workflowArgs });

  // store the transformed XML for downstream processing
  const transformedXMLDestination = constructEPPVersionS3FilePath('article-transformed.xml', version);
  await s3.send(new PutObjectCommand({
    Bucket: transformedXMLDestination.Bucket,
    Key: transformedXMLDestination.Key,
    Body: transformedXMLResponse.xml,
  }));

  fs.writeFileSync(localXmlFilePath, transformedXMLResponse.xml);

  // This replaces the path of other resources pointed to in original Meca with their new location in S3
  // i.e. if the XML file was in the Zip as `content/123/123.xml` for id 456 version 1, we pass in `456/v1/content/123/` as a replacement paths to other resources
  const originalPath = path.dirname(getPrefixlessKey(constructEPPVersionS3FilePath(mecaFiles.article.path, version)));
  const transformedJsonResponse = await transformXMLToJson(
    transformedXMLResponse.xml,
    config.encodaDefaultVersion,
    originalPath,
  );

  // Upload destination in S3
  const destination = constructEPPVersionS3FilePath('article.json', version);
  const result = await s3.send(new PutObjectCommand({
    Bucket: destination.Bucket,
    Key: destination.Key,
    Body: transformedJsonResponse.body,
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
