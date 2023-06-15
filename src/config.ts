import { env } from 'process';

export type S3 = {
  accessKey?: string,
  secretKey?: string,
  region: string,
  endPoint: string,
};

export type AwsAssumeRole = {
  webIdentityTokenFile?: string,
  roleArn?: string,
};

type Config = {
  s3: S3,
  mecaS3: S3,
  awsAssumeRole: AwsAssumeRole,
  mecaAwsAssumeRole: AwsAssumeRole,
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
    region: env.S3_REGION ?? 'us-east-1',
    endPoint: env.S3_ENDPOINT ?? 'https://s3.amazonaws.com',
  },
  awsAssumeRole: {
    webIdentityTokenFile: env.AWS_WEB_IDENTITY_TOKEN_FILE ?? '~/.aws/config',
    roleArn: env.AWS_ROLE_ARN ?? undefined,
  },
  mecaS3: {
    accessKey: env.MECA_AWS_ACCESS_KEY_ID ?? env.AWS_ACCESS_KEY_ID ?? undefined,
    secretKey: env.MECA_AWS_SECRET_ACCESS_KEY ?? env.AWS_SECRET_ACCESS_KEY ?? undefined,
    region: env.MECA_S3_REGION ?? env.S3_REGION ?? 'us-east-1',
    endPoint: env.MECA_S3_ENDPOINT ?? env.S3_ENDPOINT ?? 'https://s3.amazonaws.com',
  },
  mecaAwsAssumeRole: {
    webIdentityTokenFile: env.MECA_AWS_WEB_IDENTITY_TOKEN_FILE ?? env.AWS_WEB_IDENTITY_TOKEN_FILE ?? '~/.aws/config',
    roleArn: env.MECA_AWS_ROLE_ARN ?? env.AWS_ROLE_ARN ?? undefined,
  },
  eppBucketName: env.BUCKET_NAME ?? 'epp',
  eppServerUri: env.EPP_SERVER_URI,
  biorxivURI: env.BIORXIV_URI ?? 'https://api.biorxiv.org',
  prometheusBindAddress: env.PROMETHEUS_BIND_ADDRESS ?? '0.0.0.0:9464',
  temporalServer: env.TEMPORAL_SERVER ?? 'localhost',
};
