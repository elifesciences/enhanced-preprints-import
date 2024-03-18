# Enhanced Preprint import system

This is a repository for the temporal worker docker image for EPP.

This project facilitates asynchronous importing of content identified from a [docmap](https://docmaps.knowledgefutures.org/pub/sgkf1pqa) provider. We are using the docmaps to provide a feed of preprints that have been reviewed by a particular publisher. The data in the docmap provides the history and location of content, which we parse and retrieve.

We then push the parsed content into an EPP server endpoint.

Finally, the results of all this retrieval is stored in an S3 bucket in well structure paths (which can then be configured as a source for a [canteloupe IIIF server](https://github.com/elifesciences/enhanced-preprints-image-server))

The monitoring and scheduling of the import workflows are handled by a [temporal server](https://temporal.io/)testing and dev).

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

## Run an import workflow with saved state

To run an import workflow that only imports docmaps that are new or have changed since a previous run (or to store a first run), start an importDocmaps workflow with a state file name as the second parameter:

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
temporal workflow execute --type importDocmap -w import-docmap-85111 -t epp -i '"https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=85111"'
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

## Running tests with docker
To run the tests with docker (especially useful if they are not working locally) use the following command:
```shell
docker compose -f docker-compose.tests.yaml run tests
```
