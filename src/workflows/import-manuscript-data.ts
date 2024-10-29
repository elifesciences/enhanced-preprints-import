import { ManuscriptData, VersionedPreprint, VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import {
  executeChild, proxyActivities, upsertSearchAttributes, workflowInfo,
} from '@temporalio/workflow';
import { ImportManuscriptResult } from '../types';
import { importContent } from './import-content';
import type * as activities from '../activities/index';

const {
  generateVersionJson,
  generateVersionSummaryJson,
  sendVersionToEpp,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    initialInterval: '1 minute',
    backoffCoefficient: 2,
    maximumInterval: '15 minutes',
    nonRetryableErrorTypes: ['NonRetryableError'],
  },
});

export async function importManuscriptData(manuscriptData: ManuscriptData): Promise<ImportManuscriptResult[]> {
  upsertSearchAttributes({
    ManuscriptId: [manuscriptData.id],
  });

  const results = await Promise.all([
    ...manuscriptData.versions.filter((version): version is VersionedReviewedPreprint => 'preprint' in version).filter((version) => version.preprint.content?.find((contentUrl) => contentUrl.startsWith('s3://'))).map(async (version) => {
      try {
        const importContentResult = await executeChild(importContent, {
          args: [version],
          workflowId: `${workflowInfo().workflowId}/${version.versionIdentifier}/content`,
          searchAttributes: {
            ManuscriptId: [version.id],
          },
        });
        if (typeof importContentResult === 'string') {
          return {
            id: version.id,
            versionIdentifier: version.versionIdentifier,
            result: importContentResult,
          };
        }
        const payloadFile = await generateVersionJson({
          importContentResult, msid: manuscriptData.id, version, manuscript: manuscriptData.manuscript,
        });
        await sendVersionToEpp(payloadFile);
        return {
          id: version.id,
          versionIdentifier: version.versionIdentifier,
          result: 'Sent to EPP',
        };
      } catch (error) {
        console.error('An error occurred:', error);
        return {
          id: version.id,
          versionIdentifier: version.versionIdentifier,
          result: `Error: ${JSON.stringify(error)}`,
        };
      }
    }),
    ...manuscriptData.versions.filter((version): version is VersionedPreprint => 'content' in version && 'url' in version).map(async (version) => {
      const payloadFile = await generateVersionSummaryJson({
        msid: manuscriptData.id, version,
      });
      await sendVersionToEpp(payloadFile);
      return {
        id: version.id,
        versionIdentifier: version.versionIdentifier,
        result: 'Sent to EPP',
      };
    }),
  ]);

  return results;
}
