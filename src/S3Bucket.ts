import { Client } from 'minio';
import { config } from './config';

export const getS3ClientByName = (name: string): Client => {
  if (config.s3Connections[name] === undefined) {
    throw Error(`Cannot find s3 client config by the name of ${name}`);
  }
  return new Client(config.s3Connections[name]);
};
