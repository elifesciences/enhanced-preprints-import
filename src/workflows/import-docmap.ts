import {
  proxyActivities,
  upsertSearchAttributes,
} from '@temporalio/workflow';
import { DocMap } from '@elifesciences/docmap-ts';
import type * as activities from '../activities/index';
import { ImportDocmapMessage, WorkflowArgs } from '../types';
import { importManuscriptData } from './import-manuscript-data';

const { parseDocMap } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    maximumAttempts: 1,
  },
});
const {
  fetchDocMap,
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

type ImportDocmapArgs = WorkflowArgs & {
  url: string,
};

export async function importDocmap({ url, workflowArgs }: ImportDocmapArgs): Promise<ImportDocmapMessage> {
  upsertSearchAttributes({
    DocmapURL: [url],
  });
  const docmapJson = await fetchDocMap(url);

  // calculate docmap hashes, to verify the docmap hasn't changed
  const docmap = JSON.parse(docmapJson);
  const hashes = await createDocMapHash(docmap as DocMap);

  const data = await parseDocMap(docmapJson);

  return {
    results: await importManuscriptData({ data, workflowArgs }),
    hashes,
  };
}
