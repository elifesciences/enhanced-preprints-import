declare namespace EPP {
  type DocMapImportOutput = {
    result: ManuscriptData,
    mecaLocation?: string,
  };

  type DocMapsImportOutput = {
    docMapIndexUrl: string,
    count: number,
    docmapIds: string[],
  };
}