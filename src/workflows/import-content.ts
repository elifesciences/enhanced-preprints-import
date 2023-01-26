import { proxyActivities } from '@temporalio/workflow';
import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { MecaFiles } from '../activities/extract-meca';
import type * as activities from '../activities/index';
import { config } from '../config';

const {
  identifyBiorxivPreprintLocation,
  copyBiorxivPreprintToEPP,
  extractMeca,
  convertXmlToJson,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

type ImportContentOutput = {
  preprintPath: string,
  mecaPath: string,
  mecaFiles: MecaFiles,
  jsonContentFile: string,
};

export async function importContent(version: VersionedReviewedPreprint): Promise<ImportContentOutput> {
  const biorxivDoi = version.preprint.doi.startsWith('10.1101/');
  if (!biorxivDoi) {
    throw Error('Cannot find a supported content file');
  }

  const preprintPath = await identifyBiorxivPreprintLocation(version.preprint.doi);

  const destinationPathForContent = `${config.eppContentUri}/${version.id}/v${version.versionIdentifier}`;
  await copyBiorxivPreprintToEPP(preprintPath, `${destinationPathForContent}/content.meca`);

  // Extract Meca
  const mecaFiles = await extractMeca(`${destinationPathForContent}/content.meca`, `${destinationPathForContent}/content/`);

  const jsonContentFile = await convertXmlToJson(`${destinationPathForContent}/content/article.xml`, `${destinationPathForContent}/content/article.json`);

  return {
    preprintPath,
    mecaPath: destinationPathForContent,
    mecaFiles,
    jsonContentFile,
  };
}
