import { ManuscriptData } from '@elifesciences/docmap-ts';
import {
  executeChild, proxyActivities, upsertSearchAttributes, workflowInfo,
} from '@temporalio/workflow';
import { ImportManuscriptResult, VersionTypes, WorkflowArgs } from '../types';
import { importContent } from './import-content';
import type * as activities from '../activities/index';
import { isVersionedPreprint, isVersionedReviewedPreprint, isVersionOfRecord } from '../type-guards';

const {
  deleteManuscript,
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

type ImportManuscriptDataArgs = WorkflowArgs & {
  data: ManuscriptData,
};

export async function importManuscriptData({ data, workflowArgs }: ImportManuscriptDataArgs): Promise<ImportManuscriptResult[]> {
  upsertSearchAttributes({
    ManuscriptId: [data.id],
  });

  if (workflowArgs?.purgeBeforeImport) {
    await deleteManuscript(data.id);
  }

  // Helper function to handle version processing with consistent error handling
  const processVersionWithContent = async (
    version: VersionTypes,
    versionType: string,
  ) => {
    try {
      const importContentResult = await executeChild(importContent, {
        args: [{ version, workflowArgs }],
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
        importContentResult, msid: data.id, version, manuscript: data.manuscript,
      });
      await sendVersionToEpp({ payloadFile, workflowArgs });

      return {
        id: version.id,
        versionIdentifier: version.versionIdentifier,
        result: 'Sent to EPP',
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error processing ${versionType} version ${version.id}/${version.versionIdentifier}:`, error);
      return {
        id: version.id,
        versionIdentifier: version.versionIdentifier,
        result: `Error: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
      };
    }
  };

  const results = await Promise.all([
    ...data.versions
      .filter(isVersionedReviewedPreprint)
      .filter((version) => version.preprint.content?.find((url) => url.startsWith('s3://')))
      .map(async (version) => processVersionWithContent(version, 'VersionedReviewedPreprint')),
    ...data.versions.filter(isVersionedPreprint).map(async (version) => {
      try {
        const payloadFile = await generateVersionSummaryJson({
          msid: data.id, version,
        });
        await sendVersionToEpp({ payloadFile, workflowArgs });
        return {
          id: version.id,
          versionIdentifier: version.versionIdentifier,
          result: 'Sent to EPP',
        };
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Error processing VersionedPreprint version ${version.id}/${version.versionIdentifier}:`, error);
        return {
          id: version.id,
          versionIdentifier: version.versionIdentifier,
          result: `Error: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
        };
      }
    }),
    ...data.versions.filter(isVersionOfRecord).map(async (version) => processVersionWithContent(version, 'VersionOfRecord')),
  ]);

  return results;
}
