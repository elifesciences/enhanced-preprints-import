import {
  executeChild,
  proxyActivities,
  upsertSearchAttributes,
  workflowInfo,
} from '@temporalio/workflow';
import { DocMap } from '@elifesciences/docmap-ts';
import type * as activities from '../activities/index';
import { importContent } from './import-content';
import { ImportDocmapMessage } from '../types';

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
  createDocMapHash,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    initialInterval: '1 minute',
    backoffCoefficient: 2,
    maximumInterval: '15 minutes',
    nonRetryableErrorTypes: ['NonRetryableError'],
  },
});

export async function importDocmap(url: string): Promise<ImportDocmapMessage> {
  upsertSearchAttributes({
    DocmapURL: [url],
  });
  const docmapJson = await fetchDocMap(url);

  // calculate docmap hashes, to verify the docmap hasn't changed
  const docmap = JSON.parse(docmapJson);
  const hashes = await createDocMapHash(docmap as DocMap);

  const result = await parseDocMap(docmapJson);

  upsertSearchAttributes({
    ManuscriptId: [result.id],
  });

  const results = await Promise.all(
    result.versions.map(async (version) => {
      const importContentResult = await executeChild(importContent, {
        args: [version],
        workflowId: `${workflowInfo().workflowId}/${version.versionIdentifier}/content`,
        searchAttributes: {
          DocmapURL: [url],
          ManuscriptId: [version.id],
        },
      });
      if (typeof importContentResult === 'string') {
        return {
          id: version.id,
          versionIdentifier: version.versionIdentifier,
          result: importContentResult,
        };
      }
      const payloadFile = await generateVersionJson({
        importContentResult, msid: result.id, version, manuscript: result.manuscript,
      });
      await sendVersionToEpp(payloadFile);
      return {
        id: version.id,
        versionIdentifier: version.versionIdentifier,
        result: 'Sent to EPP',
      };
    }),
  );

  return {
    results,
    hashes,
  };
}
