import axios from 'axios';
import { DocMap } from '@elifesciences/docmap-ts';
import { MD5 } from 'object-hash';

type DocMapIndex = {
  docmaps: DocMap[],
};

type FindAllDocMapsResult = {
  docMaps: DocMap[],
  hashes: string[],
};

// TO-DO: Replace this with find changed docmaps
export const findAllDocmaps = async (hashes: string[], docMapIndex: string): Promise<FindAllDocMapsResult | undefined> => {
  const docMapRes = await axios.get<DocMapIndex>(docMapIndex)
    .catch((error) => {
      console.error(error.toJSON());
    });

  if (typeof docMapRes !== 'object' || docMapRes.status !== 200) {
    console.error('Docmap response is not an object');
    return undefined;
  }

  const { data } = docMapRes;
  const newHashes: string[] = [];

  // Filter docmaps with NO matching hashes
  const filteredDocMaps: DocMap[] = data.docmaps
    .filter((docmap) => {
      const docMapHash = MD5(docmap);
      newHashes.push(docMapHash);
      return !hashes.some((hash) => hash === docMapHash);
    });

  console.log('filtered documents', filteredDocMaps);

  return { docMaps: filteredDocMaps, hashes };
};
