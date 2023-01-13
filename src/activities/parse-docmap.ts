import { parsePreprintDocMap, ManuscriptData } from '@scottaubrey/docmap-ts';

export const parseDocMap = async (docMapInput: string): Promise<ManuscriptData> => {
  const manuscriptData = parsePreprintDocMap(docMapInput);

  if (!manuscriptData) {
    throw Error('Could not parse docmap');
  }

  return manuscriptData;
};
