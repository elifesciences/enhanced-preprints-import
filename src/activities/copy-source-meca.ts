import {
  CopyObjectCommand,
  CopyObjectCommandInput,
  CopyObjectCommandOutput,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import {
  S3File,
  constructEPPS3FilePath,
  getEPPS3Client,
  getMecaS3Client, sharedS3,
} from '../S3Bucket';

type CopySourcePreprintToEPPOutput = {
  result: CopyObjectCommandOutput,
  path: S3File,
};

export const copySourcePreprintToEPP = async (version: VersionedReviewedPreprint): Promise<CopySourcePreprintToEPPOutput> => {
  const s3Connection = getEPPS3Client();

  // extract bucket and Path for S3 client
  const bucketAndPath = version.preprint.content?.replace('s3://', '');

  // copy MECA
  const s3FilePath = constructEPPS3FilePath('content.meca', version);

  if (!sharedS3()) {
    const mecaS3Connection = getMecaS3Client();

    // If mecaS3Connection is a difference S3 resource then we can not use CopyObjectCommand we must download the file from mecaS3Connection and then upload to s3Connection
    const downloadCommand = new GetObjectCommand({
      Bucket: bucketAndPath?.split('/')[0],
      Key: bucketAndPath?.split('/').slice(1).join('/'),
      RequestPayer: 'requester',
    });

    const downloadData = await mecaS3Connection.send(downloadCommand);
    const uploadCommand = new PutObjectCommand({
      Bucket: s3FilePath.Bucket,
      Key: s3FilePath.Key,
      Body: downloadData.Body,
      ContentLength: downloadData.ContentLength,
    });

    const fileInfo = await s3Connection.send(uploadCommand);

    return {
      result: fileInfo,
      path: s3FilePath,
    };
  }

  const copyCommand: CopyObjectCommandInput = {
    Bucket: s3FilePath.Bucket,
    Key: s3FilePath.Key,
    CopySource: bucketAndPath,
    RequestPayer: 'requester',
  };

  const fileInfo = await s3Connection.send(new CopyObjectCommand(copyCommand));

  return {
    result: fileInfo,
    path: s3FilePath,
  };
};
