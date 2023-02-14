import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { convert } from '@stencila/encoda';
import { mkdtemp } from 'fs/promises';
import { UploadedObjectInfo } from 'minio';
import { tmpdir } from 'os';
import { dirname } from 'path';
import { constructEPPS3FilePath, getS3Client, S3File } from '../S3Bucket';

type ConvertXmlToJsonOutput = {
  result: UploadedObjectInfo,
  path: S3File
};

export const convertXmlToJson = async (version: VersionedReviewedPreprint): Promise<ConvertXmlToJsonOutput> => {
  const tmpDirectory = await mkdtemp(`${tmpdir()}/epp_json`);
  const localXmlFilePath = `${tmpDirectory}/article.xml`;

  const s3 = getS3Client();
  const source = constructEPPS3FilePath('article.xml', version);
  await s3.fGetObject(source.Bucket, source.Key, localXmlFilePath);

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
  const result = await s3.putObject(destination.Bucket, destination.Key, corrected);

  return {
    result,
    path: destination,
  };
};
