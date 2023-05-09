import { proxyActivities, executeChild } from '@temporalio/workflow';
import { ManuscriptData } from '@elifesciences/docmap-ts';
import type * as activities from '../activities/index';
import { EnhancedArticle } from '../activities/send-version-to-epp';

const {
  fetchDocMap,
  parseDocMap,
  generateVersionJson,
  sendVersionToEpp,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

type DocMapImportOutput = {
  result: ManuscriptData,
  mecaLocation?: string,
};

export async function importDocmap(url: string, hash: string): Promise<DocMapImportOutput> {
  const docMap = await fetchDocMap(url);
  const result = await parseDocMap(docMap);

  await Promise.all(
    result.versions.map(async (version, index) => executeChild('importContent', {
      args: [version],
      workflowId: `import-content-${hash}-${index}`,
    }).then(async (importContentResult) => generateVersionJson({ importContentResult, msid: result.id, version }))
      .then(async (versionJson: EnhancedArticle) => sendVersionToEpp(versionJson, hash))),
  );

  return {
    result,
  };
}
