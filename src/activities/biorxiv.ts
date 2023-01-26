import axios from 'axios';
import { mkdtemp } from 'fs';
import { UploadedObjectInfo } from 'minio';
import { promisify } from 'util';
import { getS3Client, parseS3Path } from '../S3Bucket';

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

const fetchBiorxivMecaMetadata = async (doi: string) => axios.get<BiorxivMecaMetadataResponse>(`https://api.biorxiv.org/meca_index/elife/all/${doi}`).then(async (response) => response.data);

export const identifyBiorxivPreprintLocation = async (doi: string): Promise<PreprintMecaLocation> => {
  const [publisherId, articleId] = doi.split('/');

  if (publisherId !== '10.1101') {
    throw Error('Incorrect DOI: publisher not supported');
  }
  try {
    const metadata = await fetchBiorxivMecaMetadata(articleId);
    if (metadata.status[0].messages !== 'ok') {
      throw Error(metadata.status[0].messages);
    }

    if (metadata.status[0].count !== 1) {
      throw Error(`"count" was ${metadata.status[0].count}`);
    }

    return metadata.results[0].tdm_path;
  } catch (error) {
    throw Error(`Could not identify a meca file location for ${articleId}: ${error}`);
  }
};

const makeTmpDirectory = promisify(mkdtemp);

type CopyBiorxivPreprintToEPPOutput = {
  file: UploadedObjectInfo,
};

export const copyBiorxivPreprintToEPP = async (sourcePath: string, destinationPath: string): Promise<CopyBiorxivPreprintToEPPOutput> => {
  const S3Connection = getS3Client();

  const tmpDirectory = await makeTmpDirectory('epp_meca');

  // download meca
  const { Bucket: SourceBucket, Key: SourceKey } = parseS3Path(sourcePath);
  await S3Connection.fGetObject(SourceBucket, SourceKey, `${tmpDirectory}/meca.zip`);

  // upload meca
  const { Bucket, Key } = parseS3Path(destinationPath);
  const fileInfo = await S3Connection.fPutObject(Bucket, Key, `${tmpDirectory}/meca.zip`);

  return {
    file: fileInfo,
  };
};
