import { NativeConnection, Worker, Runtime, DefaultLogger } from '@temporalio/worker';
import * as activities from './activities/index';

async function run() {
  // setup logging
  const logger = new DefaultLogger('DEBUG', ({ level, message }) => {
    console.log(`Custom logger: ${level} — ${message}`);
  });
  Runtime.install({ logger });

  const address = process.env.TEMPORAL_SERVER ?? 'localhost';

  const connectionOptions = {
    address,
  };
  const connection = await NativeConnection.connect(connectionOptions);

  const worker = await Worker.create({
    connection,
    workflowsPath: require.resolve('./workflows'),
    taskQueue: 'epp',
    activities,
    namespace: 'epp',
  });

  await worker.run();
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
