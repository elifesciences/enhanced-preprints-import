import { DocMap, parsePreprintDocMap, ParseResult } from '../docmaps';

export const parseDocMap = async (docMapInput: string | DocMap): Promise<ParseResult> => parsePreprintDocMap(typeof docMapInput !== 'string' ? JSON.stringify(docMapInput) : docMapInput);
