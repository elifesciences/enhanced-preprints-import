import { Readable } from 'stream';
import axios from 'axios';
import { mocked } from 'jest-mock';
import { MD5 } from 'object-hash';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
import { filterDocmapIndex, mergeDocmapState } from './find-all-docmaps';

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
      const mockedHash = MD5({ id: 'fake-docmap' });
      const mockedIdHash = MD5('fake-docmap');

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
      expect(result?.[0].docMapHash).toStrictEqual(mockedHash);
      expect(result?.[0].docMapIdHash).toStrictEqual(mockedIdHash);
    });

    it('returns new docmaps (that are not hashed in the state file)', async () => {
      // Arrange
      const mockId = 'fake-docmap';
      const mockedHash = MD5({ id: mockId });
      const mockedIdHash = MD5(mockId);
      const mockedGet = mocked(axios.get);
      // @ts-ignore
      mockedGet.mockImplementation(() => Promise.resolve({
        data: { docmaps: [{ id: mockId }] },
        status: 200,
      }));
      mockS3Client.on(GetObjectCommand).rejects('Not found');

      // Act
      const result = await filterDocmapIndex('http://somewhere.not.real/docmap/index', 'state-file.json');

      // Assert
      expect(result).toStrictEqual([{
        docMapId: mockId,
        docMapHash: mockedHash,
        docMapIdHash: mockedIdHash,
      }]);
    });

    it('skips existing docmaps (that are hashed in the state file)', async () => {
      // Arrange
      const mockId = 'fake-docmap';

      const mockedGet = mocked(axios.get);
      // @ts-ignore
      mockedGet.mockImplementation(() => Promise.resolve({
        data: { docmaps: [{ id: mockId }] },
        status: 200,
      }));

      const mockedHash = MD5({ id: mockId });
      const mockedIdHash = MD5(mockId);
      const stream = new Readable();
      stream.push(JSON.stringify([
        {
          docMapId: mockId,
          docMapHash: mockedHash,
          docMapIdHash: mockedIdHash,
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
      mockS3Client.on(GetObjectCommand).rejects('Not found');

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
      const mockId = 'fake-docmap';
      const mockedHash = MD5({ id: mockId });
      const mockedIdHash = MD5(mockId);
      mockS3Client.on(GetObjectCommand).rejects('Not found');

      // Act
      const result = await mergeDocmapState([{
        docMapId: mockId,
        docMapHash: mockedHash,
        docMapIdHash: mockedIdHash,
      }], 'state-file.json');

      // Assert
      expect(result).toStrictEqual(true);

      expect(mockS3Client.commandCalls(PutObjectCommand)[0].args[0].input).toStrictEqual({
        Bucket: 'test-bucket',
        Key: 'automation/state/state-file.json',
        Body: JSON.stringify([{
          docMapId: mockId,
          docMapHash: mockedHash,
          docMapIdHash: mockedIdHash,
        }]),
      });
    });

    it('merges docmaps into exsiting state file', async () => {
      // Arrange
      const mockDocmap1Id = 'fake-docmap1';
      const mockDocmap1Hash = MD5({ id: mockDocmap1Id });
      const mockDocmap1IdHash = MD5(mockDocmap1Id);
      const stream = new Readable();
      stream.push(JSON.stringify([{
        docMapId: mockDocmap1Id,
        docMapHash: mockDocmap1Hash,
        docMapIdHash: mockDocmap1IdHash,
      }]));
      stream.push(null);
      const sdkStream = sdkStreamMixin(stream);
      mockS3Client.on(GetObjectCommand).resolves({
        Body: sdkStream,
      });

      // Act
      const mockDocmap2Id = 'fake-docmap2';
      const mockDocmap2Hash = MD5({ id: mockDocmap2Id });
      const mockDocmap2IdHash = MD5(mockDocmap2Id);
      const result = await mergeDocmapState([{
        docMapId: mockDocmap2Id,
        docMapHash: mockDocmap2Hash,
        docMapIdHash: mockDocmap2IdHash,
      }], 'state-file.json');

      // Assert
      expect(result).toStrictEqual(true);

      expect(mockS3Client.commandCalls(PutObjectCommand)[0].args[0].input).toStrictEqual({
        Bucket: 'test-bucket',
        Key: 'automation/state/state-file.json',
        Body: JSON.stringify([
          {
            docMapId: mockDocmap1Id,
            docMapHash: mockDocmap1Hash,
            docMapIdHash: mockDocmap1IdHash,
          },
          {
            docMapId: mockDocmap2Id,
            docMapHash: mockDocmap2Hash,
            docMapIdHash: mockDocmap2IdHash,
          },
        ]),
      });
    });
  });
});
