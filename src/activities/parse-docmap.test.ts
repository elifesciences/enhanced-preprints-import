import { parser } from '@elifesciences/docmap-ts';
import { parseDocMap } from './parse-docmap';

// Mock the entire module '@elifesciences/docmap-ts'.
jest.mock('@elifesciences/docmap-ts', () => ({
  parser: {
    parsePreprintDocMap: jest.fn(),
  },
}));

describe('parseDocMap', () => {
  it('should call parsePreprintDocMap once', async () => {
    const docMapInput = 'testInput';
    const mockParsePreprintDocMap = parser.parsePreprintDocMap as jest.MockedFunction<typeof parser.parsePreprintDocMap>;

    // Mock the implementation of parsePreprintDocMap.
    mockParsePreprintDocMap.mockImplementation(() => ({
      id: 'id',
      versions: [],
    }));

    await parseDocMap(docMapInput);

    // Check if parsePreprintDocMap was called once.
    expect(mockParsePreprintDocMap).toHaveBeenCalledTimes(1);

    // Check if parsePreprintDocMap was called with the correct argument.
    expect(mockParsePreprintDocMap).toHaveBeenCalledWith(docMapInput);
  });
});
