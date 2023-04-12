import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { convert } from '@stencila/encoda';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname } from 'path';
import * as fs from 'fs';
import {
  GetObjectCommand,
  GetObjectCommandOutput,
  PutObjectCommand,
  PutObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { constructEPPS3FilePath, getS3Client, S3File } from '../S3Bucket';

type ConvertXmlToJsonOutput = {
  result: PutObjectCommandOutput,
  path: S3File
};

async function saveObjectToFile(object: GetObjectCommandOutput, filePath: string): Promise<void> {
  const fileStream = fs.createWriteStream(filePath);

  (object.Body as Readable).pipe(fileStream);

  return new Promise((resolve, reject) => {
    fileStream.on('finish', () => {
      resolve();
    });
    fileStream.on('error', (error) => {
      reject(error);
    });
  });
}

export const convertXmlToJson = async (version: VersionedReviewedPreprint): Promise<ConvertXmlToJsonOutput> => {
  const tmpDirectory = await mkdtemp(`${tmpdir()}/epp_json`);
  const localXmlFilePath = `${tmpDirectory}/article.xml`;

  const s3 = getS3Client();
  const source = constructEPPS3FilePath('article.xml', version);
  const object = await s3.send(new GetObjectCommand(source));
  await saveObjectToFile(object, localXmlFilePath);

  const converted = await convert(
    localXmlFilePath,
    undefined, // require undefined to return html, causes console output
    {
      from: 'jats',
      to: 'json',
      encodeOptions: {
        isBundle: false,
      },
    },
  );

  if (converted === undefined) {
    throw new Error(`Could not convert XML file ${localXmlFilePath}`);
  }

  // Upload destination in S3
  const destination = constructEPPS3FilePath('article.json', version);

  // correct any paths in the json
  const s3Path = dirname(destination.Key);
  const corrected = converted.replaceAll(tmpDirectory, `${s3Path}/figures`);

  // Upload
  const result = await s3.send(new PutObjectCommand({
    Bucket: destination.Bucket,
    Key: destination.Key,
    Body: corrected,
  }));

  return {
    result,
    path: destination,
  };
};
