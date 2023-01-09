import { parseDocMap } from './parse-docmap';

const simpleDocmap = `{
  "@id": "test",
  "steps": []
}`;

describe('parse-docmap-activity', () => {
  it('parses docmap passed as param', async () => {
    const result = await parseDocMap(simpleDocmap);
    expect(result).toMatchObject({
      timeline: [],
      versions: [],
    });
  });
});
