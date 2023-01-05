import express from 'express';
import { Connection, WorkflowClient } from '@temporalio/client';
import { importDocmaps } from './workflows';

const createTemporalClient = async () => {
  const address = process.env.TEMPORAL_SERVER ?? 'localhost';

  const connectionOptions = {
    address,
  };
  const connection = await Connection.connect(connectionOptions);

  const client = new WorkflowClient({
    connection,
    // connects to 'default' namespace if not specified
    namespace: 'epp',
  });

  return client;
};

const createApp = (client: WorkflowClient) => {
  const app = express();

  app.get('/import', async (req, res) => {
    const timestamp = new Date().toISOString();
    const workflowId = `import-docmaps-${timestamp}`;

    const handle = await client.start(importDocmaps, {
      workflowId,
      taskQueue: 'epp',
      args: ['https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v1/index'],
    });

    res.send((await handle.describe()).workflowId);
  });

  return app;
};

createTemporalClient().then((temporalClient) => {
  createApp(temporalClient).listen(3000, () => {
    // eslint-disable-next-line no-console
    console.log('Import app listening on port 3000');
  });
}).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
