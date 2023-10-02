import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { XMLParser } from 'fast-xml-parser';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import path, { dirname } from 'path';
import { GetObjectCommand, GetObjectCommandInput, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import { Context } from '@temporalio/activity';
import { Readable } from 'stream';
import decompress from 'decompress';
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

export const extractMeca = async (version: VersionedReviewedPreprint): Promise<MecaFiles> => {
  const tmpDirectory = await mkdtemp(`${tmpdir()}/epp_content`);

  const s3 = getEPPS3Client();
  const source = constructEPPS3FilePath('content.meca', version);

  Context.current().heartbeat('Getting object');
  const getObjectCommandInput: GetObjectCommandInput = {
    Bucket: source.Bucket,
    Key: source.Key,
  };
  const data = await s3.send(new GetObjectCommand(getObjectCommandInput));

  const mecaPath = path.join(tmpDirectory, 'content.meca');
  if (data.Body instanceof Readable) {
    const stream = data.Body;
    const writeStream = fs.createWriteStream(mecaPath);
    stream.pipe(writeStream);

    writeStream.on('finish', async () => {
      Context.current().heartbeat('Meca successfully downloaded');

      await decompress(mecaPath, tmpDirectory).then(() => {
        Context.current().heartbeat('Meca successfully extracted');

        fs.unlinkSync(mecaPath);
      });

      Context.current().heartbeat('Loading manifest');

      try {
        const manifestXml = fs.readFileSync(path.join(tmpDirectory, 'manifest.xml'));

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

        // get the article content
        const unprocessedArticle = items.filter((item) => item.type === 'article' && item.mimeType === 'application/xml')[0];
        const id = unprocessedArticle.id ?? '';
        const title = unprocessedArticle.title ?? '';
        const article: LocalMecaFile = {
          ...unprocessedArticle,
          localPath: `${tmpDirectory}/${unprocessedArticle.path}`,
        };

        // get other content that represent the article
        const otherArticleInstances: LocalMecaFile[] = await Promise.all(items.filter((item) => item.type === 'article' && item.mimeType !== 'application/xml').map((item) => ({
          ...item,
          localPath: `${tmpDirectory}/${item.path}`,
        })));
        const supportingFiles: LocalMecaFile[] = await Promise.all(items.filter((item) => ['figure', 'fig', 'equation', 'inlineequation', 'inlinefigure', 'table', 'supplement', 'video'].includes(item.type)).map((item) => ({
          ...item,
          localPath: `${tmpDirectory}/${item.path}`,
        })));
        supportingFiles.push(...otherArticleInstances);

        // check there are no more item types left to be imported
        const knownTypes = [
          'article',
          'figure',
          'fig',
          'equation',
          'inlineequation',
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
          const s3UploadConnection = getEPPS3Client();
          const s3Path = constructEPPS3FilePath(remoteFileName, version);
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

        return {
          id,
          title,
          article,
          supportingFiles,
        };
      } catch (error) {
        throw new NonRetryableError('Cannot find manifest.xml in meca file');
      }
    });
    writeStream.on('error', () => {
      throw new Error('Could not retrieve object from S3');
    });
  } else {
    throw new Error('Empty response from GetObjectCommand');
  }

  throw new Error('should not get this far');
};
