import { VersionedPreprint } from '@elifesciences/docmap-ts';
import { createWriteStream, readFileSync } from 'fs';
import { S3Client } from '@aws-sdk/client-s3';
import { fromWebToken, fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { Readable } from 'stream';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import { S3Config, config } from './config';
import { VersionTypes } from './types';

const getAWSCredentials = (s3config: S3Config) => {
  if (s3config.webIdentityTokenFile !== undefined && s3config.awsAssumeRoleArn !== undefined) {
    const webIdentityToken = readFileSync(s3config.webIdentityTokenFile, 'utf-8');
    return fromWebToken({
      roleArn: s3config.awsAssumeRoleArn,
      clientConfig: {
        region: s3config.region,
      },
      webIdentityToken,
    });
  }
  if (s3config.awsAssumeRoleArn !== undefined) {
    return fromTemporaryCredentials({
      params: {
        RoleArn: s3config.awsAssumeRoleArn,
        DurationSeconds: 900,
      },
      masterCredentials: {
        accessKeyId: s3config.accessKey ?? '',
        secretAccessKey: s3config.secretKey ?? '',
      },
      clientConfig: {
        region: s3config.region,
      },
    });
  }
  return {
    accessKeyId: s3config.accessKey ?? '',
    secretAccessKey: s3config.secretKey ?? '',
  };
};

export const getS3Client = (s3config: S3Config) => new S3Client({
  credentials: getAWSCredentials(s3config),
  endpoint: s3config.endPoint,
  forcePathStyle: true,
  region: s3config.region,
  ...((s3config.connectionTimeout || s3config.requestTimeout) ? {
    requestHandler: new NodeHttpHandler({
      ...(s3config.connectionTimeout ? { connectionTimeout: s3config.connectionTimeout } : {}),
      ...(s3config.requestTimeout ? { requestTimeout: s3config.requestTimeout } : {}),
    }),
  } : {}),
});

export const getEPPS3Client = () => getS3Client(config.eppS3);
export const getMecaS3Client = () => getS3Client(config.mecaS3);

export const sharedS3 = (): boolean => (config.eppS3.endPoint === config.mecaS3.endPoint);

export const parseS3Path = (s3Path: string): S3File => {
  const url = new URL(s3Path);
  return {
    Bucket: url.host,
    Key: `${url.pathname.replace(/^\//, '')}${url.hash}`,
  };
};

export type S3File = {
  Bucket: string,
  Key: string,
};

const constructEPPS3FilePath = (filename: string): S3File => ({
  Bucket: config.eppBucketName,
  Key: `${config.eppBucketPrefix}${filename}`,
});

export const constructEPPMecaS3FilePath = (mecaFileName: string): S3File => constructEPPS3FilePath(`meca/${mecaFileName}`);

export const constructEPPStateS3FilePath = (stateFileName: string): S3File => constructEPPS3FilePath(`state/${stateFileName}`);

export const constructEPPVersionS3FilePath = (filename: string, version: VersionTypes | VersionedPreprint): S3File => constructEPPS3FilePath(`${version.id}/v${version.versionIdentifier}/${filename}`);

export const getPrefixlessKey = (file: S3File): string => file.Key.replace(new RegExp(`^${config.eppBucketPrefix}`), '');

export const streamToFile = (body: Readable, localPath: string) => new Promise((resolve, reject) => {
  const stream = body;
  const writeStream = createWriteStream(localPath);
  stream.pipe(writeStream);

  writeStream.on('finish', () => resolve('finished'));
  writeStream.on('error', reject);
});
