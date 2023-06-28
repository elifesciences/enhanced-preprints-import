import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { readFileSync } from 'fs';
import { S3Client } from '@aws-sdk/client-s3';
import { fromWebToken, fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { S3Config, config } from './config';

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
});

export const getEPPS3Client = () => getS3Client(config.eppS3);
export const getMecaS3Client = () => getS3Client(config.mecaS3);

export const sharedS3 = (): boolean => (config.eppS3.endPoint === config.mecaS3.endPoint);

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
  Key: `${config.eppBucketPrefix}${version.id}/v${version.versionIdentifier}/${filename}`,
});
