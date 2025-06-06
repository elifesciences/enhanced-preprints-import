# Enhanced Preprint import system

This is a repository for the temporal worker docker image for EPP.

This project facilitates asynchronous importing of content identified from a [docmap](https://docmaps.knowledgefutures.org/pub/sgkf1pqa) provider. We are using the docmaps to provide a feed of preprints that have been reviewed by a particular publisher. The data in the docmap provides the history and location of content, which we parse and retrieve.

We then push the parsed content into an EPP server endpoint.

Finally, the results of all this retrieval is stored in an S3 bucket in well structured paths (which can then be configured as a source for a [canteloupe IIIF server](https://github.com/elifesciences/enhanced-preprints-image-server))

The monitoring and scheduling of the import workflows are handled by a [temporal server](https://temporal.io/) testing and dev).

# Getting started

Ensure you have docker and docker-compose (v2 tested). Also install [`temporal`](https://github.com/temporalio/cli) to start and control jobs

- clone the repo
- run `yarn`
- run `docker compose up` to start temporal and the workers in "watch" mode
- run `temporal operator namespace list` to list namespaces, you should see default namespace listed, and not any other error.

The `docker compose` workflow above will restart the worker when your mounted filesystem changes.

## Run a single import workflow

To run an import workflow, run:

```shell
temporal workflow execute --type importDocmaps -t epp -w import-docmap-test -i '{ "docMapIndexUrl": "http://mock-datahub/enhanced-preprints/docmaps/v1/index" }'
```

This will kick of a full import for a docmap index from eLife's API.

To re-run the whole process, you will first need to remove the containers **and** volumes:

```shell
docker compose down --volumes
```

## Run an import workflow with a specified threshold

To prevent large reimport of docmaps that would cause content becoming unpublished, you can specify an optional numeric threshold for docmap changes that are allowed.

```shell
temporal workflow execute --type importDocmaps -t epp -w import-docmap-test -i '{ "docMapIndexUrl": "http://mock-datahub/enhanced-preprints/docmaps/v1/index", "docMapThreshold": 2 }'
```

## Run an import disabling xslt transforms

This can also be applied to the `importDocmap`, `importManuscriptData` and `importContent` workflows:

```shell
temporal workflow execute --type importDocmaps -t epp -w import-docmap-test -i '{ "docMapIndexUrl": "http://mock-datahub/enhanced-preprints/docmaps/v1/index", "workflowArgs": { "xsltTransformPassthrough": true } }'
```

## Run an import with an xslt blacklist

Sometimes we want to disable specific types of XSLT, e.g. handle-etal-in-refs.xsl (full list of options can be found in xsltLogs in Temporal). This can also be applied to the `importDocmap`, `importManuscriptData` and `importContent` workflows:

```shell
temporal workflow execute --type importDocmaps -t epp -w import-docmap-test -i '{ "docMapIndexUrl": "http://mock-datahub/enhanced-preprints/docmaps/v1/index", "workflowArgs": { "xsltBlacklist": "file1.xsl, file2.xsl" } }'
```

## Run an import preferring preprint content

This can also be applied to the `importDocmap`, `importManuscriptData` and `importContent` workflows:

```shell
temporal workflow execute --type importDocmaps -t epp -w import-docmap-test -i '{ "docMapIndexUrl": "http://mock-datahub/enhanced-preprints/docmaps/v1/index", "workflowArgs": { "preferPreprintContent": true } }'
```

## Run an import that purges the manuscript before importing

This option deletes all existing versions of a manuscript before importing, which can be useful for completely refreshing content instead of just updating it. This can be applied to the `importDocmap`, `importManuscriptData` and `importContent` workflows:

```shell
temporal workflow execute --type importDocmaps -t epp -w import-docmap-test -i '{ "docMapIndexUrl": "http://mock-datahub/enhanced-preprints/docmaps/v1/index", "workflowArgs": { "purgeBeforeImport": true } }'
```

## Run an import specifying a version of encoda

```shell
temporal workflow execute --type importDocmaps -t epp -w import-docmap-test -i '{ "docMapIndexUrl": "http://mock-datahub/enhanced-preprints/docmaps/v1/index", "workflowArgs": { "encodaDefaultVersion": "1.0.12" } }'
```

## Trigger the approval signal from CLI

Sometimes, due to issues with Temporal UI, we need to use command line to send a signal. You need to specify the target workflow id, name and input of the signal.

```shell
tctl workflow signal --workflow_id import-docmap-test --name approval -i true
```

## Run an import workflow with saved state

To run an import workflow that only imports docmaps that are new or have changed since a previous run, start an importDocmaps workflow with a [state file name](#state-file) as the second parameter and add a state file to minio:

```shell
temporal workflow execute --type importDocmaps -t epp -w import-docmap-test -i '{ "docMapIndexUrl": "http://mock-datahub/enhanced-preprints/docmaps/v1/index", "s3StateFileUrl": "state.json" }'
```

This will read in previously seen (and hashed) docmaps from the S3 bucket in config, skipping any it has seen before.

## Run an import workflow with saved state to a schedule

To kick of a full import for a docmap index from eLife's API, then loop itself every hour (see next command to change this), skipping docmaps that have no changes.

To change the sleep time, add a semantic time parameter to the `--interval` inputs, for example `1 minute` or `5 minutes`:

```shell
temporal schedule create --schedule-id import-docmaps -w import-docmaps -t epp --workflow-type importDocmaps -i '{ "docMapIndexUrl": "http://mock-datahub/enhanced-preprints/docmaps/v1/index", "s3StateFileUrl": "import-docmaps.json" }' --overlap-policy Skip --interval '1m'
```

You can then view these runs on the dashboard.

## Run with a local instance of the API

```shell
SERVER_DIR="../your-directory-here" docker compose -f docker-compose.yaml -f docker-compose.override.yaml -f docker-compose.localserver.yaml up
```

To start the application with a local version of the [`EPP API server`](https://github.com/elifesciences/enhanced-preprints-server), so you can run the application and test local changes of the API, you need to define an environment variable `SERVER_DIR` with the location of your EPP API server project, i.e. `SERVER_DIR="../enhanced-preprints-server"`, then run the above command to invoke the `.localserver` overrides. This will work with the first import workflow command.

To run with the local API but **without** the mocked services, omit `-f docker-compose.override.yaml` from the compose command.

## Run with a local instance of the API and App

```shell
SERVER_DIR="../enhanced-preprints-server" APP_DIR="../enhanced-preprints-client" docker compose -f docker-compose.yaml -f docker-compose.override.yaml -f docker-compose.localserver.yaml -f docker-compose.localapp.yaml up
```

## Run with a local instance of Encoda API

```shell
ENCODA_DIR="../enhanced-preprints-encoda" docker compose -f docker-compose.yaml -f docker-compose.override.yaml -f docker-compose.localencoda.yaml up
```

## Run with "real" S3 as a source

NOTE: this will only read meca files from the real S3, so you don't need to mock them out

Define a .env file with these variables:

```bash
MECA_AWS_ACCESS_KEY_ID=your access key
MECA_AWS_SECRET_ACCESS_KEY=your secret key
MECA_AWS_ROLE_ARN=a role to assume to have permission to source S3 buckets # optional
```

Then run docker-compose with the base, override and s3 configs, like below:

```shell
docker compose -f docker-compose.yaml -f docker-compose.override.yaml -f docker-compose.s3.yaml up
```

To import a specific docmap such as 85111 use the importDocmap workflow:

```shell
temporal workflow execute --type importDocmap -w import-docmap-85111 -t epp -i '{ "url": "https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=85111" }'
```

## Run with "real" S3 as a destination

NOTE: this will only write extract resources to the real S3, so you can verify that the process works

Define a .env file with these variables:

```bash
AWS_ACCESS_KEY_ID=your access key
AWS_SECRET_ACCESS_KEY=your secret key
BUCKET_NAME=you will want to create an S3 bucket for your dev experiments
```

Then run docker-compose with the base, override and s3 configs, like below:

```shell
docker compose -f docker-compose.yaml -f docker-compose.override.yaml -f docker-compose.s3-epp.yaml up
```

You can combine the s3 source and destination to allow for retrieval from s3 source and preparing the assets and uploading them to S3:

```shell
docker compose -f docker-compose.yaml -f docker-compose.override.yaml -f docker-compose.s3.yaml -f docker-compose.s3-epp.yaml up
```

## Run a full docmaps import

### Prerequisites

Before starting check with the production team a time to perform a full reimport.

Make sure you're using the appropriate AWS profile:
```shell
export AWS_DEFAULT_PROFILE=elife
```

### Instructions

Create example-state.json file with an empty array:
```shell
echo "[]" > example-state.json
```

Upload state file to S3:
```shell
aws s3 cp ./example-state.json s3://prod-elife-epp-data/automation/state/example-state.json
```

Check the number of docmaps to import:
```shell
curl --no-progress-meter https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/index | jq ".docmaps | length"
```

#### Create importDocmaps workflows for each batch of 1000 docmaps until workflow generation is complete

Visit: https://temporal.elifesciences.org/namespaces/epp--prod/workflows/start-workflow?workflowId=example-state-YYYY-MM-DD-HHMM&taskQueue=epp&workflowType=importDocmaps

Populate input data with:

```json
{
  "docMapIndexUrl": "https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/index",
  "end": 1000,
  "s3StateFileUrl": "example-state.json"
}
```

Click "Start Workflow"!

Visit the workflow just created.

Wait until `mergeDocmapState` appears in the Event History of the workflow's page in Temporal.

Check the number of items recorded in the state file. If this is less than the number of Docmaps create a new `importDocmaps` workflow:

```shell
aws s3 cp s3://prod-elife-epp-data/automation/state/example-state.json - | jq ". | length"
```

Once all `importDocmaps` workflows have been successfully created, monitor the progress of the import, visit:

https://temporal.elifesciences.org/namespaces/epp--prod/workflows?query=%60WorkflowType%60%3D%22importDocmap%22+AND+%60RootWorkflowId%60+STARTS_WITH+%22example-state%22

Time for a strong coffee and a croissant! :coffee: :croissant:

## Types of workflow

- `importContent` imports a version of an article as specified in the docmap file.
- `importDocmap` reads a docmap file and imports all versions of the article defined within that docmap file.
- `importManuscriptData` accepts the parsed docmap as input and imports all versions of the article defined.
- `importDocmaps` reads a docmap index and triggers a `importDocmap` workflow for each item in the index by default. If the docmap content is already known, a docmap's import may be skipped, as controlled by an optional s3 [state file](#state-file).

## State file
To find the name of the state file, in the temporal workflow input look for `"s3StateFileUrl": "example-docmap-elife-index.json"` in the configuration object.

To output contents of the state file in AWS cli:
```shell
aws s3 cp s3://prod-elife-epp-data/automation/state/example-docmap-elife-index.json
```

To count the items in the state file use:
```shell
aws s3 cp s3://prod-elife-epp-data/automation/state/example-docmap-elife-index.json - | jq ". | length"
```

To monitor the count of items in the state file:
```shell
watch -n 1 'aws s3 cp s3://prod-elife-epp-data/automation/state/example-docmap-elife-index.json - | jq ". | length"'
```

## Running tests with docker
To run the tests with docker (especially useful if they are not working locally) use the following command:
```shell
docker compose -f docker-compose.tests.yaml run tests
```
