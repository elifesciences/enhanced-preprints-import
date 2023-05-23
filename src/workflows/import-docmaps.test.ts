import { MD5 } from 'object-hash';
import { DocMap } from '@elifesciences/docmap-ts';
import { Worker } from '@temporalio/worker';
import { TestWorkflowEnvironment, workflowInterceptorModules } from '@temporalio/testing';
import assert from 'assert';
import type * as activities from '../activities/index';

describe('import docmaps', () => {
  let testEnv: TestWorkflowEnvironment;

  // beforeAll and afterAll are injected by Jest
  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  it('does stuff', async () => {
    const mockedHash = MD5({ id: 'fake-docmap' });
    const mockedIdHash = MD5('fake-docmap');

    const mockActivities: Partial<typeof activities> = {
      filterDocmapIndex: async () => [{
        docMapHash: mockedHash,
        idHash: mockedIdHash,
        docMap: ({ id: 'fake-docmap' } as DocMap),
      }],
    };

    const worker = await Worker.create({
      activities: mockActivities,
      taskQueue: 'default',
      interceptors: {
        workflowModules: workflowInterceptorModules,
      },
      workflowsPath: require.resolve(
        './src/workflows/import-docmaps.ts',
      ),
    });

    await worker.runUntil(
      testEnv.client.workflow.execute(async () => { assert.ok(false); }, {
        taskQueue: 'default',
        workflowId: 'default',
      }), // throws WorkflowFailedError
    );
  });
});
