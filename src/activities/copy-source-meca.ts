import {
  CopyObjectCommand,
  CopyObjectCommandInput,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  NotFound,
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
  path: S3File,
  type: 'COPY' | 'GETANDPUT' | 'NOCOPY',
};

export const s3CopySourceToDestination = async (source: S3File, destination: S3File): Promise<CopySourcePreprintToEPPOutput> => {
  const s3Connection = getEPPS3Client();

  // get Etag if destination exists
  let destinationETag;
  try {
    const destinationExistsResult = await s3Connection.send(new HeadObjectCommand({
      Bucket: destination.Bucket,
      Key: destination.Key,
    }));
    destinationETag = destinationExistsResult.ETag;
    console.info('copySourcePreprintToEPP - Destination exists - will compare ETag. ', source);
  } catch (e) {
    if (!(e instanceof NotFound)) {
      throw e;
    }
  }

  // send Copy command with ETag to save copying
  try {
    Context.current().heartbeat('copying object');
    const sourceBucketAndPath = `${source.Bucket}/${source.Key}`;
    const copyCommand: CopyObjectCommandInput = {
      Bucket: destination.Bucket,
      Key: destination.Key,
      CopySource: sourceBucketAndPath,
      RequestPayer: 'requester',
      CopySourceIfNoneMatch: destinationETag,
    };
    await s3Connection.send(new CopyObjectCommand(copyCommand));
    console.info(`copySourcePreprintToEPP - ${destinationETag ? 'Etag did not match. ' : ''}Copied new file`, source);
    return {
      path: destination,
      type: 'COPY',
    };
  } catch (e: any) {
    if (!(e.Code && e.Code === 'PreconditionFailed')) {
      throw e;
    }
  }

  console.info('copySourcePreprintToEPP - ETag matches, no copy', source);
  return {
    path: destination,
    type: 'NOCOPY',
  };
};

export const s3GetSourceAndPutDestination = async (source: S3File, destination: S3File): Promise<CopySourcePreprintToEPPOutput> => {
  const s3Connection = getEPPS3Client();
  const mecaS3Connection = getMecaS3Client();

  let sourceETag;
  let destinationETag;

  // get Etags if destination exists
  try {
    // get Etag if destination exists
    console.log('copySourcePreprintToEPP - HEAD destination', destination);
    const destinationExistsResult = await mecaS3Connection.send(new HeadObjectCommand({
      Bucket: destination.Bucket,
      Key: destination.Key,
    }));
    destinationETag = destinationExistsResult.ETag;

    // get Etag if source exists
    console.log('copySourcePreprintToEPP - HEAD source', source);
    const sourceExistsResult = await mecaS3Connection.send(new HeadObjectCommand({
      Bucket: source.Bucket,
      Key: source.Key,
    }));
    sourceETag = sourceExistsResult.ETag;
  } catch (e) {
    console.log(e);
    if (!(e instanceof NotFound)) {
      throw e;
    }
  }

  console.log(`copySourcePreprintToEPP - destinationETag = ${destinationETag} and sourceETag = ${sourceETag}`);

  // If the ETags match, don't copy
  if (sourceETag && destinationETag && sourceETag === destinationETag) {
    return {
      path: destination,
      type: 'NOCOPY',
    };
  }

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
  await s3Connection.send(uploadCommand);

  return {
    path: destination,
    type: 'GETANDPUT',
  };
};

export const copySourcePreprintToEPP = async (version: VersionedReviewedPreprint): Promise<CopySourcePreprintToEPPOutput> => {
  const sourceS3Url = version.preprint.content?.find((url) => url.startsWith('s3://'));
  if (sourceS3Url === undefined) {
    throw Error(`Cannot import content - no s3 URL found in content strings [${version.preprint.content?.join(',')}]`);
  }

  // Create source.txt in S3 with s3Filename as its content
  const s3Filename = (sourceS3Url.split('/').pop() ?? '').split('.').shift() ?? '';
  const s3PathForSourceTxt = constructEPPVersionS3FilePath('source.txt', version);
  const s3Connection = getEPPS3Client();
  await s3Connection.send(new PutObjectCommand({
    Bucket: s3PathForSourceTxt.Bucket,
    Key: s3PathForSourceTxt.Key,
    Body: s3Filename,
  }));

  // extract bucket and path for source
  const source = parseS3Path(sourceS3Url);

  // generate destination path
  const destination = constructEPPVersionS3FilePath('content.meca', version);

  if (sharedS3()) {
    console.info(`copySourcePreprintToEPP - Copying ${sourceS3Url} source using S3 copy command`);
    return s3CopySourceToDestination(source, destination);
  }
  console.info(`copySourcePreprintToEPP - Copying ${sourceS3Url} source using GET and PUT commands`);
  return s3GetSourceAndPutDestination(source, destination);
};
