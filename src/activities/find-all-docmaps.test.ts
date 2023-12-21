import { Readable } from 'stream';
import axios from 'axios';
import { mocked } from 'jest-mock';
import {
  GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client,
} from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
import { filterDocmapIndex, mergeDocmapState } from './find-all-docmaps';
import { createDocMapHash } from '../utils/create-docmap-hash';

jest.mock('axios');
const mockS3Client = mockClient(S3Client);
jest.mock('../config', () => ({
  config: {
    eppS3: { webIdentityTokenFile: '' },
    eppBucketName: 'test-bucket', // This is the default bucket name to store files in S3
    eppBucketPrefix: 'automation/', // This is the default prefix to give to files in S3
  },
}));

describe('docmap-filter', () => {
  const mockHashes = createDocMapHash({ id: 'fake-docmap'});

  beforeEach(() => {
    mockS3Client.reset();
  });

  describe('filterDocmapIndex', () => {
    it('does not find any docmaps in index', async () => {
      // Arrange
      const mockedGet = mocked(axios.get);

      // @ts-ignore
      mockedGet.mockImplementation(() => Promise.resolve({
        data: { docmaps: [] },
        status: 200,
      }));

      const result = await filterDocmapIndex('http://somewhere.not.real/docmap/index');
      expect(result).toStrictEqual([]);
    });

    it('returns docmaps found in index', async () => {
      // Arrange
      const mockedGet = mocked(axios.get);

      // @ts-ignore
      mockedGet.mockImplementation(() => Promise.resolve({
        data: { docmaps: [{ id: 'fake-docmap' }] },
        status: 200,
      }));

      // Act
      const result = await filterDocmapIndex('http://somewhere.not.real/docmap/index');

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toStrictEqual(1);
      expect(result?.[0].docMapId).toStrictEqual('fake-docmap');
      expect(result?.length).toStrictEqual(1);
      expect(result?.[0].docMapHash).toStrictEqual(mockHashes.docMapHash);
      expect(result?.[0].docMapIdHash).toStrictEqual(mockHashes.docMapIdHash);
    });

    it('returns new docmaps (that are not hashed in the state file)', async () => {
      // Arrange
      const mockedGet = mocked(axios.get);
      // @ts-ignore
      mockedGet.mockImplementation(() => Promise.resolve({
        data: { docmaps: [{ id: mockHashes.docMapId }] },
        status: 200,
      }));
      mockS3Client.on(GetObjectCommand).rejects(new NoSuchKey({
        $metadata: {},
        message: 'No Such Key',
      }));

      // Act
      const result = await filterDocmapIndex('http://somewhere.not.real/docmap/index', 'state-file.json');

      // Assert
      expect(result).toStrictEqual([{
        docMapId: mockHashes.docMapId,
        docMapHash: mockHashes.docMapHash,
        docMapIdHash: mockHashes.docMapIdHash,
      }]);
    });

    it('returns new docmaps (that are not hashed in the state file)', async () => {
      // Arrange
      const mockedGet = mocked(axios.get);
      // @ts-ignore
      mockedGet.mockImplementation(() => Promise.resolve({
        data: { docmaps: [{ id: mockHashes.docMapId }] },
        status: 200,
      }));
      mockS3Client.on(GetObjectCommand).rejects(new NoSuchKey({
        $metadata: {},
        message: 'No Such Key',
      }));

      // Act
      const result = await filterDocmapIndex('http://somewhere.not.real/docmap/index', 'state-file.json');

      // Assert
      expect(result).toStrictEqual([{
        docMapId: mockHashes.docMapId,
        docMapHash: mockHashes.docMapHash,
        docMapIdHash: mockHashes.docMapIdHash,
      }]);
    });

    it('skips existing docmaps (that are hashed in the state file)', async () => {
      // Arrange
      const mockedGet = mocked(axios.get);
      // @ts-ignore
      mockedGet.mockImplementation(() => Promise.resolve({
        data: { docmaps: [{ id: mockHashes.docMapId }] },
        status: 200,
      }));

      const stream = new Readable();
      stream.push(JSON.stringify([
        {
          docMapId: mockHashes.docMapId,
          docMapHash: mockHashes.docMapHash,
          docMapIdHash: mockHashes.docMapIdHash,
        },
      ]));
      stream.push(null);
      const sdkStream = sdkStreamMixin(stream);
      mockS3Client.on(GetObjectCommand).resolves({
        Body: sdkStream,
      });

      // Act
      const result = await filterDocmapIndex('http://somewhere.not.real/docmap/index', 'state-file.json');

      // Assert
      expect(result).toBeDefined();
      expect(result).toStrictEqual([]);
      expect(result?.length).toStrictEqual(0);
    });
  });

  describe('mergeDocmapState', () => {
    it('creates a new state file', async () => {
      mockS3Client.on(GetObjectCommand).rejects(new NoSuchKey({
        $metadata: {},
        message: 'No Such Key',
      }));

      // Act
      const result = await mergeDocmapState([], 'state-file.json');

      // Assert
      expect(result).toStrictEqual(true);

      expect(mockS3Client.commandCalls(PutObjectCommand)[0].args[0].input).toStrictEqual({
        Bucket: 'test-bucket',
        Key: 'automation/state/state-file.json',
        Body: '[]',
      });
    });

    it('creates a new state file with a docmap hash', async () => {
      mockS3Client.on(GetObjectCommand).rejects(new NoSuchKey({
        $metadata: {},
        message: 'No Such Key',
      }));

      // Act
      const result = await mergeDocmapState([{
        docMapId: mockHashes.docMapId,
        docMapHash: mockHashes.docMapHash,
        docMapIdHash: mockHashes.docMapIdHash,
      }], 'state-file.json');

      // Assert
      expect(result).toStrictEqual(true);

      expect(mockS3Client.commandCalls(PutObjectCommand)[0].args[0].input).toStrictEqual({
        Bucket: 'test-bucket',
        Key: 'automation/state/state-file.json',
        Body: JSON.stringify([{
          docMapId: mockHashes.docMapId,
          docMapHash: mockHashes.docMapHash,
          docMapIdHash: mockHashes.docMapIdHash,
        }]),
      });
    });

    it('merges docmaps into exsiting state file', async () => {
      // Arrange
      const mockDocmap1Hashes = createDocMapHash({ id: 'fake-docmap1' });
      const stream = new Readable();
      stream.push(JSON.stringify([mockDocmap1Hashes]));
      stream.push(null);
      const sdkStream = sdkStreamMixin(stream);
      mockS3Client.on(GetObjectCommand).resolves({
        Body: sdkStream,
      });

      // Act
      const mockDocmap2Hashes = createDocMapHash({ id: 'fake-docmap1' });
      const result = await mergeDocmapState([mockDocmap2Hashes], 'state-file.json');

      // Assert
      expect(result).toStrictEqual(true);

      expect(mockS3Client.commandCalls(PutObjectCommand)[0].args[0].input).toStrictEqual({
        Bucket: 'test-bucket',
        Key: 'automation/state/state-file.json',
        Body: JSON.stringify([mockDocmap1Hashes, mockDocmap2Hashes]),
      });
    });
  });
});
