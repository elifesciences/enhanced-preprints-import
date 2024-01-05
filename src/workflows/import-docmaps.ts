import {
  condition,
  defineSignal,
  proxyActivities,
  setHandler,
} from '@temporalio/workflow';
import type * as activities from '../activities/index';
import { ImportDocmapsMessage } from '../types';

const {
  filterDocmapIndex,
  mergeDocmapState,
  createImportDocmapWorkflow
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    initialInterval: '1 minute',
    backoffCoefficient: 2,
    maximumInterval: '15 minutes',
  },
});

export type Hash = { hash: string, idHash: string };

const approvalSignal = defineSignal<[boolean]>('approval');

export async function importDocmaps(docMapIndexUrl: string, s3StateFileUrl?: string, start?: number, end?: number): Promise<ImportDocmapsMessage> {
  let approval: boolean | null = null;
  setHandler(approvalSignal, (approvalValue: boolean) => {approval = approvalValue});
  const docMapIdHashes = await filterDocmapIndex(docMapIndexUrl, s3StateFileUrl, start, end);
  const sampleDocmapsThreshold = 10;

  if (docMapIdHashes.length === 0) {
    return {
      status: 'SKIPPED',
      message: 'No new docmaps to import',
      results: [],
    };
  }

  if (docMapIdHashes.length > sampleDocmapsThreshold) {
    await condition(() => typeof approval === 'boolean');
    if (!approval) {
      return {
        status: 'NOT APPROVED',
        message: 'Large import not approved',
        results: [],
      };
    }
  }

  const importWorkflows = await Promise.all(docMapIdHashes.map(async (docMapIdHash) => createImportDocmapWorkflow(docMapIdHash)));
  console.log(importWorkflows);
  
  await mergeDocmapState(docMapIdHashes, s3StateFileUrl);

  const results = await Promise.all(importWorkflows.map((importWorkflow) => importWorkflow.result()));

  return {
    status: 'SUCCESS',
    message: `Importing ${docMapIdHashes.length} docmaps`,
    results,
  };
}
