import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { importDocmaps } from './import-docmaps';

describe('importDocmaps', () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createTimeSkipping();
  });
  
  afterAll(async () => {
    await testEnv?.teardown();
  });

  it('should not create importdocmap workflows if the number of docmap changes are 0', async() => {
    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: 'test-epp',
      workflowsPath: require.resolve('./'),
      activities: {
        filterDocmapIndex: () => [],
        mergeDocmapState: () => false,
      }
    });
    const result = await worker.runUntil(
      testEnv.client.workflow.execute(importDocmaps, {
        workflowId: 'import-docmaps',
        taskQueue: 'test-epp',
        args: ['http://test-docmaps.com']
      })
    );
    expect(result.status).toEqual('SKIPPED');
  });
  it('should create importdocmap workflows if the number of docmap changes are below a threshold', async() => {
    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: 'test-epp',
      workflowsPath: require.resolve('./'),
      activities: {
        filterDocmapIndex: () => [],
        mergeDocmapState: () => false,
      }
    });
    const result = await worker.runUntil(
      testEnv.client.workflow.execute(importDocmaps, {
        workflowId: 'import-docmaps',
        taskQueue: 'test-epp',
        args: ['http://test-docmaps.com']
      })
    );
    expect(result.status).toEqual('SUCCESS');
  }); 
  it('should not create importdocmap workflows if the number of docmap changes are above a threshold', async() => {
    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: 'test-epp',
      workflowsPath: require.resolve('./'),
      activities: {
        filterDocmapIndex: () => [],
        mergeDocmapState: () => false,
      }
    });
    const result = await worker.runUntil(
      testEnv.client.workflow.execute(importDocmaps, {
        workflowId: 'import-docmaps',
        taskQueue: 'test-epp',
        args: ['http://test-docmaps.com']
      })
    );
    expect(result.status).toEqual('NOT APPROVED');
  }); 
  it.todo('should progress importdocmap workflows if it gets an approval signal');
  it.todo('should not progress importdocmap workflows if it gets a rejection signal');
});
