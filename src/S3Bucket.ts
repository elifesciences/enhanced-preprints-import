import { S3Client, ListObjectsCommand } from '@aws-sdk/client-s3';
import { config } from './config';

const client = new S3Client({
  credentials: {
    accessKeyId: config.s3AccessKeyId,
    secretAccessKey: config.s3SecretAccessKey,
  },
  endpoint: config.s3Endpoint,
  region: config.s3Region,
  forcePathStyle: true,
});

export const listFilesInPath = async (s3PathPrefix: string): Promise<string[]> => {
  const listCommand = new ListObjectsCommand({
    Bucket: config.s3Bucket,
    Prefix: s3PathPrefix,
  });

  const data = await client.send(listCommand);

  const filePaths = data.Contents?.map((file) => file.Key)
    .filter((filePath): filePath is string => !!filePath) ?? [];
  return filePaths;
};
