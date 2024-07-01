import { mockClient } from 'aws-sdk-client-mock';
import { PutObjectCommand, PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3';
import { generateVersionSummaryJson } from '.';

jest.mock('../config', () => ({
  config: {
    eppS3: { webIdentityTokenFile: '' },
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

const mockS3Client = mockClient(S3Client);

describe('generate-version-summary-json', () => {
  describe('happy path', () => {
    it('generates a version summary', async () => {
      const data = {
        msid: 'msid',
        version: {
          versionIdentifier: 'versionIdentifier',
          id: 'id',
          doi: 'doi',
          publishedDate: new Date('01-07-2024'),
          content: ['http://content'],
        },
      };

      // setup a fake receiver for PutObjectCommand calls
      const uploadedFiles: { [key: string]: any } = {};
      mockS3Client.on(PutObjectCommand).callsFake(async (input: PutObjectCommandInput) => {
        if (typeof input.Key === 'string' && input.Body) {
          uploadedFiles[input.Key] = JSON.parse(input.Body as string);
        }
      });

      await generateVersionSummaryJson(data);
      expect(uploadedFiles).toEqual({
        'automation/id/vversionIdentifier/payload.json': {
          doi: 'doi',
          id: 'idvversionIdentifier',
          msid: 'msid',
          published: '2024-01-07T00:00:00.000Z',
          url: 'http://content',
          versionIdentifier: 'versionIdentifier',
        },
      });
    });

    it.todo('generates a version summary with corrections');
    it.todo('emmits the correct heartbeats');
  });

  describe('error path', () => {
    it.todo('throws NonRetryableError if there is no published date');
    it.todo('throws NonRetryableError if there is no content url');
  });
});
