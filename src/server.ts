import express from 'express';
import { Connection, WorkflowClient } from '@temporalio/client';
import { importMeca } from './workflows';

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

  app.get('/import/:publisherId/:articleId', async (req, res) => {
    const {
      publisherId,
      articleId,
    } = req.params;
    const doi = `${publisherId}/${articleId}`;
    const workflowId = `import-${doi}`;

    const handle = await client.start(importMeca, {
      workflowId,
      taskQueue: 'epp',
      args: [{ id: '12345', version: '1', preprintDoi: doi }], // this is typechecked against workflowFn's args
    });

    res.send((await handle.describe()).workflowId);
  });

  return app;
};

createTemporalClient().then((temporalClient) => {
  createApp(temporalClient).listen(3000, () => {
    console.log('Import app listening on port 3000');
  });
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
