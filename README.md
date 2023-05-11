# Enhanced Preprint import system

This is a repository for the temporal worker docker image for EPP.

This project facilitates asynchronous importing of content identified from a [docmap](https://docmaps.knowledgefutures.org/pub/sgkf1pqa) provider. We are using the docmaps to provide a feed of preprints that have been reviewed by a particular publisher. The data in the docmap provides the history and location of content, which we parse and retreive.

We then push the parsed content into an EPP server endpoint.

Finally, the results of all this retrieval is stored in an S3 bucket in well structure paths (which can then be configured as a source for a [canteloupe IIIF server](https://github.com/elifesciences/enhanced-preprints-image-server))

The monitoring and scheduling of the import workflows are handled by a [temporal server](https://temporal.io/) (and [temporalite](https://github.com/temporalio/temporalite) is used for testing and dev).

# Getting started

Ensure you have docker and docker-compose (v2 tested). Also install [`tctl`](https://github.com/temporalio/tctl) to start and control jobs

- clone the repo
- run `yarn`
- run `docker compose up` to start temporalite and the worker in "watch" mode
- run `tctl n desc` to list namespaces, you should see default namespace listed, and not any other error.

The `docker compose` workflow above will restart the worker when your mounted filesystem changes.

## Run a single import workflow

To run an import workflow, run:

```shell
tctl wf run -tq epp -wt importDocmaps -wid docmap-index-poll -i '"http://mock-datahub/enhanced-preprints/docmaps/v1/index"' 
```

This will kick of a full import for a docmap index from eLife's API.

To re-run the whole process, you will first need to remove the containers **and** volumes:

```shell
docker compose down --volumes
```

## Run a looped import workflow

To run a looped import workflow, run:

```shell
tctl wf run -tq epp -wt loopTimer -wid loop-timer -i '"http://mock-datahub/enhanced-preprints/docmaps/v1/index"' 
```

This will kick of a full import for a docmap index from eLife's API, then loop itself every hour (see next command to change this), skipping docmaps that have no changes.

To change the sleep time, add a semantic time parameter to the `--input`, for example `1 minute` or `5 minutes`:

```shell
tctl wf run -tq epp -wt loopTimer -wid loop-timer -i '"http://mock-datahub/enhanced-preprints/docmaps/v1/index"' -i '"1 minute"' 
```

## Run without mocked services

Alternatively, run the following `docker compose` to avoid the overriding mocked services.

```shell
docker compose -f docker-compose.yaml up
```

Then you can use the following tctl command instead:

```shell
tctl wf run -tq epp -wt importDocmaps -wid docmap-index-poll -i '"http://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v1/index"' 
```

## Run with a local instance of the API

```shell
SERVER_DIR="../your-directory-here" docker compose -f docker-compose.yaml -f docker-compose.override.yaml -f docker-compose.localserver.yaml up
```

To start the application with a local version of the [`EPP API server`](https://github.com/elifesciences/enhanced-preprints-server), so you can run the application and test local changes of the API, you need to define an environment variable `SERVER_DIR` with the location of your EPP API server project, i.e. `SERVER_DIR="../enhanced-preprints-server"`, then run the above command to invoke the `.localserver` overrides. This will work with the first import workflow command.

To run with the local API but **without** the mocked services, omit `-f docker-compose.override.yaml` from the compose command.
