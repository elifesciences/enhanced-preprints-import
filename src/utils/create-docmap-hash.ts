import { createHash } from 'crypto';
import { DocMapHashes } from '../types';

type DocMapLikeWithId = {
  id: string,
};

export const createDocMapHash = (docMap: DocMapLikeWithId): DocMapHashes => {
  const docMapHash = createHash('md5').update(JSON.stringify(docMap)).digest('hex');
  const docMapIdHash = createHash('md5').update(docMap.id).digest('hex');
  return {
    docMapId: docMap.id,
    docMapHash,
    docMapIdHash,
  };
};
