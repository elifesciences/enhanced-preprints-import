import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { XMLParser } from 'fast-xml-parser';
import { mkdirSync, writeFileSync } from 'fs';
import { mkdtemp } from 'fs/promises';
import JSZip from 'jszip';
import { tmpdir } from 'os';
import path, { dirname } from 'path';
import { GetObjectCommand, GetObjectCommandInput, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import { Context } from '@temporalio/activity';
import { constructEPPS3FilePath, getEPPS3Client } from '../S3Bucket';
import { NonRetryableError } from '../errors';

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
  figures: MecaFile[],
  supplements: MecaFile[],
  others: MecaFile[],
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

const extractFileContents = async (zip: JSZip, item: MecaFile, toDir: string): Promise<LocalMecaFile> => {
  const buffer = await zip.file(item.path)?.async('nodebuffer');
  if (buffer === undefined) {
    throw Error(`MECA archive corrupted, expected ${item.path} from manifest, but it failed`);
  }
  const outputPath = `${toDir}/${item.path}`;
  const outputDir = dirname(outputPath);
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputPath, buffer.toString());
  return {
    ...item,
    localPath: outputPath,
  };
};

export const extractMeca = async (version: VersionedReviewedPreprint): Promise<MecaFiles> => {
  const tmpDirectory = await mkdtemp(`${tmpdir()}/epp_content`);

  const s3 = getEPPS3Client();
  const source = constructEPPS3FilePath('content.meca', version);

  Context.current().heartbeat('Getting object');
  const getObjectCommandInput: GetObjectCommandInput = {
    Bucket: source.Bucket,
    Key: source.Key,
  };
  const buffer = await s3.send(new GetObjectCommand(getObjectCommandInput))
    .then((obj) => obj.Body?.transformToByteArray());

  if (buffer === undefined) {
    throw new Error('Could not retrieve object from S3');
  }

  const zip = await JSZip.loadAsync(buffer);

  Context.current().heartbeat('Loading manifest');
  const manifestXml = await zip.file('manifest.xml')?.async('nodebuffer');
  if (manifestXml === undefined) {
    throw new NonRetryableError('Cannot find manifest.xml in meca file');
  }

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

  // define a closure that curries the zip and toDir in this scope
  const extractFromThisArchive = async (item: MecaFile) => extractFileContents(zip, item, tmpDirectory);

  // get the article content
  const unprocessedArticle = items.filter((item) => item.type === 'article' && item.mimeType === 'application/xml')[0];
  const id = unprocessedArticle.id ?? '';
  const title = unprocessedArticle.title ?? '';
  Context.current().heartbeat('Extracting Article');
  const article = await extractFromThisArchive(unprocessedArticle);

  // get other content that represent the article
  Context.current().heartbeat('Extracting Article (alt types)');
  const otherArticleInstances = items.filter((item) => item.type === 'article' && item.mimeType !== 'application/xml').map(extractFromThisArchive);

  Context.current().heartbeat('Extracting figures');
  const figures = await Promise.all(items.filter((item) => item.type === 'figure').map(extractFromThisArchive));
  Context.current().heartbeat('Extracting equations');
  const equations = await Promise.all(items.filter((item) => item.type === 'equation').map(extractFromThisArchive));
  Context.current().heartbeat('Extracting tables');
  const tables = await Promise.all(items.filter((item) => item.type === 'table').map(extractFromThisArchive));
  Context.current().heartbeat('Extracting supplements');
  const supplements = await Promise.all(items.filter((item) => item.type === 'supplement').map(extractFromThisArchive));

  Context.current().heartbeat('Extracting all other resources');
  const others = await Promise.all([
    ...otherArticleInstances,
    ...equations,
    ...tables,
  ]);

  // check there are no more item types left to be imported
  const knownTypes = [
    'article',
    'figure',
    'equation',
    'table',
    'supplement',

    // unhandled item types
    'transfer-details',
    'x-hw-directives',
  ];
  const foundUnknownItems = items.filter((item) => !knownTypes.includes(item.type));
  if (foundUnknownItems.length > 0) {
    const unknownTypes = foundUnknownItems.map((item) => item.type);
    throw Error(`Found unknown manifest items types ${unknownTypes.join(', ')}`);
  }

  // define a closure that simplifies uploading a file to the correct location
  const uploadItem = async (localFile: LocalMecaFile, remoteFileName: string) => {
    const s3Path = constructEPPS3FilePath(remoteFileName, version);
    const fileStream = fs.createReadStream(localFile.localPath);
    await s3.send(new PutObjectCommand({
      Bucket: s3Path.Bucket,
      Key: s3Path.Key,
      Body: fileStream,
    }));
  };

  const articleUploadPromise = uploadItem(article, article.path);
  const figureUploadPromises = figures.map((figure) => uploadItem(figure, figure.path));
  const tableUploadPromises = tables.map((table) => uploadItem(table, table.path));
  const equationUploadPromises = tables.map((equation) => uploadItem(equation, equation.path));
  const supplementUploadPromises = tables.map((supplement) => uploadItem(supplement, supplement.path));

  Context.current().heartbeat('Uploading all resources');
  await Promise.all([
    articleUploadPromise,
    ...figureUploadPromises,
    ...tableUploadPromises,
    ...equationUploadPromises,
    ...supplementUploadPromises,
  ]);

  return {
    id,
    title,
    article,
    figures,
    supplements,
    others,
  };
};
