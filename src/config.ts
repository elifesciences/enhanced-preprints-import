import { env } from 'process';
import { S3ClientConfig } from '@aws-sdk/client-s3';
import { fromWebToken } from '@aws-sdk/credential-providers';

type Config = {
  s3: S3ClientConfig,
  eppBucketName: string,
  eppServerUri: string,
  biorxivURI: string,
};

if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
  throw Error('Environment variables `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are required');
}

if (!env.EPP_SERVER_URI) {
  throw Error('Environment variable `EPP_SERVER_URI` is required');
}

export const config: Config = {
  s3: {
    credentials: process.env.AWS_WEB_IDENTITY_TOKEN_FILE && process.env.AWS_ROLE_ARN ? fromWebToken({
      roleArn: process.env.AWS_ROLE_ARN,
      clientConfig: {
        region: process.env.S3_REGION ?? 'us-east-1',
      },
      webIdentityToken: process.env.AWS_WEB_IDENTITY_TOKEN_FILE,
    }) : {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
    region: 'us-east-1',
    endpoint: env.S3_ENDPOINT ?? 'https://s3.amazonaws.com',
    forcePathStyle: true,
  },
  eppBucketName: env.BUCKET_NAME ?? 'epp',
  eppServerUri: env.EPP_SERVER_URI,
  biorxivURI: env.BIORXIV_URI ?? 'https://api.biorxiv.org',
};
