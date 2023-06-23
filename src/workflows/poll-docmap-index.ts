import {
  ParentClosePolicy,
  sleep,
  startChild,
  continueAsNew,
} from '@temporalio/workflow';
import { Hash, importDocmaps } from './import-docmaps';

export async function pollDocMapIndex(docMapIndexUrl: string, sleepTime: string = '1 hour', hashes: Hash[] = <Hash[]>[]): Promise<void> {
  const importWf = await startChild(importDocmaps, {
    args: [docMapIndexUrl, hashes],
    workflowId: `docmap-index-poll/${new Date().getTime()}`,
    parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_ABANDON,
  });

  const { hashes: newHashes } = await importWf.result();

  await sleep(sleepTime);
  await continueAsNew<typeof pollDocMapIndex>(docMapIndexUrl, sleepTime, newHashes);
}
