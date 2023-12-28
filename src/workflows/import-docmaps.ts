import {
  ParentClosePolicy,
  WorkflowIdReusePolicy,
  proxyActivities,
  startChild,

} from '@temporalio/workflow';
import type * as activities from '../activities/index';
import { importDocmap } from './import-docmap';
import { ImportDocmapsMessage } from '../types';

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

export type Hash = { hash: string, idHash: string };

export async function importDocmaps(docMapIndexUrl: string, s3StateFileUrl?: string, start?: number, end?: number): Promise<ImportDocmapsMessage> {
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
    return {
      status: 'SKIPPED',
      message: 'Too many docmap changes. Continue?',
      results: [],
    };
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
