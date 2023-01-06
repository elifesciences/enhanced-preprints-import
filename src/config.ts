import { ClientOptions } from 'minio';

type Config = {
  s3Connections: { [key: string]: ClientOptions; },
  eppContentUri: string,
};

export const config: Config = {
  s3Connections: {
    biorxiv: {
      accessKey: 'minio',
      secretKey: 'miniotest',
      region: 'us-east-1',
      endPoint: 'minio',
      port: 9000,
      useSSL: false,
    },
    epp: {
      accessKey: 'minio',
      secretKey: 'miniotest',
      region: 'us-east-1',
      endPoint: 'minio',
      port: 9000,
      useSSL: false,
    },
  },
  eppContentUri: 's3://epp/',
};
