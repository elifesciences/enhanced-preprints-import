import {
  NativeConnection, Worker, Runtime, DefaultLogger,
} from '@temporalio/worker';
import * as activities from './activities/index';
import { config } from './config';

async function run() {
  // setup logging
  const logger = new DefaultLogger('DEBUG', ({ level, message }) => {
    // eslint-disable-next-line no-console
    console.log(`Custom logger: ${level} — ${message}`);
  });
  Runtime.install({
    logger,
    telemetryOptions: {
      metrics: {
        prometheus: { bindAddress: config.prometheusBindAddress },
      },
    },
  });

  const connection = await NativeConnection.connect({
    address: config.temporalServer,
  });

  const worker = await Worker.create({
    connection,
    workflowsPath: require.resolve('./workflows'),
    taskQueue: config.temporalTaskQueue,
    namespace: config.temporalNamespace,
    maxConcurrentActivityTaskExecutions: config.temporalMaxConcurrentActivityTaskExecutions,
    maxConcurrentWorkflowTaskExecutions: config.temporalMaxConcurrentWorkflowTaskExecutions,
    maxCachedWorkflows: config.temporalMaxCachedWorkflows,
    activities,
  });

  const newWorker = await Worker.create({
    connection,
    workflowsPath: require.resolve('./workflows'),
    taskQueue: 'import-docmaps',
  });

  await worker.run();
  await newWorker.run();
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
