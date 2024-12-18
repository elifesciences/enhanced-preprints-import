import { proxyActivities } from '@temporalio/workflow';
import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { S3File } from '../S3Bucket';
import { MecaFiles } from '../activities/extract-meca';
import { EPPPeerReview } from '../activities/fetch-review-content';
import type * as activities from '../activities/index';

const {
  fetchReviewContent,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    initialInterval: '1 minute',
    backoffCoefficient: 2,
    maximumInterval: '15 minutes',
    nonRetryableErrorTypes: ['NonRetryableError'],
  },
});

const {
  convertXmlToJson,
  copySourcePreprintToEPP,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    initialInterval: '1 minute',
    backoffCoefficient: 2,
    maximumInterval: '15 minutes',
    nonRetryableErrorTypes: ['NonRetryableError'],
  },
});

const {
  extractMeca,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '20 minutes',
  retry: {
    initialInterval: '1 minute',
    backoffCoefficient: 2,
    maximumInterval: '15 minutes',
    nonRetryableErrorTypes: ['NonRetryableError'],
  },
});

type ImportContentArgs = {
  version: VersionedReviewedPreprint,
  xsltTransformPassthrough?: boolean,
};

export type ImportContentOutput = {
  mecaPath: S3File,
  mecaFiles: MecaFiles,
  jsonContentFile: S3File,
  reviewData?: EPPPeerReview,
  xsltLogs: string[],
  encodaVersion: string,
};

export async function importContent({ version, xsltTransformPassthrough }: ImportContentArgs): Promise<ImportContentOutput | string> {
  if (!version.content && !version.preprint.content) {
    return 'No content to import';
  }

  const { path: mecaPath } = await copySourcePreprintToEPP(version);

  // Extract Meca
  const mecaFiles = await extractMeca(version);

  const { path: jsonContentFile, xsltLogs, encodaVersion } = await convertXmlToJson({ version, mecaFiles, xsltTransformPassthrough });

  // fetch review content (if present)
  const reviewData = await fetchReviewContent(version);

  return {
    mecaPath,
    mecaFiles,
    jsonContentFile,
    reviewData,
    xsltLogs,
    encodaVersion,
  };
}
