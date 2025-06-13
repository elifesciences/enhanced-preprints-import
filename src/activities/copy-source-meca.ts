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
import { createHash } from 'crypto';
import {
  S3File,
  constructEPPVersionS3FilePath,
  getEPPS3Client,
  getMecaS3Client,
  parseS3Path,
  sharedS3,
  constructEPPMecaS3FilePath,
} from '../S3Bucket';
import { NonRetryableError } from '../errors';
import { VersionOfRecord } from '../types';

type CopySourcePreprintToEPPOutput = {
  source: string,
  path: S3File,
  type: 'COPY' | 'NOCOPY',
};

type CopySourceMecaArgs = {
  version: VersionedReviewedPreprint | VersionOfRecord,
  preferPreprintContent?: boolean,
};

const s3CopySourceToDestination = async (source: S3File, destination: S3File): Promise<Omit<CopySourcePreprintToEPPOutput, 'source'>> => {
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
    const sourceBucketAndPath = encodeURI(`${source.Bucket}/${source.Key}`);
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

const s3MoveSourceToDestination = async (source: S3File, destination: S3File, version: VersionedReviewedPreprint | VersionOfRecord) => {
  const s3Connection = getEPPS3Client();

  const sourceHash = createHash('sha256')
    .update(`${source.Bucket}/${source.Key}`)
    .digest('hex');

  const eppSource = constructEPPMecaS3FilePath(`${sourceHash}-${version.id}-v${version.versionIdentifier}.meca`);

  try {
    await s3Connection.send(new HeadObjectCommand(eppSource));
  } catch (e) {
    console.log(e);
    if (!(e instanceof NotFound)) {
      throw e;
    }
    const mecaS3Connection = getMecaS3Client();
    Context.current().heartbeat('getting object');
    const downloadCommand = new GetObjectCommand({
      Bucket: source.Bucket,
      Key: source.Key,
      RequestPayer: 'requester',
    });
    const downloadData = await mecaS3Connection.send(downloadCommand);

    Context.current().heartbeat('putting object');
    const uploadCommand = new PutObjectCommand({
      ...eppSource,
      Body: downloadData.Body,
      ContentLength: downloadData.ContentLength,
    });
    await s3Connection.send(uploadCommand);
  }

  return s3CopySourceToDestination(eppSource, destination);
};

export const copySourcePreprintToEPP = async ({ version, preferPreprintContent }: CopySourceMecaArgs): Promise<CopySourcePreprintToEPPOutput> => {
  const preprintContent = 'preprint' in version ? (version.preprint.content ?? []) : [];
  const content = preferPreprintContent ? [...(preprintContent), ...(version.content ?? [])] : [...(version.content ?? []), ...(preprintContent)];
  const sourceS3Url = content.find((url) => url.startsWith('s3://'));
  if (sourceS3Url === undefined) {
    throw new NonRetryableError(`Cannot import content - no s3 URL found in content strings [${content.join(',')}]`);
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
    return s3CopySourceToDestination(source, destination)
      .then((result) => ({
        source: sourceS3Url,
        ...result,
      }));
  }
  console.info(`copySourcePreprintToEPP - Copying ${sourceS3Url} source using GET and PUT commands`);
  return s3MoveSourceToDestination(source, destination, version)
    .then((result) => ({
      source: sourceS3Url,
      ...result,
    }));
};
