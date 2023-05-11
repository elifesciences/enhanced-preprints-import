import axios from 'axios';
import { mocked } from 'jest-mock';
import { findAllDocmaps } from './find-all-docmaps';

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

    const result = await findAllDocmaps([], 'http://somewhere.not.real/docmap/index');
    expect(result?.docMaps).toStrictEqual([]);
  });

  it('returns docmaps found in index', async () => {
    // Arrange
    const mockedGet = mocked(axios.get);

    // @ts-ignore
    mockedGet.mockImplementation(() => Promise.resolve({
      data: { docmaps: [{ '@id': 'fake-docmap' }] },
      status: 200,
    }));

    // Act
    const result = await findAllDocmaps([], 'http://somewhere.not.real/docmap/index');

    // Assert
    expect(result).toBeDefined();
    expect(result?.docMaps.length).toStrictEqual(1);
    expect(result?.docMaps?.[0]).toMatchObject({ '@id': 'fake-docmap' });
  });
});
