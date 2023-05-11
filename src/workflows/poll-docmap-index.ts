import {
  ParentClosePolicy,
  sleep,
  startChild,
  continueAsNew,
} from '@temporalio/workflow';
import { importDocmaps } from './import-docmaps';

export async function pollDocMapIndex(docMapIndexUrl: string, sleepTime: string = '1 hour', hashes: string[] = []): Promise<void> {
  const date = new Date().getTime();
  try {
    const importWf = await startChild(importDocmaps, {
      args: [date, docMapIndexUrl, hashes],
      workflowId: `docmap-index-poll-${new Date().getTime()}`,
      parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_ABANDON,
    });

    const { hashes: newHashes } = await importWf.result();

    await sleep(sleepTime);
    await continueAsNew<typeof pollDocMapIndex>(docMapIndexUrl, sleepTime, newHashes);
  } catch (error) {
    // Send error message to logging service
    await sleep(sleepTime);
    await continueAsNew<typeof pollDocMapIndex>(docMapIndexUrl, sleepTime, hashes);
  }
}
