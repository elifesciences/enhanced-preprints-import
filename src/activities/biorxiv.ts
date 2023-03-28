import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import axios from 'axios';
import { CopyConditions, BucketItemCopy } from 'minio';
import { constructEPPS3FilePath, getS3Client, S3File } from '../S3Bucket';

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

// TODO: make URL a config (and make it https)
const fetchBiorxivMecaMetadata = async (doi: string) => axios.get<BiorxivMecaMetadataResponse>(`http://api.biorxiv.org/meca_index/elife/all/${doi}`).then(async (response) => response.data);

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

type CopyBiorxivPreprintToEPPOutput = {
  result: BucketItemCopy,
  path: S3File,
};

// TODO: remove console.logs
export const copyBiorxivPreprintToEPP = async (sourcePath: string, version: VersionedReviewedPreprint): Promise<CopyBiorxivPreprintToEPPOutput> => {
  const S3Connection = getS3Client();

  console.log('SOURCE PATH', sourcePath);

  // override in dev environment
  const sourceUri = (true) ? 's3://biorxiv/meca/dummy1.zip' : sourcePath;
  // extract bucket and Path for Minio client
  const bucketAndPath = sourceUri.startsWith('s3://') ? sourceUri.substring(4) : sourceUri;

  console.log('BUCKET AND PATH', bucketAndPath);

  // copy MECA
  const s3FilePath = constructEPPS3FilePath('content.meca', version);
  console.log('S3 FILE PATH', s3FilePath);
  const conditions = new CopyConditions();
  console.log('CONDITIONS', conditions);
  // const fileInfo = await S3Connection.copyObject(s3FilePath.Bucket, s3FilePath.Key, bucketAndPath, conditions);
  const fileInfo = await S3Connection.copyObject(s3FilePath.Bucket, s3FilePath.Key, bucketAndPath, conditions);
  console.log('FILE INFO', fileInfo);

  return {
    result: fileInfo,
    path: s3FilePath,
  };
};
