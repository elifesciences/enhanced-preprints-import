import {
  ParentClosePolicy,
  sleep,
  startChild,
  continueAsNew,
} from '@temporalio/workflow';
import { importDocmaps } from './import-docmaps';

export async function loopTimer(docMapIndexUrl: string, hashes: string[] = []): Promise<void> {
  const date = new Date().getTime();
  const importWf = await startChild(importDocmaps, {
    args: [date, docMapIndexUrl, hashes],
    workflowId: `docmap-index-poll-${new Date().getTime()}`,
    parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_ABANDON,
  });

  const { hashes: newHashes } = await importWf.result();

  await sleep('1 minute');
  await continueAsNew<typeof loopTimer>(docMapIndexUrl, newHashes);
}
