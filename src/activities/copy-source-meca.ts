import {
  CopyObjectCommand,
  CopyObjectCommandInput,
  CopyObjectCommandOutput,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { Context } from '@temporalio/activity';
import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import {
  S3File,
  constructEPPVersionS3FilePath,
  getEPPS3Client,
  getMecaS3Client, parseS3Path, sharedS3,
} from '../S3Bucket';

type CopySourcePreprintToEPPOutput = {
  result: CopyObjectCommandOutput,
  path: S3File,
  type: 'COPY' | 'GETANDPUT',
  uuid: string,
};

export const copySourcePreprintToEPP = async (version: VersionedReviewedPreprint): Promise<CopySourcePreprintToEPPOutput> => {
  const s3Connection = getEPPS3Client();

  const s3Url = version.preprint.content?.find((url) => url.startsWith('s3://'));
  if (s3Url === undefined) {
    throw Error(`Cannot import content - no s3 URL found in content strings [${version.preprint.content?.join(',')}]`);
  }
  const s3Filename = (s3Url.split('/').pop() ?? '').split('.').shift() ?? '';

  // extract bucket and Path for S3 client
  const source = parseS3Path(s3Url);
  const sourceBucketAndPath = `${source.Bucket}/${source.Key}`;

  // copy MECA
  const destination = constructEPPVersionS3FilePath('content.meca', version);

  if (!sharedS3()) {
    const mecaS3Connection = getMecaS3Client();

    // If mecaS3Connection is a difference S3 resource then we can not use CopyObjectCommand we must download the file from mecaS3Connection and then upload to s3Connection
    Context.current().heartbeat('getting object');
    const downloadCommand = new GetObjectCommand({
      Bucket: source.Bucket,
      Key: source.Key,
      RequestPayer: 'requester',
    });
    const downloadData = await mecaS3Connection.send(downloadCommand);

    Context.current().heartbeat('putting object');
    const uploadCommand = new PutObjectCommand({
      Bucket: destination.Bucket,
      Key: destination.Key,
      Body: downloadData.Body,
      ContentLength: downloadData.ContentLength,
    });
    const fileInfo = await s3Connection.send(uploadCommand);

    return {
      result: fileInfo,
      path: destination,
      type: 'GETANDPUT',
      uuid: s3Filename,
    };
  }

  const copyCommand: CopyObjectCommandInput = {
    Bucket: destination.Bucket,
    Key: destination.Key,
    CopySource: sourceBucketAndPath,
    RequestPayer: 'requester',
  };

  const fileInfo = await s3Connection.send(new CopyObjectCommand(copyCommand));

  return {
    result: fileInfo,
    path: destination,
    type: 'COPY',
    uuid: s3Filename,
  };
};
