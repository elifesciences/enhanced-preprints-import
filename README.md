# Enhanced Preprint import system

This is a repository for the temporal worker docker image for EPP.

This project facilitates asyncronous importing of content identified from a [docmap](https://docmaps.knowledgefutures.org/pub/sgkf1pqa) provider. We are using the docmaps to provide a feed of preprints that have been reviewed by a particular publisher. The data in the docmap provides the history and location of content, which we parse and retreive.

We then push the parsed content into an EPP server endpoint.

Finally, the results of all this retrieval is stored in an S3 bucket in well structure paths (which can then be configured as a source for a [canteloupe IIIF server](https://github.com/elifesciences/enhanced-preprints-image-server))

The monitoring and scheduling of the import workflows are handled by a [temporal server](https://temporal.io/) (and [temporalite](https://github.com/temporalio/temporalite) is used for testing and dev).

# Getting started

Ensure you have docker and docker-compose (v2 tested). Also install [`tctl`](https://github.com/temporalio/tctl) to start and control jobs

- clone the repo
- run `docker-compose up` to start temporalite and the worker in "watch" mode
- run `tctl n desc` to list namespaces, you should see default namespace listed, and not any other error.

# Development

The `docker-compose` workflow above will restart the worker when your mounted filesystem changes, but you may find it helpful if developing locally to install the depenedancies by running:

```
yarn install
```

# Run an import workflow

To run an import workflow, run:

```
tctl wf run -tq epp -wt importDocmaps --input '["http://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v1/index"]'
```

This will kick of a full import for a docmap index from eLife's API.
