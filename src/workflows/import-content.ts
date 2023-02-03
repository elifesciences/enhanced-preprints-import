import { proxyActivities } from '@temporalio/workflow';
import {
  VersionedReviewedPreprint,
} from '@elifesciences/docmap-ts';
import { MecaFiles } from '../activities/extract-meca';
import type * as activities from '../activities/index';
import { S3File } from '../S3Bucket';
import { EPPPeerReview } from '../activities/fetch-review-content';

const {
  identifyBiorxivPreprintLocation,
  copyBiorxivPreprintToEPP,
  extractMeca,
  convertXmlToJson,
  fetchReviewContent,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

type ImportContentOutput = {
  preprintPath: string,
  mecaPath: S3File,
  mecaFiles: MecaFiles,
  jsonContentFile: S3File,
  reviewData?: EPPPeerReview
};

export async function importContent(version: VersionedReviewedPreprint): Promise<ImportContentOutput> {
  const biorxivDoi = version.preprint.doi.startsWith('10.1101/');
  if (!biorxivDoi) {
    throw Error('Cannot find a supported content file');
  }

  const preprintPath = await identifyBiorxivPreprintLocation(version.preprint.doi);

  const { path: mecaPath } = await copyBiorxivPreprintToEPP(preprintPath, version);

  // Extract Meca
  const mecaFiles = await extractMeca(version);

  const { path: jsonContentFile } = await convertXmlToJson(version);

  // fetch review content (if present)
  const reviewData = await fetchReviewContent(version);

  return {
    preprintPath,
    mecaPath,
    mecaFiles,
    jsonContentFile,
    reviewData,
  };
}
