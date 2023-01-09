import { convert } from '@stencila/encoda';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname } from 'path';
import { getS3ClientByName, parseS3Path } from '../S3Bucket';

export const convertXmlToJson = async (s3XmlPath: string, s3JsonDestination: string): Promise<string> => {
  const tmpDirectory = await mkdtemp(`${tmpdir()}/epp_json`);
  const localXmlFilePath = `${tmpDirectory}/article.xml`;

  const s3 = getS3ClientByName('epp');
  const { Bucket: SourceBucket, Key: SourceKey } = parseS3Path(s3XmlPath);
  await s3.fGetObject(SourceBucket, SourceKey, localXmlFilePath);

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
  const { Bucket, Key } = parseS3Path(s3JsonDestination);
  const s3Path = dirname(Key);

  // correct any paths in the json
  const corrected = converted.replaceAll(tmpDirectory, `${s3Path}/figures`);

  // Upload
  await s3.putObject(Bucket, Key, corrected);

  return s3XmlPath;
};
