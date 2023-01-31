import { proxyActivities, executeChild } from '@temporalio/workflow';
import { ManuscriptData } from '@elifesciences/docmap-ts';
import type * as activities from '../activities/index';
import { importContent } from './import-content';

const {
  fetchDocMap,
  parseDocMap,
  sendVersionToEpp,
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
    result.versions.map(async (version) => executeChild<typeof importContent>('importContent', {
      args: [version],
      workflowId: 'import-content',
    }).then((importContentResult) => sendVersionToEpp(result.id, version, importContentResult.jsonContentFile, version.doi))),
  );

  return {
    result,
  };
}
