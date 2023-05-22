import { env } from 'process';

type Config = {
  s3: {
    accessKey?: string,
    secretKey?: string,
    region: string,
    endPoint: string,
  },
  awsAssumeRole: {
    webIdentityTokenFile?: string,
    roleArn?: string,
  },
  eppBucketName: string,
  eppServerUri: string,
  biorxivURI: string,
  temporalServer: string,
  prometheusBindAddress: string,
};

if (!env.EPP_SERVER_URI) {
  throw Error('Environment variable `EPP_SERVER_URI` is required');
}

export const config: Config = {
  s3: {
    accessKey: env.AWS_ACCESS_KEY_ID ?? undefined,
    secretKey: env.AWS_SECRET_ACCESS_KEY ?? undefined,
    region: 'us-east-1',
    endPoint: env.S3_ENDPOINT ?? 'https://s3.amazonaws.com',
  },
  awsAssumeRole: {
    webIdentityTokenFile: env.AWS_WEB_IDENTITY_TOKEN_FILE ?? '~/.aws/config',
    roleArn: env.AWS_ROLE_ARN ?? undefined,
  },
  eppBucketName: env.BUCKET_NAME ?? 'epp',
  eppServerUri: env.EPP_SERVER_URI,
  biorxivURI: env.BIORXIV_URI ?? 'https://api.biorxiv.org',
  prometheusBindAddress: env.PROMETHEUS_BIND_ADDRESS ?? '0.0.0.0:9464',
  temporalServer: process.env.TEMPORAL_SERVER ?? 'localhost',
};
