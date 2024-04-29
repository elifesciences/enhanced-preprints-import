import extractedMecaResult from '../test-utils/extracted-meca-file.json';
import { extractMeca } from './extract-meca';

jest.mock('../config', () => ({
  config: {},
}));

describe('extract-meca-activity', () => {
  it.skip('returns extracted meca file', async () => {
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
