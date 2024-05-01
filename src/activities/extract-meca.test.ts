import { mockClient } from 'aws-sdk-client-mock';
import {
  GetObjectCommand, PutObjectCommand, PutObjectCommandInput, S3Client,
} from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
import { ReadStream, createReadStream } from 'fs';
import { extractMeca } from './extract-meca';
import extractedMecaResult from '../test-utils/extracted-meca-file.json';

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

describe('extract-meca-activity', () => {
  it('returns extracted meca file', async () => {
    const stream = createReadStream('./mock-data/meca/dummy-1.meca');
    const sdkStream = sdkStreamMixin(stream);
    mockS3Client.on(GetObjectCommand).resolves({
      Body: sdkStream,
    });

    // setup a fake receiver for PutObjectCommand calls
    const uploadedFiles: { [key: string]: string } = {};
    mockS3Client.on(PutObjectCommand).callsFake(async (input: PutObjectCommandInput) => {
      if (typeof input.Key === 'string' && input.Body) {
        uploadedFiles[input.Key] = await streamToString(input.Body as ReadStream);
      }
    });

    const version = {
      id: 'id1',
      versionIdentifier: 'ver1',
      doi: '1',
      preprint: {
        doi: '2',
        id: 'id2',
      },
    };
    const result = await extractMeca(version);

    expect(result).toMatchObject(extractedMecaResult);

    expect(Object.keys(uploadedFiles).sort()).toEqual([
      'automation/id1/vver1/2212.00741/2212.00741.xml',
      'automation/id1/vver1/2212.00741/2212.00741v1_fig1.jpg',
      'automation/id1/vver1/2212.00741/2212.00741v1_fig2.jpg',
      'automation/id1/vver1/2212.00741/2212.00741v1_fig3.jpg',
      'automation/id1/vver1/2212.00741/2212.00741v1_fig4.jpg',
      'automation/id1/vver1/2212.00741/2212.00741v1_fig5.jpg',
      'automation/id1/vver1/2212.00741/2212.00741v1_fig6.jpg',
      'automation/id1/vver1/2212.00741/2212.00741v1_ieqn1.jpg',
      'automation/id1/vver1/2212.00741/2212.00741v1_tbl1a.jpg',
      'automation/id1/vver1/2212.00741/2212.00741v1_tbl1b.jpg',
      'automation/id1/vver1/2212.00741/2212.00741v1_tbl1c.jpg',
      'automation/id1/vver1/2212.00741/2212.00741v1_tbl1d.jpg',
      'automation/id1/vver1/2212.00741/2212.00741v1_tbl2a.jpg',
      'automation/id1/vver1/2212.00741/2212.00741v1_tbl2b.jpg',
      'automation/id1/vver1/2212.00741/2212.00741v1_tbl2c.jpg',
      'automation/id1/vver1/2212.00741/2212.00741v1_tbl2d.jpg',
      'automation/id1/vver1/2212.00741/2212.00741v1_tbl2e.jpg',
    ]);
    expect(uploadedFiles['automation/id1/vver1/2212.00741/2212.00741.xml']).toContain('<article ');
  });
});
