import { mockClient } from 'aws-sdk-client-mock';
import { PutObjectCommand, PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3';
import { generateVersionSummaryJson } from '.';
import { NonRetryableError } from '../errors';

jest.mock('../config', () => ({
  config: {
    eppS3: { webIdentityTokenFile: '' },
    eppBucketName: 'test-bucket', // This is the default bucket name to store files in S3
    eppBucketPrefix: 'automation/', // This is the default prefix to give to files in S3
  },
}));

jest.mock('@temporalio/activity', () => ({
  Context: {
    current: jest.fn().mockReturnValue({
      heartbeat: jest.fn(),
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
          publishedDate: new Date('2024-07-01'),
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
          published: '2024-07-01T00:00:00.000Z',
          url: 'http://content',
          versionIdentifier: 'versionIdentifier',
        },
      });
    });

    it('generates a version summary with corrections', async () => {
      const data = {
        msid: 'msid',
        version: {
          versionIdentifier: 'versionIdentifier',
          id: 'id',
          doi: 'doi',
          publishedDate: new Date('2024-06-01'),
          content: ['http://content'],
          corrections: [
            {
              content: ['http://correction'],
              correctedDate: new Date('2024-06-15'),
            },
            {
              content: ['http://correction2'],
              correctedDate: new Date('2024-07-01'),
            },
          ],
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
          published: '2024-06-01T00:00:00.000Z',
          url: 'http://content',
          versionIdentifier: 'versionIdentifier',
          corrections: [
            {
              content: 'http://correction',
              date: '2024-06-15T00:00:00.000Z',
            },
            {
              content: 'http://correction2',
              date: '2024-07-01T00:00:00.000Z',
            },
          ],
        },
      });
    });

    it.todo('emits the correct heartbeats');
  });

  describe('error path', () => {
    it('throws NonRetryableError if there is no published date', async () => {
      const data = {
        msid: 'msid',
        version: {
          versionIdentifier: 'versionIdentifier',
          id: 'id',
          doi: 'doi',
          content: ['http://content'],
        },
      };

      const error = new NonRetryableError("Preprint doesn't have a published date");

      await expect(generateVersionSummaryJson(data)).rejects.toStrictEqual(error);
    });

    it('throws NonRetryableError if there is no content url', async () => {
      const data = {
        msid: 'msid',
        version: {
          versionIdentifier: 'versionIdentifier',
          id: 'id',
          doi: 'doi',
          publishedDate: new Date('2024-06-01'),
          content: ['content'],
        },
      };

      const error = new NonRetryableError("Preprint doesn't have a content URL");

      await expect(generateVersionSummaryJson(data)).rejects.toStrictEqual(error);
    });
  });
});
