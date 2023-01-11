import { parsePreprintDocMap, ParseResult } from '../docmaps';

export const parseDocMap = async (docMapInput: string): Promise<ParseResult> => parsePreprintDocMap(docMapInput);
