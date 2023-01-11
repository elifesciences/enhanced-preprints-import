import axios from 'axios';
import { mocked } from 'jest-mock';
import { fetchDocMap } from './fetch-docmap';

jest.mock('axios');

describe('fetch-docmap-activity', () => {
  it('does not find any docmaps in index', async () => {
    // Arrange
    const mockedGet = mocked(axios.get);

    // @ts-ignore
    mockedGet.mockImplementation(() => Promise.resolve({
      data: {},
      status: 200,
    }));

    const result = await fetchDocMap('http://somewhere.not.real/docmap/1234/213456');
    expect(result).toStrictEqual('{}');
  });
});
