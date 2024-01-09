import {
  ParentClosePolicy,
  WorkflowIdReusePolicy,
  condition,
  defineSignal,
  proxyActivities,
  setHandler,
  startChild,
} from '@temporalio/workflow';
import type * as activities from '../activities/index';
import { ImportDocmapsMessage } from '../types';
import { importDocmap } from './import-docmap';

const {
  filterDocmapIndex,
  mergeDocmapState,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    initialInterval: '1 minute',
    backoffCoefficient: 2,
    maximumInterval: '15 minutes',
  },
});

type ImportArgs = {
  docMapIndexUrl: string,
  s3StateFileUrl?: string,
  docMapThreshold?: number,
  start?: number,
  end?: number,
};

export type Hash = { hash: string, idHash: string };

const approvalSignal = defineSignal<[boolean]>('approval');

export async function importDocmaps({
  docMapIndexUrl, s3StateFileUrl, docMapThreshold, start, end,
}: ImportArgs): Promise<ImportDocmapsMessage> {
  let approval: boolean | null = null;
  setHandler(approvalSignal, (approvalValue: boolean) => { approval = approvalValue; });
  const docMapIdHashes = await filterDocmapIndex(docMapIndexUrl, s3StateFileUrl, start, end);

  if (docMapIdHashes.length === 0) {
    return {
      status: 'SKIPPED',
      message: 'No new docmaps to import',
      results: [],
    };
  }

  if (docMapThreshold && docMapIdHashes.length > docMapThreshold) {
    await condition(() => typeof approval === 'boolean');
    if (!approval) {
      return {
        status: 'NOT APPROVED',
        message: 'Large import not approved',
        results: [],
      };
    }
  }

  const importWorkflows = await Promise.all(docMapIdHashes.map(async (docMapIdHash) => startChild(importDocmap, {
    args: [docMapIdHash.docMapId], // id contains the canonical URL of the docmap
    workflowId: `docmap-${docMapIdHash.docMapIdHash}`,
    // allows child workflows to outlive this workflow
    parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_ABANDON,
    // makes sure there is only one workflow running, this new one.
    workflowIdReusePolicy: WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_TERMINATE_IF_RUNNING,
    taskQueue: 'import-docmaps',
  })));

  await mergeDocmapState(docMapIdHashes, s3StateFileUrl);

  const results = await Promise.all(importWorkflows.map((importWorkflow) => importWorkflow.result()));

  return {
    status: 'SUCCESS',
    message: `Importing ${docMapIdHashes.length} docmaps`,
    results,
  };
}
