import {
  ParentClosePolicy,
  condition,
  proxyActivities,
  startChild,
} from '@temporalio/workflow';
import type * as activities from '../activities/index';

const {
  findAllDocmaps,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

type DocMapImportOutput = {
  docMapIndexUrl: string,
  count: number,
  docmapIds: string[],
};

let hashes: string[] = [];

export async function importDocmaps(docMapIndexUrl: string): Promise<DocMapImportOutput> {
  await condition(() => false, '1 hour');
  const result = await findAllDocmaps(hashes, docMapIndexUrl);

  if (result === undefined) {
    return {
      docMapIndexUrl,
      count: 0,
      docmapIds: [],
    };
  }

  const { docMaps, hashes: newHashes } = result;

  hashes = newHashes;

  await Promise.all(docMaps.map(async (docmap, index) => {
    await startChild('importDocmap', {
      args: [docmap.id, index], // id contains the canonical URL of the docmap
      workflowId: `import-docmap-${new Date().getTime()}-${index}`,
      parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_ABANDON,
    });
  }));

  const docmapIds = docMaps.map((docmap) => docmap.id);

  return {
    docMapIndexUrl,
    count: docMaps.length,
    docmapIds,
  };
}
