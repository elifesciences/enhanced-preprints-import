import { mockClient } from 'aws-sdk-client-mock';
import {
  CopyObjectCommand,
  CopyObjectCommandInput,
  HeadObjectCommand,
  HeadObjectCommandInput,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { copySourcePreprintToEPP } from './copy-source-meca';

jest.mock('../config', () => ({
  config: {
    eppS3: { endPoint: 'https://s3.amazonaws.com' },
    mecaS3: { endPoint: 'https://s3.amazonaws.com' },
    eppBucketName: 'test-bucket', // This is the default bucket name to store files in S3
    eppBucketPrefix: 'automation/', // This is the default prefix to give to files in S3
  },
}));

jest.mock('@temporalio/activity', () => ({
  Context: {
    current: () => ({
      heartbeat: () => {},
    }),
  },
}));

describe('copy-source-meca', () => {
  it.each([
    {
      version: {
        id: 'id1',
        versionIdentifier: 'ver1',
        doi: '1',
        preprint: {
          doi: '2',
          id: 'id2',
          content: [
            's3://epp/meca.meca',
          ],
        },
      },
      expectedSource: 'epp/meca.meca',
      expectedPutBody: 'meca',
    },
    {
      version: {
        id: 'id1',
        versionIdentifier: 'ver1',
        doi: '1',
        preprint: {
          doi: '2',
          id: 'id2',
          content: [
            's3://epp/meca.meca',
          ],
        },
        content: [
          's3://epp/meca-enhanced.meca',
        ],
      },
      expectedSource: 'epp/meca-enhanced.meca',
      expectedPutBody: 'meca-enhanced',
    },
  ])('copies source meca to EPP s3', async ({ version, expectedSource, expectedPutBody }) => {
    const mockS3Client = mockClient(S3Client);
    mockS3Client.on(PutObjectCommand)
      .callsFake(async (input: PutObjectCommandInput) => {
        expect(input).toStrictEqual({
          Body: expectedPutBody,
          Bucket: 'test-bucket',
          Key: 'automation/id1/vver1/source.txt',
        });
      });

    mockS3Client.on(HeadObjectCommand)
      .callsFake(async (input: HeadObjectCommandInput) => {
        expect(input).toStrictEqual({
          Bucket: 'test-bucket',
          Key: 'automation/id1/vver1/content.meca',
        });
      }).resolves({
        ETag: 'etag',
      });

    mockS3Client.on(CopyObjectCommand)
      .callsFake(async (input: CopyObjectCommandInput) => {
        expect(input).toStrictEqual({
          Bucket: 'test-bucket',
          CopySource: expectedSource,
          CopySourceIfNoneMatch: 'etag',
          Key: 'automation/id1/vver1/content.meca',
          RequestPayer: 'requester',
        });
      });

    const result = await copySourcePreprintToEPP(version);
    expect(result).toStrictEqual({
      path: {
        Bucket: 'test-bucket',
        Key: 'automation/id1/vver1/content.meca',
      },
      type: 'COPY',
    });
  });
});
