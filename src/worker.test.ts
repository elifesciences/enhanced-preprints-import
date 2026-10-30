import {
  bundleWorkflowCode, DefaultLogger, NativeConnection, Runtime, Worker,
} from '@temporalio/worker';
import * as activities from './activities/index';

jest.mock('./config', () => ({
  config: {},
}));

// Guards against dependency changes that stop the worker from starting,
// e.g. a missing peer dependency of the Temporal SDK
describe('worker', () => {
  it('loads the Temporal SDK modules used by the worker', () => {
    expect(NativeConnection).toBeDefined();
    expect(Worker).toBeDefined();
    expect(Runtime).toBeDefined();
    expect(DefaultLogger).toBeDefined();
  });

  it('loads the activities', () => {
    expect(Object.keys(activities).length).toBeGreaterThan(0);
  });

  it('bundles the workflows', async () => {
    const { code } = await bundleWorkflowCode({
      workflowsPath: require.resolve('./workflows'),
      logger: new DefaultLogger('WARN'),
    });

    expect(code.length).toBeGreaterThan(0);
  }, 60000);
});
