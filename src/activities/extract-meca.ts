import { XMLParser } from 'fast-xml-parser';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { GetObjectCommand, GetObjectCommandInput, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import { Context } from '@temporalio/activity';
import { Readable } from 'stream';
import unzipper from 'unzipper';
import { constructEPPVersionS3FilePath, getEPPS3Client, streamToFile } from '../S3Bucket';
import { NonRetryableError } from '../errors';
import { VersionTypes } from '../types';

export type MecaFile = {
  id: string,
  type: string,
  title?: string,
  mimeType: string,
  fileName: string,
  path: string,
};

export type LocalMecaFile = MecaFile & {
  localPath: string,
};

export type MecaFiles = {
  id: string,
  title: string,
  article: MecaFile,
  supportingFiles: MecaFile[],
};

type Manifest = {
  item: ManifestItem[],
};

type ManifestItemInstance = {
  '@_media-type': string,
  '@_href': string,
};

type ManifestItem = {
  '@_type': string,
  '@_id': string,
  title?: string,
  instance: ManifestItemInstance[],
};

export const extractMeca = async (version: VersionTypes): Promise<MecaFiles> => {
  const tmpDirectory = await mkdtemp(`${tmpdir()}/epp_content`);

  const s3 = getEPPS3Client();
  const source = constructEPPVersionS3FilePath('content.meca', version);

  Context.current().heartbeat('Getting object');
  const getObjectCommandInput: GetObjectCommandInput = {
    Bucket: source.Bucket,
    Key: source.Key,
  };
  const data = await s3.send(new GetObjectCommand(getObjectCommandInput));

  const mecaPath = path.join(tmpDirectory, 'content.meca');

  if (!(data.Body instanceof Readable)) {
    throw new Error('Could not retrieve object from S3');
  }

  await streamToFile(data.Body, mecaPath);
  Context.current().heartbeat('Meca successfully downloaded');

  Context.current().heartbeat('Extracting Meca');
  await unzipper.Open.file(mecaPath)
    .then((dir) => dir.extract({
      path: tmpDirectory,
    }))
    .then(() => {
      Context.current().heartbeat('Meca successfully extracted');
    });

  Context.current().heartbeat('Loading manifest');

  const readManifestXml = (): Buffer => {
    try {
      return fs.readFileSync(path.join(tmpDirectory, 'manifest.xml'));
    } catch (error) {
      throw new NonRetryableError('Cannot find manifest.xml in meca file');
    }
  };
  const manifestXml = readManifestXml();
  // define where the arrays should be
  const alwaysArray = [
    'manifest.item',
    'manifest.item.instance',
  ];
  const parser = new XMLParser({
    ignoreAttributes: false,
    isArray: (name, jpath) => alwaysArray.indexOf(jpath) !== -1,
  });

  Context.current().heartbeat('Parsing XML');
  const manifest = parser.parse(manifestXml).manifest as Manifest;
  const items = manifest.item.flatMap<MecaFile>((item: ManifestItem) => item.instance.map((instance) => {
    const instancePath = instance['@_href'];
    const fileName = path.basename(instancePath);
    return ({
      id: item['@_id'],
      type: item['@_type'],
      title: item.title,
      mimeType: instance['@_media-type'],
      path: instancePath,
      fileName,
    });
  }));

  const prepareLocalMecaFile = (item: MecaFile, dir: string): LocalMecaFile => ({
    ...item,
    localPath: `${dir}/${item.path}`,
  });

  // get the article content
  const unprocessedArticle = items.filter((item) => item.type === 'article' && item.mimeType === 'application/xml')[0];
  const id = unprocessedArticle.id ?? '';
  const title = unprocessedArticle.title ?? '';
  const article = prepareLocalMecaFile(unprocessedArticle, tmpDirectory);

  // get other content that represent the article
  const otherArticleInstances: LocalMecaFile[] = await Promise.all(items.filter((item) => item.type === 'article' && item.mimeType !== 'application/xml').map((item) => prepareLocalMecaFile(item, tmpDirectory)));
  const supportingFiles: LocalMecaFile[] = await Promise.all(items.filter((item) => ['figure', 'fig', 'equation', 'display-equation', 'inlineequation', 'inline-equation', 'inlinefigure', 'table', 'supplement', 'video'].includes(item.type))
    .map((item) => prepareLocalMecaFile(item, tmpDirectory)));
  supportingFiles.push(...otherArticleInstances);

  // check there are no more item types left to be imported
  const knownTypes = [
    'article',
    'figure',
    'fig',
    'equation',
    'display-equation',
    'inlineequation',
    'inline-equation',
    'inlinefigure',
    'table',
    'supplement',
    'video',

    // unhandled item types
    'transfer-details',
    'x-hw-directives',
  ];
  const foundUnknownItems = items.filter((item) => !knownTypes.includes(item.type));
  if (foundUnknownItems.length > 0) {
    const unknownTypes = foundUnknownItems.map((item) => item.type);
    throw new Error(`Found unknown manifest items types ${unknownTypes.join(', ')}`);
  }

  // define a closure that simplifies uploading a file to the correct location
  const uploadItem = async (localFile: LocalMecaFile, remoteFileName: string) => {
    if (!fs.existsSync(localFile.localPath)) {
      throw new NonRetryableError(`The file ${localFile.fileName} was not extracted from the meca archive`);
    }

    const s3UploadConnection = getEPPS3Client();
    console.log(s3UploadConnection.config.requestHandler);
    const s3Path = constructEPPVersionS3FilePath(remoteFileName, version);
    Context.current().heartbeat(`Uploading ${localFile.type} ${localFile.fileName} (${localFile.id}) to ${s3Path.Key}`);
    const fileStream = fs.createReadStream(localFile.localPath);
    await s3UploadConnection.send(new PutObjectCommand({
      Bucket: s3Path.Bucket,
      Key: s3Path.Key,
      Body: fileStream,
    }));
    Context.current().heartbeat(`Finished uploading ${localFile.type} ${localFile.fileName} (${localFile.id}) to ${s3Path.Key}`);
  };

  const articleUploadPromise = uploadItem(article, article.path);
  const supportingFilesUploads = supportingFiles.map((figure) => uploadItem(figure, figure.path));

  Context.current().heartbeat(`Commencing upload of manuscript with ${supportingFilesUploads.length} supporting files`);
  await Promise.all([
    articleUploadPromise,
    ...supportingFilesUploads,
  ]);

  // Delete tmpDirectory
  fs.rmSync(tmpDirectory, { recursive: true, force: true });

  return {
    id,
    title,
    article,
    supportingFiles,
  };
};
