import axios from 'axios';
import { DocMap } from '@elifesciences/docmap-ts';
import hash from 'object-hash';
import { config } from '../config';

type DocMapIndex = {
  docmaps: DocMap[],
};

type DocMapWithHash = {
  docmap: DocMap,
  hash: string,
};

type IndexedHashes = { id: string, hash?: string }[];

// TO-DO: Replace this with find changed docmaps
export const findAllDocmaps = async (docMapIndex: string): Promise<DocMapWithHash[] | undefined> => {
  const { data: docmapData, status: docmapStatus } = await axios.get<DocMapIndex>(docMapIndex);

  // Get hashes from epp server
  const hashesUri = `${config.eppServerUri}/preprints/hashes`;
  const { data: hashData, status: hashStatus } = await axios.get<IndexedHashes>(hashesUri);

  console.log('number of results', hashData.length);

  // Hash docmap index (declaring as a variable so we don't need to rehash over again)
  // And filter if the stored hash DOESN'T match a calculated hash
  const filteredDocmapHashes: IndexedHashes = docmapData.docmaps.map((docMap) => ({ id: docMap.id, hash: hash(docMap) }))
    .filter((docmapHash) => !hashData.some((eppHash) => docmapHash.id === eppHash.id && docmapHash.hash === eppHash.hash));

  console.log(filteredDocmapHashes);

  // Filter docmaps with NO matching hashes
  const filteredDocmaps: DocMapWithHash[] = docmapData.docmaps.filter((docmap) => filteredDocmapHashes.some((filtered) => docmap.id === filtered.id)).map<DocMapWithHash>((docmap) => ({ docmap, hash: hash(docmap) }));

  if (docmapStatus === 200 && hashStatus === 200) {
    return filteredDocmaps;
  }

  return undefined;
};
