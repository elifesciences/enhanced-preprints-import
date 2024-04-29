import { mockClient } from 'aws-sdk-client-mock';
import {
  GetObjectCommand, S3Client,
} from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
import { createReadStream } from 'fs';
import { extractMeca } from './extract-meca';
import extractedMecaResult from '../test-utils/extracted-meca-file.json';

jest.mock('../config', () => ({
  config: {
    eppS3: { webIdentityTokenFile: '' },

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

describe('extract-meca-activity', () => {
  it.skip('returns extracted meca file', async () => {
    const stream = createReadStream('./mock-data/meca/dummy-1.meca');
    const sdkStream = sdkStreamMixin(stream);
    mockS3Client.on(GetObjectCommand).resolves({
      Body: sdkStream,
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

    expect(result).toStrictEqual(extractedMecaResult);
  });
});
