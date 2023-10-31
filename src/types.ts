export type ImportDocmapsMessage = {
  status: 'SUCCESS' | 'SKIPPED'
  message: string;
  results: ImportDocmapMessage[],
};

export type ImportDocmapMessage = {
  results: {
    id: string,
    versionIdentifier: string,
    result: string,
  }[]
};
