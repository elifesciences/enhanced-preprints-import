import axios from 'axios';
import { mkdtemp } from 'fs';
import { UploadedObjectInfo } from 'minio';
import { promisify } from 'util';
import { getS3ClientByName, parseS3Path } from '../S3Bucket';

const fetchBiorxivMecaMetadata = async (doi: string) => axios.get<EPP.BiorxivMecaMetadataResponse>(`https://api.biorxiv.org/meca_index/elife/all/${doi}`).then(async (response) => response.data);

export const identifyBiorxivPreprintLocation = async (doi: string): Promise<EPP.PreprintMecaLocation> => {
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
  const biorxivS3Connection = getS3ClientByName('biorxiv');
  const eppS3Connection = getS3ClientByName('epp');

  const tmpDirectory = await makeTmpDirectory('epp_meca');

  // download meca
  const { Bucket: SourceBucket, Key: SourceKey } = parseS3Path(sourcePath);
  await biorxivS3Connection.fGetObject(SourceBucket, SourceKey, `${tmpDirectory}/meca.zip`);

  // upload meca
  const { Bucket, Key } = parseS3Path(destinationPath);
  const fileInfo = await eppS3Connection.fPutObject(Bucket, Key, `${tmpDirectory}/meca.zip`);

  return {
    file: fileInfo,
  };
};
