import {
  condition,
  continueAsNew,
  executeChild, proxyActivities, setHandler, workflowInfo,
} from '@temporalio/workflow';
import type * as activities from '../activities/index';
import { EnhancedArticle } from '../activities/send-version-to-epp';
import { importContent } from './import-content';
import { useWorkflowState } from '../hooks/useWorkflowState';

const {
  parseDocMap,
  generateTimeline,
} = proxyActivities<typeof activities>({
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
  setHandler(store.signal, (newValue: boolean) => {
    store.value = newValue;
  });
  setHandler(store.query, () => store.value);

  const result = await fetchDocMap(url).then((docMap) => parseDocMap(docMap));

  const timeline = await generateTimeline(result);

  await Promise.all(
    result.versions.map(async (version, index) => executeChild(importContent, {
      args: [version],
      workflowId: `${workflowInfo().workflowId}/version-${index}/content`,
    }).then(async (importContentResult) => generateVersionJson({ importContentResult, version }))
      .then((versionJson) => ({ ...versionJson, timeline }))
      .then(async (versionJson: EnhancedArticle) => sendVersionToEpp(versionJson))),
  );

  store.value = false;

  await condition(() => store.value);
  await continueAsNew<typeof importDocmap>(url);
}
