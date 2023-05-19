import { CopyObjectCommand, CopyObjectCommandInput, CopyObjectCommandOutput } from '@aws-sdk/client-s3';
import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { S3File, constructEPPS3FilePath, getS3Client } from '../S3Bucket';

type CopySourcePreprintToEPPOutput = {
  result: CopyObjectCommandOutput,
  path: S3File,
};

export const copySourcePreprintToEPP = async (version: VersionedReviewedPreprint): Promise<CopySourcePreprintToEPPOutput> => {
  const S3Connection = getS3Client();

  // extract bucket and Path for S3 client
  const bucketAndPath = version.preprint.content?.replace('s3://', '');

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
