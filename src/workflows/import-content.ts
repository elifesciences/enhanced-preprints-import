import { proxyActivities } from '@temporalio/workflow';
import { MecaFiles } from '../activities/extract-meca';
import type * as activities from '../activities/index';
import { Version } from '../docmaps';

const {
  identifyPreprintLocation,
  fetchMeca,
  extractMeca,
  convertXmlToJson,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

type ImportContentOutput = MecaFiles & {
  preprintPath: string,
  localMecaPath: string,
  json: string,
};

export async function importContent(version: Version): Promise<ImportContentOutput> {
  const bioRxivContent = version.content.find((content) => content.url.startsWith('https://doi.org/10.1101/'));
  if (!bioRxivContent) {
    throw Error('Cannot find a supported content file');
  }
  const doi = bioRxivContent.url.match(/https:\/\/doi.org\/(10.1101\/.+)/)?.[1];
  if (!doi) {
    throw Error('Cannot find a supported content file');
  }

  const preprintPath = await identifyPreprintLocation(doi);
  const { file, dir } = await fetchMeca(doi, preprintPath);

  // upload MECA to S3

  const mecaFiles = await extractMeca(file, dir);

  // Upload images to S3
  // Upload additional files to S3

  const json = await convertXmlToJson(mecaFiles.id, mecaFiles.article.path);

  // Store JSON content in EPP

  return {
    preprintPath,
    localMecaPath: file,
    json,
    ...mecaFiles,
  };
}
