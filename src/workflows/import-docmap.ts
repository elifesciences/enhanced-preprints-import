import { proxyActivities, executeChild } from '@temporalio/workflow';
import { ManuscriptData } from '@elifesciences/docmap-ts';
import type * as activities from '../activities/index';

const {
  fetchDocMap,
  parseDocMap,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

type DocMapImportOutput = {
  result: ManuscriptData,
  mecaLocation?: string,
};

export async function importDocmap(url: string): Promise<DocMapImportOutput> {
  const docMap = await fetchDocMap(url);
  const result = await parseDocMap(docMap);

  await Promise.all(
    result.versions.map(async (version) => executeChild('importContent', {
      args: [version],
      workflowId: 'import-content',
    })),
  );

  return {
    result,
  };
}
