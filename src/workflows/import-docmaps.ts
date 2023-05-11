import {
  ParentClosePolicy,
  proxyActivities,
  startChild,
} from '@temporalio/workflow';
import type * as activities from '../activities/index';
import { importDocmap } from './import-docmap';

const {
  findAllDocmaps,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

export type ImportDocmapsOutput = {
  status: 'SUCCESS' | 'SKIPPED' | 'ERROR';
  message: string;
  hashes: string[]
};

export async function importDocmaps(date: number, docMapIndexUrl: string, hashes: string[] = []): Promise<ImportDocmapsOutput> {
  const result = await findAllDocmaps(hashes, docMapIndexUrl);

  if (result === undefined) {
    return {
      status: 'ERROR',
      message: 'Docmap reult is undefined',
      hashes,
    };
  } if (result.hashes.length === 0) {
    return {
      status: 'SKIPPED',
      message: 'No new docmaps to import',
      hashes,
    };
  }

  const { docMaps, hashes: newHashes } = result;

  await Promise.all(docMaps.map(async (docmap, index) => {
    await startChild(importDocmap, {
      args: [date, docmap.id, index], // id contains the canonical URL of the docmap
      workflowId: `import-docmap-${date}-${index}`,
      parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_ABANDON,
    });
  }));

  return {
    status: 'SUCCESS',
    message: `Imported ${docMaps.length} docmaps`,
    hashes: newHashes,
  };
}
