import { ClientOptions } from 'minio';
import { env } from 'process';

type Config = {
  s3: ClientOptions,
  s3Meca: ClientOptions,
  eppBucketName: string,
  eppServerUri: string,
  biorxivURI: string,
};

if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.MECA_AWS_ACCESS_KEY_ID || !env.MECA_AWS_SECRET_ACCESS_KEY) {
  throw Error('Environment variables `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are required');
}

if (!env.EPP_SERVER_URI) {
  throw Error('Environment variable `EPP_SERVER_URI` is required');
}

export const config: Config = {
  s3: {
    accessKey: env.AWS_ACCESS_KEY_ID,
    secretKey: env.AWS_SECRET_ACCESS_KEY,
    region: 'us-east-1',
    endPoint: env.S3_ENDPOINT ?? 's3.amazonaws.com',
    port: 9000,
    useSSL: false,
  },
  s3Meca: {
    accessKey: env.MECA_AWS_ACCESS_KEY_ID,
    secretKey: env.MECA_AWS_SECRET_ACCESS_KEY,
    region: 'us-east-1',
    endPoint: env.MECA_S3_ENDPOINT ?? 's3.amazonaws.com',
    port: 9000,
    useSSL: false,
  },
  eppBucketName: env.BUCKET_NAME ?? 'epp',
  eppServerUri: env.EPP_SERVER_URI,
  biorxivURI: env.BIORXIV_URI ?? 'https://api.biorxiv.org',
};
