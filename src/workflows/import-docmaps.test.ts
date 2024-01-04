import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { importDocmaps } from './import-docmaps';

const shortDocmapList = [
  {
    docMapId: 'https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=95532',
    docMapHash: '1ae42bb3a79509c586fcdd51fe71db18',
    docMapIdHash: 'cee3357ed3c51fcf2b6aed5da789788a',
  },
  {
    docMapId: 'https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=91472',
    docMapHash: 'c4a0c59fcb30509b26a682bac39f4db9',
    docMapIdHash: '17efcefe7b0882f75c7494939858d4fb',
  },
];

const longDocmapList = [
  {
    docMapId: 'https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=95532',
    docMapHash: '1ae42bb3a79509c586fcdd51fe71db18',
    docMapIdHash: 'cee3357ed3c51fcf2b6aed5da789788a',
  },
  {
    docMapId: 'https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=91472',
    docMapHash: 'c4a0c59fcb30509b26a682bac39f4db9',
    docMapIdHash: '17efcefe7b0882f75c7494939858d4fb',
  },
  {
    docMapId: 'https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=95532',
    docMapHash: '1ae42bb3a79509c586fcdd51fe71db18',
    docMapIdHash: 'cee3357ed3c51fcf2b6aed5da789788a',
  },
  {
    docMapId: 'https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=91472',
    docMapHash: 'c4a0c59fcb30509b26a682bac39f4db9',
    docMapIdHash: '17efcefe7b0882f75c7494939858d4fb',
  },
  {
    docMapId: 'https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=95532',
    docMapHash: '1ae42bb3a79509c586fcdd51fe71db18',
    docMapIdHash: 'cee3357ed3c51fcf2b6aed5da789788a',
  },
  {
    docMapId: 'https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=91472',
    docMapHash: 'c4a0c59fcb30509b26a682bac39f4db9',
    docMapIdHash: '17efcefe7b0882f75c7494939858d4fb',
  },
  {
    docMapId: 'https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=95532',
    docMapHash: '1ae42bb3a79509c586fcdd51fe71db18',
    docMapIdHash: 'cee3357ed3c51fcf2b6aed5da789788a',
  },
  {
    docMapId: 'https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=91472',
    docMapHash: 'c4a0c59fcb30509b26a682bac39f4db9',
    docMapIdHash: '17efcefe7b0882f75c7494939858d4fb',
  },
  {
    docMapId: 'https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=95532',
    docMapHash: '1ae42bb3a79509c586fcdd51fe71db18',
    docMapIdHash: 'cee3357ed3c51fcf2b6aed5da789788a',
  },
  {
    docMapId: 'https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=91472',
    docMapHash: 'c4a0c59fcb30509b26a682bac39f4db9',
    docMapIdHash: '17efcefe7b0882f75c7494939858d4fb',
  },
  {
    docMapId: 'https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=95532',
    docMapHash: '1ae42bb3a79509c586fcdd51fe71db18',
    docMapIdHash: 'cee3357ed3c51fcf2b6aed5da789788a',
  },
];

describe('importDocmaps', () => {
  let testEnv: TestWorkflowEnvironment;
  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createTimeSkipping();
  });
  afterAll(async () => {
    await testEnv?.teardown();
  });

  const filterDocmapIndexMock = jest.fn();
  const mergeDocmapStateMock = jest.fn();
  let worker: Worker;
  beforeEach(async () => {
    worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: 'test-epp',
      workflowsPath: require.resolve('./'),
      activities: {
        filterDocmapIndex: filterDocmapIndexMock,
        mergeDocmapState: mergeDocmapStateMock,
      },
    });
  });
  afterEach(async () => {
    try {
      worker.shutdown();
    } catch (e) {
      // Ignore
    }
    filterDocmapIndexMock.mockReset();
    mergeDocmapStateMock.mockReset();
  });

  it('should not create importdocmap workflows if the number of docmap changes are 0', async () => {
    filterDocmapIndexMock.mockResolvedValueOnce([]);

    const result = await worker.runUntil(testEnv.client.workflow.execute(importDocmaps, {
      workflowId: 'import-zero-docmaps',
      taskQueue: 'test-epp',
      args: ['http://test-docmaps.com'],
    }));

    expect(result?.status).toEqual('SKIPPED');
  });

  it('should create importdocmap workflows if the number of docmap changes are below a threshold', async () => {
    filterDocmapIndexMock.mockResolvedValueOnce(shortDocmapList);
    mergeDocmapStateMock.mockResolvedValueOnce(false);

    const result = await testEnv.client.workflow.execute(importDocmaps, {
      workflowId: 'import-short-docmaps',
      taskQueue: 'test-epp',
      args: ['http://test-docmaps.com'],
    });

    expect(result?.status).toEqual('SUCCESS');
    expect(result?.results.length).toEqual(2);
  });

  it('should progress importdocmap workflows if it gets an approval signal', async () => {
    filterDocmapIndexMock.mockResolvedValueOnce(longDocmapList);
    const workflowHandle = await testEnv.client.workflow.start(importDocmaps, {
      workflowId: 'import-long-docmaps-approve',
      taskQueue: 'test-epp',
      args: ['http://test-docmaps.com'],
    });

    workflowHandle.signal('approval', true);

    const result = await workflowHandle.result();
    expect(result?.status).toEqual('SUCCESS');
  });

  it('should cancel importdocmap workflows if it gets a rejection signal', async () => {
    filterDocmapIndexMock.mockResolvedValueOnce(longDocmapList);
    const workflowHandle = await testEnv.client.workflow.start(importDocmaps, {
      workflowId: 'import-long-docmaps-reject',
      taskQueue: 'test-epp',
      args: ['http://test-docmaps.com'],
    });

    workflowHandle.signal('approval', false);

    const result = await worker.runUntil(workflowHandle.result());
    expect(result?.status).toEqual('NOT APPROVED');
  });
});
