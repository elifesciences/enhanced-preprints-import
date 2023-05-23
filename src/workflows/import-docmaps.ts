import {
  ParentClosePolicy,
  getExternalWorkflowHandle,
  proxyActivities,
  startChild,
} from '@temporalio/workflow';
import type * as activities from '../activities/index';
import { importDocmap, store } from './import-docmap';
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

export async function importDocmaps(docMapIndexUrl: string, hashes: Hash[]): Promise<ImportDocmapsOutput> {
  const docMapsWithIdHash = await filterDocmapIndex(hashes, docMapIndexUrl);

  if (docMapsWithIdHash.length === 0) {
    return {
      status: 'SKIPPED',
      message: 'No new docmaps to import',
      hashes,
    };
  }

  await Promise.all(docMapsWithIdHash.map(async (docMapWithIdHash) => {
    if (hashes.some(({ idHash }) => docMapWithIdHash.idHash === idHash)) {
      // If the workflow exists, send a signal
      const handle = getExternalWorkflowHandle(`docmap-${docMapWithIdHash.idHash}`);
      handle.signal(store.signal, true);
    } else {
      // If the workflow doesn't exist, start the workflow
      await startChild(importDocmap, {
        args: [docMapWithIdHash.docMap.id], // id contains the canonical URL of the docmap
        workflowId: `docmap-${docMapWithIdHash.idHash}`,
        parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_ABANDON,
      });
    }
  }));

  return {
    status: 'SUCCESS',
    message: `Importing ${docMapsWithIdHash.length} docmaps`,
    hashes: docMapsWithIdHash.map<Hash>(({ docMapHash, idHash }) => ({ hash: docMapHash, idHash })),
  };
}
