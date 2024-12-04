import { parseS3Path, getAWSCredentials } from './S3Bucket';
import { config } from './config';

jest.mock('./config', () => ({
  config: {
    eppBucketName: 'test-bucket', // This is the default bucket name to store files in S3
    eppBucketPrefix: 'automation/', // This is the default prefix to give to files in S3
  },
}));

describe('S3 Bucket', () => {
  it('parses the S3 path correctly', async () => {
    const S3Path = 's3://biorxiv/dummy-1.meca';
    const result = parseS3Path(S3Path);
    expect(result).toEqual({
      Bucket: 'biorxiv',
      Key: 'dummy-1.meca',
    });
  });

  it('returns AWS credentials', async () => {
    const result = getAWSCredentials({
      region: config?.eppS3.region
    });
    expect(result).toEqual({
      accessKeyId: 'id',
      secretAccessKey: 'key'
    })
  });
});
