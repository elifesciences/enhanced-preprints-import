import {
  ParentClosePolicy,
  proxyActivities,
  startChild,
  workflowInfo,
} from '@temporalio/workflow';
import type * as activities from '../activities/index';
import { importDocmap } from './import-docmap';

const {
  filterDocmapIndex,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

type ImportDocmapsOutput = {
  status: 'SUCCESS' | 'SKIPPED' | 'ERROR';
  message: string;
  hashes: string[]
};

export async function importDocmaps(docMapIndexUrl: string, hashes: string[] = []): Promise<ImportDocmapsOutput> {
  const result = await filterDocmapIndex(hashes, docMapIndexUrl);

  if (result === undefined) {
    return {
      status: 'ERROR',
      message: 'Docmap result is undefined',
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
      args: [docmap.id], // id contains the canonical URL of the docmap
      workflowId: `${workflowInfo().workflowId}/docmap-${index}`,
      parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_ABANDON,
    });
  }));

  return {
    status: 'SUCCESS',
    message: `Imported ${docMaps.length} docmaps`,
    hashes: newHashes,
  };
}
