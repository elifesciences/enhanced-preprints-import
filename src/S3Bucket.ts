import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { readFileSync } from 'fs';
import { S3Client } from '@aws-sdk/client-s3';
import { fromWebToken } from '@aws-sdk/credential-providers';
import { config } from './config';

export const getS3Client = () => {
  if (config.awsAssumeRole.webIdentityTokenFile !== undefined && config.awsAssumeRole.roleArn !== undefined) {
    const webIdentityToken = readFileSync(config.awsAssumeRole.webIdentityTokenFile, 'utf-8');
    const client = new S3Client({
      credentials: fromWebToken({
        roleArn: config.awsAssumeRole.roleArn,
        clientConfig: {
          region: config.s3.region,
        },
        webIdentityToken,
      }),
      endpoint: config.s3.endPoint,
      forcePathStyle: true,
      region: config.s3.region,
    });

    // Middleware added to client, applies to all commands.
    client.middlewareStack.add(
      (next) => async (args) => {
        // eslint-disable-next-line no-param-reassign
        (args.request as any).headers['x-amz-request-payer'] = 'requester';
        const result = await next(args);
        // result.response contains data returned from next middleware.
        return result;
      },
      {
        step: 'build',
        name: 'addRequesterMiddleware',
        tags: ['REQUEST', 'PAYER'],
      },
    );
    return client;
  }

  return new S3Client({
    credentials: {
      accessKeyId: config.s3.accessKey ?? '',
      secretAccessKey: config.s3.secretKey ?? '',
    },
    endpoint: config.s3.endPoint,
    forcePathStyle: true,
    region: config.s3.region,
  });
};

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
