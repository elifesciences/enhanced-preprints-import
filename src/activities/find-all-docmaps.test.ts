import axios from 'axios';
import { mocked } from 'jest-mock';
import { MD5 } from 'object-hash';
import { filterDocmapIndex } from './find-all-docmaps';

jest.mock('axios');

describe('parse-docmap-activity', () => {
  it('does not find any docmaps in index', async () => {
    // Arrange
    const mockedGet = mocked(axios.get);

    // @ts-ignore
    mockedGet.mockImplementation(() => Promise.resolve({
      data: { docmaps: [] },
      status: 200,
    }));

    const result = await filterDocmapIndex([], 'http://somewhere.not.real/docmap/index');
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
    const result = await filterDocmapIndex([], 'http://somewhere.not.real/docmap/index');

    // Assert
    expect(result).toBeDefined();
    expect(result?.length).toStrictEqual(1);
    expect(result?.[0].docMapId).toStrictEqual('fake-docmap');
    expect(result?.length).toStrictEqual(1);
    expect(result?.[0].docMapHash).toStrictEqual(mockedHash);
    expect(result?.[0].docMapIdHash).toStrictEqual(mockedIdHash);
  });

  it('skips existing docmaps (that are hashed from the last import)', async () => {
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
    const result = await filterDocmapIndex([{ hash: mockedHash, idHash: mockedIdHash }], 'http://somewhere.not.real/docmap/index');

    // Assert
    expect(result).toBeDefined();
    expect(result).toStrictEqual([]);
    expect(result?.length).toStrictEqual(0);
  });
});
