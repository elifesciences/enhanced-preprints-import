import { ClientOptions } from 'minio';
import { env } from 'process';

type Config = {
  s3: ClientOptions,
  eppContentUri: string,
  eppServerUri: string,
};

if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_KEY) {
  throw Error('Environment variables `AWS_ACCESS_KEY_ID` and `AWS_SECRET_KEY` are required');
}

if (!env.EPP_SERVER_URI) {
  throw Error('Environment variable `EPP_SERVER_URI` is required');
}

export const config: Config = {
  s3: {
    accessKey: env.AWS_ACCESS_KEY_ID,
    secretKey: env.AWS_SECRET_KEY,
    region: 'us-east-1',
    endPoint: 'minio',
    port: 9000,
    useSSL: false,
  },
  eppContentUri: 's3://epp/',
  eppServerUri: env.EPP_SERVER_URI,
};
