import { parser } from '@elifesciences/docmap-ts';

export const parseDocMap = async (docMapInput: string): Promise<parser.ManuscriptData> => parser.parsePreprintDocMap(docMapInput);
