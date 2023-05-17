import { parser } from '@elifesciences/docmap-ts';

export const parseDocMap = async (docMapInput: string): Promise<parser.ManuscriptData> => {
  const manuscriptData = parser.parsePreprintDocMap(docMapInput);

  // TO-DO: This is a temporary hack, remove once DocMaps are fixed
  // eslint-disable-next-line @typescript-eslint/dot-notation
  const tdmPath: string = JSON.parse(docMapInput)['steps']['_:b0']['actions'][0]['outputs'][0]['_tdmPath'];
  if (manuscriptData?.versions?.[0]?.preprint) manuscriptData.versions[0].preprint.content = tdmPath;

  if (!manuscriptData) {
    throw Error('Could not parse docmap');
  }

  return manuscriptData;
};
