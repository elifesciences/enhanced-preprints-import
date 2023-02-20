declare namespace EPP {
  type MecaFile = {
    id: string,
    type: string,
    title?: string,
    mimeType: string,
    fileName: string,
    path: string,
  };

  type LocalMecaFile = MecaFile & {
    localPath: string,
  };

  type MecaFiles = {
    id: string,
    title: string,
    article: MecaFile,
    figures: MecaFile[],
    supplements: MecaFile[],
    others: MecaFile[],
  };

  type Manifest = {
    item: ManifestItem[],
  };

  type ManifestItemInstance = {
    '@_media-type': string,
    '@_href': string,
  };

  type ManifestItem = {
    '@_type': string,
    '@_id': string,
    title?: string,
    instance: ManifestItemInstance[],
  };
}
