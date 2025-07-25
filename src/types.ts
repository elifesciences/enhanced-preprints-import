import { DocMap, VersionedReviewedPreprint } from '@elifesciences/docmap-ts';

// Arguments that could be passed through all workflows.
export type WorkflowArgs = {
  workflowArgs?: {
    xsltTransformPassthrough?: boolean,
    preferPreprintContent?: boolean,
    xsltBlacklist?: string,
    encodaDefaultVersion?: string,
    purgeBeforeImport?: boolean,
    siteName?: string,
  },
};

export type ImportDocmapsMessage = {
  status: 'SUCCESS' | 'SKIPPED' | 'NOT APPROVED'
  message: string;
  results: ImportDocmapMessage[],
};

export type ImportManuscriptResult = {
  id: string,
  versionIdentifier: string,
  result: string,
};

export type ImportDocmapMessage = {
  results: ImportManuscriptResult[]
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

// Temporary type until fully adopted in docmap-ts.
export type VersionOfRecord = Omit<VersionedReviewedPreprint, 'preprint'>;

export type VersionTypes = VersionedReviewedPreprint | VersionOfRecord;
