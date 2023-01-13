import { parseDocMap } from './parse-docmap';

const simpleDocmap = `{
  "@id": "test",
  "steps": []
}`;

describe('parse-docmap-activity', () => {
  it('parses docmap passed as param', async () => {
    expect(async () => {
      await parseDocMap(simpleDocmap);
    }).rejects.toThrowError('Could not parse docmap');
  });
});
