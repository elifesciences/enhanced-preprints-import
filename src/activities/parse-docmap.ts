import { parsePreprintDocMap, ManuscriptData } from '@elifesciences/docmap-ts';

export const parseDocMap = async (docMapInput: string): Promise<ManuscriptData> => {
  const manuscriptData = parsePreprintDocMap(docMapInput);

  if (!manuscriptData) {
    throw Error('Could not parse docmap');
  }

  return manuscriptData;
};
