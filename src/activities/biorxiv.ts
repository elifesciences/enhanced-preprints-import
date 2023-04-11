import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import axios from 'axios';
import { CopyObjectCommand, CopyObjectCommandInput, CopyObjectCommandOutput } from '@aws-sdk/client-s3';
import { config } from '../config';
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
  result: CopyObjectCommandOutput,
  path: S3File,
};

export const copyBiorxivPreprintToEPP = async (sourcePath: string, version: VersionedReviewedPreprint): Promise<CopyBiorxivPreprintToEPPOutput> => {
  const S3Connection = getS3Client();

  // extract bucket and Path for Minio client
  const bucketAndPath = sourcePath.replace('s3://', '');

  // copy MECA
  const s3FilePath = constructEPPS3FilePath('content.meca', version);

  const copyCommand: CopyObjectCommandInput = {
    Bucket: s3FilePath.Bucket,
    Key: s3FilePath.Key,
    CopySource: bucketAndPath,
  };

  const fileInfo = await S3Connection.send(new CopyObjectCommand(copyCommand));

  return {
    result: fileInfo,
    path: s3FilePath,
  };
};
