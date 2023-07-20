import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { convert } from '@stencila/encoda';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import * as fs from 'fs';
import {
  GetObjectCommand,
  PutObjectCommand,
  PutObjectCommandOutput,
} from '@aws-sdk/client-s3';
import {
  constructEPPS3FilePath, getEPPS3Client, getPrefixlessKey, S3File,
} from '../S3Bucket';
import { MecaFiles } from './extract-meca';
import { transformXML } from './transform-xml';

type ConvertXmlToJsonOutput = {
  result: PutObjectCommandOutput,
  path: S3File
};

export const convertXmlToJson = async (version: VersionedReviewedPreprint, mecaFiles: MecaFiles): Promise<ConvertXmlToJsonOutput> => {
  const tmpDirectory = await mkdtemp(`${tmpdir()}/epp_json`);
  const localXmlFilePath = `${tmpDirectory}/${mecaFiles.article.path}`;
  // mkdir incase the article path is in a subdirectory
  fs.mkdirSync(path.dirname(localXmlFilePath), { recursive: true });

  const s3 = getEPPS3Client();
  const source = constructEPPS3FilePath(mecaFiles.article.path, version);
  const object = await s3.send(new GetObjectCommand(source));

  const xml = await object.Body?.transformToString();
  if (!xml) {
    throw new Error('Unable to retrieve XML from S3');
  }

  const transformedXML = await transformXML(xml);
  fs.writeFileSync(localXmlFilePath, transformedXML);

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

  // correct any paths in the json
  const corrected = mecaFiles.supportingFiles.reduce((json, mecaFile) => {
    // this is a construct of where the files would have been relative to the article in the meca archive
    const oldPath = path.join(tmpDirectory, mecaFile.path);

    // this is where the path would be relative to the S3 root directory + meca path
    const newPath = getPrefixlessKey(constructEPPS3FilePath(mecaFile.path, version));

    return json.replaceAll(oldPath, newPath);
  }, converted);

  // Upload destination in S3
  const destination = constructEPPS3FilePath('article.json', version);
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
