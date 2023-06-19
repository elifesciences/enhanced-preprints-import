import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { readFileSync } from 'fs';
import { S3Client } from '@aws-sdk/client-s3';
import { fromWebToken, fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { AwsAssumeRole, S3, config } from './config';

const getAWSCredentials = (awsAssumeRole: AwsAssumeRole, s3: S3) => {
  if (awsAssumeRole.webIdentityTokenFile !== undefined && awsAssumeRole.roleArn !== undefined) {
    const webIdentityToken = readFileSync(awsAssumeRole.webIdentityTokenFile, 'utf-8');
    return fromWebToken({
      roleArn: awsAssumeRole.roleArn,
      clientConfig: {
        region: config.s3.region,
      },
      webIdentityToken,
    });
  }
  if (config.awsAssumeRole.roleArn !== undefined) {
    return fromTemporaryCredentials({
      params: {
        RoleArn: awsAssumeRole.roleArn,
        DurationSeconds: 900,
      },
      clientConfig: {
        credentials: {
          accessKeyId: s3.accessKey ?? '',
          secretAccessKey: s3.secretKey ?? '',
        },
        region: s3.region,
      },
    });
  }
  return {
    accessKeyId: config.s3.accessKey ?? '',
    secretAccessKey: config.s3.secretKey ?? '',
  };
};

const preprareS3Client = (awsAssumeRole: AwsAssumeRole, s3: S3) => new S3Client({
  credentials: getAWSCredentials(awsAssumeRole, s3),
  endpoint: s3.endPoint,
  forcePathStyle: true,
  region: s3.region,
});

export const getS3Client = () => preprareS3Client(config.awsAssumeRole, config.s3);
export const getMecaS3Client = () => preprareS3Client(config.mecaAwsAssumeRole, config.mecaS3);
export const sharedS3 = (): boolean => (config.s3.endPoint === config.mecaS3.endPoint);

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
