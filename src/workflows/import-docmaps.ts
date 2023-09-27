import {
  ParentClosePolicy,
  WorkflowIdReusePolicy,
  proxyActivities,
  startChild,
} from '@temporalio/workflow';
import type * as activities from '../activities/index';
import { importDocmap } from './import-docmap';
import { ImportMessage } from '../types';

const {
  filterDocmapIndex,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    initialInterval: '1 minute',
    backoffCoefficient: 2,
    maximumInterval: '15 minutes',
  },
});

type ImportDocmapsOutput = ImportMessage & {
  hashes: Hash[]
};

export type Hash = { hash: string, idHash: string };

export async function importDocmaps(docMapIndexUrl: string, hashes: Hash[], start?: number, end?: number): Promise<ImportDocmapsOutput> {
  const docMapsWithIdHash = await filterDocmapIndex(hashes, docMapIndexUrl, start, end);

  if (docMapsWithIdHash.length === 0) {
    return {
      status: 'SKIPPED',
      message: 'No new docmaps to import',
      hashes,
    };
  }

  await Promise.all(docMapsWithIdHash.map(async (docMapWithIdHash) => startChild(importDocmap, {
    args: [docMapWithIdHash.docMapId], // id contains the canonical URL of the docmap
    workflowId: `docmap-${docMapWithIdHash.docMapIdHash}`,
    // allows child workflows to outlive this workflow
    parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_ABANDON,
    // makes sure there is only one workflow running, this new one.
    workflowIdReusePolicy: WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_TERMINATE_IF_RUNNING,
  })));

  return {
    status: 'SUCCESS',
    message: `Importing ${docMapsWithIdHash.length} docmaps`,
    hashes: docMapsWithIdHash.map<Hash>(({ docMapHash, docMapIdHash }) => ({ hash: docMapHash, idHash: docMapIdHash })),
  };
}
