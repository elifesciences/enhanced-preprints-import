import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { URL } from 'url';
import { createWriteStream, mkdtemp } from 'fs';
import { promisify } from 'util';
import { Readable } from 'stream';
import { tmpdir } from 'os';

const makeTmpDirectory = promisify(mkdtemp);

type FilePath = string;
type Result = {
  dir: FilePath,
  file: FilePath,
};

const parseS3Path = (s3Path: string) => {
  const url = new URL(s3Path);
  return {
    Bucket: url.host,
    Key: url.pathname.replace(/^\//, ''),
  };
};

export const fetchMeca = async (doi: string, s3Path: string): Promise<Result> => {
  const [publisherId, articleId] = doi.split('/');
  const client = new S3Client({ region: 'us-east-1' });

  const { Bucket, Key } = parseS3Path(s3Path);
  const getCommand = new GetObjectCommand({
    Bucket,
    Key,
    RequestPayer: 'requester', // required for biorxiv bucket
  });

  const data = await client.send(getCommand);

  if (data.Body === undefined) {
    throw Error('file is empty');
  }

  const tmpDirectory = await makeTmpDirectory(`${tmpdir()}/meca_${publisherId}_${articleId}`);
  const mecaFileName = `${tmpDirectory}/meca.zip`;

  const stream = data.Body as Readable;
  const resolver = new Promise<void>((resolve) => {
    const fileStream = createWriteStream(mecaFileName);
    stream.pipe(fileStream);
    fileStream.on('close', resolve);
  });
  await resolver;

  return {
    dir: tmpDirectory,
    file: mecaFileName,
  };
};
