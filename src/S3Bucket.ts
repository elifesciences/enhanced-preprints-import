import { Client } from 'minio';
import { config } from './config';

export const getS3Client = (): Client => new Client(config.s3);

export const parseS3Path = (s3Path: string) => {
  const url = new URL(s3Path);
  return {
    Bucket: url.host,
    Key: url.pathname.replace(/^\//, ''),
  };
};
