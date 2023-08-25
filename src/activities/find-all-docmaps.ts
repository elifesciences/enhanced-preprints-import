import axios from 'axios';
import { DocMap } from '@elifesciences/docmap-ts';
import { MD5 } from 'object-hash';
import { Hash } from '../workflows/import-docmaps';

type DocMapIndex = {
  docmaps: DocMap[],
};

type DocMapWithIdHash = {
  docMapId: string,
  docMapHash: string,
  docMapIdHash: string,
};

export const filterDocmapIndex = async (hashes: Hash[], docMapIndex: string, start?: number, end?: number): Promise<DocMapWithIdHash[]> => {
  const docMapRes = await axios.get<DocMapIndex>(docMapIndex);

  const { data } = docMapRes;
  const newHashes: string[] = [];

  // Filter docmaps with NO matching hashes
  const filteredDocMapsWithHash: DocMapWithIdHash[] = data.docmaps
    .slice(start, end)
    .filter((docmap) => {
      const docMapHash = MD5(docmap);
      newHashes.push(docMapHash);
      return !hashes.some(({ hash }) => hash === docMapHash);
    }).map<DocMapWithIdHash>((docMap) => ({
    docMapId: docMap.id,
    docMapHash: MD5(docMap),
    docMapIdHash: MD5(docMap.id),
  }));

  return filteredDocMapsWithHash;
};
