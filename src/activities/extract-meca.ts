import { XMLParser } from 'fast-xml-parser';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import JSZip from 'jszip';
import { dirname } from 'path';

export type MecaFile = {
  id: string,
  type: string,
  title?: string,
  mimeType: string,
  path: string,
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

const extractFileContents = async (zip: JSZip, item: MecaFile, toDir: string): Promise<MecaFile> => {
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
    path: outputPath,
  };
};

export const extractMeca = async (mecaFile: string, toDir: string): Promise<MecaFiles> => {
  const zip = await JSZip.loadAsync(readFileSync(mecaFile));

  const manifestXml = await zip.file('manifest.xml')?.async('nodebuffer');
  if (manifestXml === undefined) {
    throw new Error('Cannot find manifest.xml in meca file');
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

  const manifest = parser.parse(manifestXml).manifest as Manifest;
  const items = manifest.item.flatMap<MecaFile>((item: ManifestItem) => item.instance.map((instance) => ({
    id: item['@_id'],
    type: item['@_type'],
    title: item.title,
    mimeType: instance['@_media-type'],
    path: instance['@_href'],
  })));

  // define a closure that curries the zip and toDir in this scope
  const extractFromThisArchive = async (item: MecaFile) => extractFileContents(zip, item, toDir);

  const unprocessedArticle = items.filter((item) => item.type === 'article' && item.mimeType === 'application/xml')[0];
  const otherArticleInstances = items.filter((item) => item.type === 'article' && item.mimeType !== 'application/xml');
  const id = unprocessedArticle.id ?? '';
  const title = unprocessedArticle.title ?? '';

  const article = await extractFromThisArchive(unprocessedArticle);

  const figures = await Promise.all(items.filter((item) => item.type === 'figure').map(extractFromThisArchive));
  const equations = await Promise.all(items.filter((item) => item.type === 'equation').map(extractFromThisArchive));
  const tables = await Promise.all(items.filter((item) => item.type === 'table').map(extractFromThisArchive));
  const supplements = await Promise.all(items.filter((item) => item.type === 'supplement').map(extractFromThisArchive));
  const others = await Promise.all([
    ...otherArticleInstances,
    ...equations,
    ...tables,
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
