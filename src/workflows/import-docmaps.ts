import {
  ParentClosePolicy,
  sleep,
  proxyActivities,
  startChild,
  continueAsNew,
} from '@temporalio/workflow';
import type * as activities from '../activities/index';

const {
  findAllDocmaps,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

export async function importDocmaps(docMapIndexUrl: string, hashes: string[] = []): Promise<void> {
  const result = await findAllDocmaps(hashes, docMapIndexUrl);

  if (result === undefined) {
    await sleep('2 minutes');
    await continueAsNew<typeof importDocmaps>(docMapIndexUrl, hashes);
    return;
  }

  const { docMaps, hashes: newHashes } = result;

  await Promise.all(docMaps.map(async (docmap, index) => {
    await startChild('importDocmap', {
      args: [docmap.id, index], // id contains the canonical URL of the docmap
      workflowId: `import-docmap-${new Date().getTime()}-${index}`,
      parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_ABANDON,
    });
  }));

  await sleep('2 minutes');
  await continueAsNew<typeof importDocmaps>(docMapIndexUrl, newHashes);
}
