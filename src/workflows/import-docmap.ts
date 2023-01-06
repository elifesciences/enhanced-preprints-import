import { proxyActivities, executeChild } from '@temporalio/workflow';
import type * as activities from '../activities/index';
import { DocMap, ParseResult } from '../docmaps';

const {
  parseDocMap,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

type DocMapImportOutput = {
  result: ParseResult,
  mecaLocation?: string,
};

export async function importDocmap(docMap: DocMap): Promise<DocMapImportOutput> {
  const result = await parseDocMap(docMap);

  await Promise.all(result.versions.map(async (version) => {
    await executeChild('importContent', {
      args: [version],
      workflowId: `import-content-${docMap.id}`,
    });
  }));

  return {
    result,
  };
}
