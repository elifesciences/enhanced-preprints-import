import axios from 'axios';
import { DocMap } from '@elifesciences/docmap-ts';

type DocMapIndex = {
  docmaps: DocMap[],
};

export const findAllDocmaps = async (docMapIndex: string): Promise<DocMap[] | undefined> => {
  const { data, status } = await axios.get<DocMapIndex>(docMapIndex);

  if (status === 200) {
    return data.docmaps;
  }

  return undefined;
};
