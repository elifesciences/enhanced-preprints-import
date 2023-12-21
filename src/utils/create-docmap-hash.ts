import { MD5 } from 'object-hash';
import { DocMapHashes } from '../types';

type DocMapLikeWithId = {
  id: string,
};

export const createDocMapHash = (docMap: DocMapLikeWithId): DocMapHashes => ({
  docMapId: docMap.id,
  docMapHash: MD5(docMap),
  docMapIdHash: MD5(docMap.id),
});
