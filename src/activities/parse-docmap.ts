import { parser } from '@elifesciences/docmap-ts';

export const parseDocMap = async (docMapInput: string): Promise<parser.ManuscriptData> => {
  const manuscriptData = parser.parsePreprintDocMap(docMapInput);

  if (!manuscriptData) {
    throw Error('Could not parse docmap');
  }

  return manuscriptData;
};
