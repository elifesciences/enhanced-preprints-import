import { DocMap } from '@elifesciences/docmap-ts';

export type ImportDocmapsMessage = {
  status: 'SUCCESS' | 'SKIPPED' | 'NOT APPROVED'
  message: string;
  results: ImportDocmapMessage[],
};

export type ImportDocmapMessage = {
  results: {
    id: string,
    versionIdentifier: string,
    result: string,
  }[]
  hashes: DocMapHashes,
};

export type DocMapIndex = {
  docmaps: DocMap[],
};

export type DocMapHashes = {
  docMapId: string,
  docMapHash: string,
  docMapIdHash: string,
};

export type DocMapWithHashes = {
  docMap: DocMap,
  docMapHashes: DocMapHashes,
};
