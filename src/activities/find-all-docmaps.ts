import axios from 'axios';
import { DocMap } from '@elifesciences/docmap-ts';
import hash from 'object-hash';

type DocMapIndex = {
  docmaps: DocMap[],
};

type IndexedHashes = { id: string, hash: string }[];

// TO-DO: Replace this with find changed docmaps
export const findAllDocmaps = async (docMapIndex: string): Promise<DocMap[] | undefined> => {
  const { data, status } = await axios.get<DocMapIndex>(docMapIndex);

  // Get hashes from epp server

  // Hash index and check against the epp hashes
  const hashes: IndexedHashes = data.docmaps.map((docMap) => ({ id: docMap.id, hash: hash(docMap) }));

  // eslint-disable-next-line
  hashes.forEach((entry) => console.log('Hashes', entry));

  if (status === 200) {
    return data.docmaps;
  }

  return undefined;
};
