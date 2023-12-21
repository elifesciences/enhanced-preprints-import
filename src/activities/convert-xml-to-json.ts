import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { Context } from '@temporalio/activity';
import {
  GetObjectCommand,
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
  xml: string,
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

export const convertXmlToJson = async (version: VersionedReviewedPreprint, mecaFiles: MecaFiles): Promise<ConvertXmlToJsonOutput> => {
  const tmpDirectory = await mkdtemp(`${tmpdir()}/epp_json`);
  const localXmlFilePath = `${tmpDirectory}/${mecaFiles.article.path}`;
  // mkdir incase the article path is in a subdirectory
  fs.mkdirSync(path.dirname(localXmlFilePath), { recursive: true });

  const s3 = getEPPS3Client();
  const source = constructEPPVersionS3FilePath(mecaFiles.article.path, version);
  const object = await s3.send(new GetObjectCommand(source));

  const xml = await object.Body?.transformToString();
  if (!xml) {
    throw new Error('Unable to retrieve XML from S3');
  }

  const transformedXMLResponse = await transformXML(xml);

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
  }, transformedJsonResponse.xml);

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
