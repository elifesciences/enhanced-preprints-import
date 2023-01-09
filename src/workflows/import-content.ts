import { proxyActivities } from '@temporalio/workflow';
import { MecaFiles } from '../activities/extract-meca';
import type * as activities from '../activities/index';
import { config } from '../config';
import { Version } from '../docmaps';

const {
  identifyBiorxivPreprintLocation,
  copyBiorxivPreprintToEPP,
  extractMeca,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

type ImportContentOutput = {
  preprintPath: string,
  mecaPath: string,
  mecaFiles: MecaFiles,
};

export async function importContent(version: Version): Promise<ImportContentOutput> {
  const bioRxivContent = version.content.find((content) => content.url.startsWith('https://doi.org/10.1101/'));
  if (!bioRxivContent) {
    throw Error('Cannot find a supported content file');
  }
  const biorxivDoi = bioRxivContent.url.match(/https:\/\/doi.org\/(10.1101\/.+)/)?.[1];
  if (!biorxivDoi) {
    throw Error('Cannot find a supported content file');
  }

  const preprintPath = await identifyBiorxivPreprintLocation(biorxivDoi);

  const destinationPathForContent = `${config.eppContentUri}/${version.id}/v${version.versionIdentifier ? version.versionIdentifier : '0'}`;
  await copyBiorxivPreprintToEPP(preprintPath, `${destinationPathForContent}/content.meca`);

  // Extract Meca
  const mecaFiles = await extractMeca(`${destinationPathForContent}/content.meca`, `${destinationPathForContent}/content/`);

  // Upload images to S3
  // Upload additional files to S3

  // const json = await convertXmlToJson(mecaFiles.id, mecaFiles.article.path);
  // Store JSON content in EPP

  return {
    preprintPath,
    mecaPath: destinationPathForContent,
    mecaFiles,
  };
}
