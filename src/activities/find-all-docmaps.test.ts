import { Readable } from 'stream';
import axios from 'axios';
import { mocked } from 'jest-mock';
import { MD5 } from 'object-hash';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
import { filterDocmapIndex } from './find-all-docmaps';

jest.mock('axios');
const mockS3Client = mockClient(S3Client);
jest.mock('../config', () => ({
  config: { eppS3: { webIdentityTokenFile: '' } },
}));

describe('parse-docmap-activity', () => {
  beforeEach(() => {
    mockS3Client.reset();
  });

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

  it('creates a new state file docmaps', async () => {
    // Arrange
    const mockedGet = mocked(axios.get);
    // @ts-ignore
    mockedGet.mockImplementation(() => Promise.resolve({
      data: { docmaps: [] },
      status: 200,
    }));
    mockS3Client.on(GetObjectCommand).rejects('Not found');

    // Act
    const result = await filterDocmapIndex('http://somewhere.not.real/docmap/index', 's3://test-bucket/state-file.json');

    // Assert
    expect(result).toBeDefined();
    expect(result).toStrictEqual([]);
    expect(result?.length).toStrictEqual(0);

    expect(mockS3Client.commandCalls(PutObjectCommand)[0].args[0].input).toStrictEqual({
      Bucket: 'test-bucket',
      Key: 'state-file.json',
      Body: '[]',
    });
  });

  it('stores new docmaps (that are hashed in the state file)', async () => {
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
    const result = await filterDocmapIndex('http://somewhere.not.real/docmap/index', 's3://test-bucket/state-file.json');

    // Assert
    expect(result).toStrictEqual([{
      docMapId: mockId,
      docMapHash: mockedHash,
      docMapIdHash: mockedIdHash,
    }]);

    expect(mockS3Client.commandCalls(PutObjectCommand)[0].args[0].input).toStrictEqual({
      Bucket: 'test-bucket',
      Key: 'state-file.json',
      Body: JSON.stringify([{
        docMapId: mockId,
        docMapHash: mockedHash,
        docMapIdHash: mockedIdHash,
      }]),
    });
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
    const result = await filterDocmapIndex('http://somewhere.not.real/docmap/index', 's3://test-bucket/state-file.json');

    // Assert
    expect(result).toBeDefined();
    expect(result).toStrictEqual([]);
    expect(result?.length).toStrictEqual(0);
  });
});
