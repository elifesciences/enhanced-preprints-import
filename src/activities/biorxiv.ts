import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import axios from 'axios';
import { UploadedObjectInfo } from 'minio';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { config } from '../config';
import {
  constructEPPS3FilePath,
  getS3Client,
  getS3MecaClient,
  parseS3Path,
  S3File,
} from '../S3Bucket';

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

const fetchBiorxivMecaMetadata = async (doi: string) => axios.get<BiorxivMecaMetadataResponse>(`${config.biorxivURI}/meca_index/elife/all/${doi}`).then(async (response) => response.data);

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
  result: UploadedObjectInfo,
  path: S3File,
};

export const copyBiorxivPreprintToEPP = async (sourcePath: string, version: VersionedReviewedPreprint): Promise<CopyBiorxivPreprintToEPPOutput> => {
  const S3MecaConnection = getS3MecaClient();
  const S3Connection = getS3Client();

  // download MECA
  const tmpDirectory = await mkdtemp(`${tmpdir()}/epp_meca`);
  const localMecaFilePath = `${tmpDirectory}/meca.zip`;
  const { Bucket: SourceBucket, Key: SourceKey } = parseS3Path(sourcePath);
  await S3MecaConnection.fGetObject(SourceBucket, SourceKey, localMecaFilePath);

  // upload MECA
  const s3FilePath = constructEPPS3FilePath('content.meca', version);
  const fileInfo = await S3Connection.fPutObject(s3FilePath.Bucket, s3FilePath.Key, localMecaFilePath);

  return {
    result: fileInfo,
    path: s3FilePath,
  };
};
