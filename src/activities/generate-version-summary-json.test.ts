import { mockClient } from "aws-sdk-client-mock";
import { generateVersionSummaryJson } from ".";
import { PutObjectCommand, PutObjectCommandInput, S3Client } from "@aws-sdk/client-s3";
import { ReadStream } from "fs";

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

// utility function from https://gist.github.com/lambrospetrou/0c9ac9da14d8d241ae3634981ceb2871
function streamToString(stream: ReadStream): Promise<string> {
  const chunks: Array<any> = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}
describe('generate-version-summary-json', () => {
  describe('happy path', () => {
    it('generates a version summary', async () => {
      const data = { msid: 'msid', version: {
        versionIdentifier: 'versionIdentifier',
        id: 'id',
        doi: 'doi',
        publishedDate: new Date('01-07-2024'),
        content: ['http://content']
      }};

       // setup a fake receiver for PutObjectCommand calls
      const uploadedFiles: { [key: string]: string } = {};
      mockS3Client.on(PutObjectCommand).callsFake(async (input: PutObjectCommandInput) => {
        if (typeof input.Key === 'string' && input.Body) {
          uploadedFiles[input.Key] = await streamToString(input.Body as ReadStream);
        }
      });

      const result = await generateVersionSummaryJson(data);
      expect(Object.keys(uploadedFiles).sort()).toEqual([
        'automation/id1/vver1/2212.00741/2212.00741.xml',
      ]);
    });
    it.todo('generates a version summary with corrections');
    it.todo('emmits the correct heartbeats');
  });

  describe('error path', () => {
    it.todo('throws NonRetryableError if there is no published date');
    it.todo('throws NonRetryableError if there is no content url');
  });
});
