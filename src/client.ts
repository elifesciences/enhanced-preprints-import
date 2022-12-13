import { Connection, WorkflowClient } from '@temporalio/client';
import { importMeca } from './workflows';

async function run() {
  const connectionOptions = {
    address: 'localhost:7233',
  };
  const connection = await Connection.connect(connectionOptions);

  const client = new WorkflowClient({
    connection,
    // connects to 'default' namespace if not specified
    namespace: 'epp',
  });

  const workflowId = 'import-80494';
  const handle = await client.start(importMeca, {
    workflowId,
    taskQueue: 'epp',
    args: [{ doi: '10.1101/2022.06.24.497502' }], // this is typechecked against workflowFn's args
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
