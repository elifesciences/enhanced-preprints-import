import { TestWorkflowEnvironment } from '@temporalio/testing';

describe('importDocmaps', () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createTimeSkipping();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  it.todo('should create importdocmap workflows if the number of docmap changes are below a threshold');
  it.todo('should not create importdocmap workflows if the number of docmap changes are above a threshold');
  it.todo('should progress importdocmap workflows if it gets an approval signal');
  it.todo('should not progress importdocmap workflows if it gets a rejection signal');
});
