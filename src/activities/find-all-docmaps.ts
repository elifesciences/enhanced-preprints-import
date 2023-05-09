import axios from 'axios';
import { DocMap } from '@elifesciences/docmap-ts';

type DocMapIndex = {
  docmaps: DocMap[],
};

// TO-DO: Replace this with find changed docmaps
export const findAllDocmaps = async (docMapIndex: string): Promise<DocMap[] | undefined> => {
  const { data, status } = await axios.get<DocMapIndex>(docMapIndex);

  // Get hashes from epp server

  // Hash index and check against the epp hashes

  if (status === 200) {
    return data.docmaps;
  }

  return undefined;
};
