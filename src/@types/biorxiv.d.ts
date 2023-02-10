declare namespace EPP {
  type PreprintMecaLocation = string;
  type BiorxivMecaMetadataStatus = {
    count: number, // 1
    messages: string, // "ok"
  };
  type BiorxivMecaMetadata = {
    msid: string, // "446694",
    tdm_doi: string, // "10.1101\/2021.06.02.446694",
    ms_version: string, // "1",
    filedate: string, // "2021-06-02",
    tdm_path: string, // "s3:\/\/transfers-elife\/biorxiv_Current_Content\/June_2021\/02_Jun_21_Batch_909\/f6678221-6dea-1014-8491-eff8b71b2ffd.meca",
    transfer_type: string, // ""
  };
  type BiorxivMecaMetadataResponse = {
    status: BiorxivMecaMetadataStatus[],
    results: BiorxivMecaMetadata[],
  };
}