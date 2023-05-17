import { parseDocMap } from './parse-docmap';

const simpleDocmap = `{
  "@id": "test",
  "steps": []
}`;

const fullDocmap = `{
  "@context": "https://w3id.org/docmaps/context.jsonld",
  "type": "docmap",
  "id": "http://mock-datahub/enhanced-preprints/docmaps/v1/by-publisher/elife/get-by-doi/10.1101%2F000001",
  "created": "2022-11-11T05:02:51+00:00",
  "updated": "2022-11-11T05:02:51+00:00",
  "publisher": {
    "account": {
      "id": "https://sciety.org/groups/elife",
      "service": "https://sciety.org"
    },
    "homepage": "https://elifesciences.org/",
    "id": "https://elifesciences.org/",
    "logo": "https://sciety.org/static/groups/elife--b560187e-f2fb-4ff9-a861-a204f3fc0fb0.png",
    "name": "eLife"
  },
  "first-step": "_:b0",
  "steps": {
    "_:b0": {
      "actions": [
        {
          "participants": [],
          "outputs": [
            {
              "type": "preprint",
              "doi": "10.1101/000001",
              "url": "https://www.biorxiv.org/content/10.1101/000001v1",
              "published": "2022-11-14",
              "versionIdentifier": "1",
              "_tdmPath": "s3://biorxiv/dummy-1.meca"
            }
          ]
        }
      ],
      "assertions": [
        {
          "item": {
            "type": "preprint",
            "doi": "10.1101/000001",
            "versionIdentifier": "1"
          },
          "status": "manuscript-published"
        }
      ],
      "inputs": []
    }
  }
}`;

describe('parse-docmap-activity', () => {
  it('fails to parse a docmap that does not contain a tdmPath', async () => {
    expect(async () => {
      await parseDocMap(simpleDocmap);
    }).rejects.toThrowError('Could not parse docmap');
  });

  it('parses a full docmap', async () => {
    const manuscriptData = await parseDocMap(fullDocmap);

    expect(manuscriptData.versions[0].preprint.content).toStrictEqual('s3://biorxiv/dummy-1.meca');
  });
});
