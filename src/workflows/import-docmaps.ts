import {
  ParentClosePolicy,
  proxyActivities,
  startChild,
} from '@temporalio/workflow';
import type * as activities from '../activities/index';

const {
  findAllDocmaps,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});



export async function importDocmaps(docMapIndexUrl: string): Promise<EPP.DocMapsImportOutput> {
  const docmaps = await findAllDocmaps(docMapIndexUrl);

  if (docmaps === undefined) {
    return {
      docMapIndexUrl,
      count: 0,
      docmapIds: [],
    };
  }

  await Promise.all(docmaps.slice(0, 1).map(async (docmap) => {
    await startChild('importDocmap', {
      args: [docmap.id], // id contains the canonical URL of the docmap
      workflowId: `import-docmap-${new Date().getTime()}`,
      parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_ABANDON,
    });
  }));

  const docmapIds = docmaps.map((docmap) => docmap.id);

  return {
    docMapIndexUrl,
    count: docmaps.length,
    docmapIds,
  };
}
