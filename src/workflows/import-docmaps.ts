import {
  ParentClosePolicy,
  proxyActivities,
  startChild,
} from '@temporalio/workflow';
import type * as activities from '../activities/index';
import { importDocmap } from './import-docmap';
import { DocMapIndexUndefinedError } from '../types';

const {
  filterDocmapIndex,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

type ImportDocmapsOutput = ImportMessage & {
  hashes: string[]
};

export async function importDocmaps(date: number, docMapIndexUrl: string, hashes: string[] = []): Promise<ImportDocmapsOutput> {
  const result = await filterDocmapIndex(hashes, docMapIndexUrl);

  if (result === undefined) {
    throw DocMapIndexUndefinedError;
  } else if (result.hashes.length === 0) {
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
