import { executeChild, proxyActivities, workflowInfo } from '@temporalio/workflow';
import type * as activities from '../activities/index';
import { EnhancedArticle } from '../activities/send-version-to-epp';
import { importContent } from './import-content';
import { useWorkflowState } from '../hooks/useWorkflowState';

const { parseDocMap } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    maximumAttempts: 1,
  },
});

const {
  generateVersionJson,
  fetchDocMap,
  sendVersionToEpp,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    initialInterval: '1 minute',
    backoffCoefficient: 2,
    maximumInterval: '15 minutes',
  },
});

export const store = useWorkflowState(workflowInfo().workflowId, true);

export async function importDocmap(url: string): Promise<void> {
  const result = await fetchDocMap(url).then((docMap) => parseDocMap(docMap));

  await Promise.all(
    result.versions.map(async (version, index) => executeChild(importContent, {
      args: [version],
      workflowId: `${workflowInfo().workflowId}/version-${index}/content`,
    }).then(async (importContentResult) => generateVersionJson({ importContentResult, msid: result.id, version }))
      .then(async (versionJson: EnhancedArticle) => sendVersionToEpp(versionJson))),
  );
}
