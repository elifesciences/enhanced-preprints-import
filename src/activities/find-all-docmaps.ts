import axios from 'axios';
import { DocMap } from '@elifesciences/docmap-ts';
import { MD5 } from 'object-hash';
import { Hash } from '../workflows/import-docmaps';

type DocMapIndex = {
  docmaps: DocMap[],
};

type DocMapWithIdHash = {
  docMap: DocMap,
  docMapHash: string,
  idHash: string,
};

type FilterDocmapIndexOutput = {
  filteredDocMapsWithHash: DocMapWithIdHash[],
  removedDocMapsWithHash: DocMapWithIdHash[],
};

export const filterDocmapIndex = async (hashes: Hash[], docMapIndex: string, start?: number, end?: number): Promise<FilterDocmapIndexOutput> => {
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
    docMap,
    docMapHash: MD5(docMap),
    idHash: MD5(docMap.id),
  }));

  // Filter docmaps that need to be removed
  const removedDocMapsWithHash: DocMapWithIdHash[] = data.docmaps
    .slice(start, end)
    .filter((docmap) => {
      const docMapIdHash = MD5(docmap.id);
      return !hashes.some(({ idHash }) => idHash === docMapIdHash);
    }).map<DocMapWithIdHash>((docMap) => ({
    docMap,
    docMapHash: MD5(docMap),
    idHash: MD5(docMap.id),
  }));

  return { filteredDocMapsWithHash, removedDocMapsWithHash };
};
