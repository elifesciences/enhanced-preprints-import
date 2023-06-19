import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { readFileSync } from 'fs';
import { S3Client } from '@aws-sdk/client-s3';
import { fromWebToken, fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { config } from './config';

const getAWSCredentials = () => {
  if (config.awsAssumeRole.webIdentityTokenFile !== undefined && config.awsAssumeRole.roleArn !== undefined) {
    const webIdentityToken = readFileSync(config.awsAssumeRole.webIdentityTokenFile, 'utf-8');
    return fromWebToken({
      roleArn: config.awsAssumeRole.roleArn,
      clientConfig: {
        region: config.s3.region,
      },
      webIdentityToken,
    });
  }
  if (config.awsAssumeRole.roleArn !== undefined) {
    return fromTemporaryCredentials({
      params: {
        RoleArn: config.awsAssumeRole.roleArn,
        DurationSeconds: 900,
      },
      clientConfig: {
        credentials: {
          accessKeyId: config.s3.accessKey ?? '',
          secretAccessKey: config.s3.secretKey ?? '',
        },
        region: config.s3.region,
      },
    });
  }
  return {
    accessKeyId: config.s3.accessKey ?? '',
    secretAccessKey: config.s3.secretKey ?? '',
  };
};

export const getS3Client = () => new S3Client({
  credentials: getAWSCredentials(),
  endpoint: config.s3.endPoint,
  forcePathStyle: true,
  region: config.s3.region,
});

export const parseS3Path = (s3Path: string): S3File => {
  const url = new URL(s3Path);
  return {
    Bucket: url.host,
    Key: url.pathname.replace(/^\//, ''),
  };
};

export type S3File = {
  Bucket: string,
  Key: string,
};

export const constructEPPS3FilePath = (filename: string, version: VersionedReviewedPreprint): S3File => ({
  Bucket: config.eppBucketName,
  Key: `${version.id}/v${version.versionIdentifier}/${filename}`,
});
