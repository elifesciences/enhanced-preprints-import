#!/bin/bash

## This script will construct a correct docmap_url for eLife's docmap API, check the URL returns a 200 status, then construct
## and run the correct command using `temporal` cli tool to start the import workflow
##

## To use it:
## 1. Create a connection to the temporal server (for example, using kubernetes port-forwarding)
## 2. (optionally) export env vars TEMPORAL_ADDRESS to point to the address for the temporal GRPC service (e.g. localhost:7233)
## 3. run `./scripts/import-elife-docmap.sh {ManuscriptId}`
##
## Optionally, you can also provide a non-default workflow ID prefix as the second parameter. The docmap has will be appended to this string
## `./scripts/import-elife-docmap.sh "12345" "manual-import-2024-02-05-"`
##
## If the second parameter is epp--prod or epp--staging, it will be used as the namespace and the workflow ID will be the 3rd parameter
## `./scripts/import-elife-docmap.sh "12345" "epp--staging"` or
## `./scripts/import-elife-docmap.sh "12345" "epp--staging" "manual-import-2024-02-05-"`

namespace=${2:-"epp--prod"}
workflow_id_prefix=${3:-"docmap-"}

if [[ "$namespace" != "epp--prod" && "$namespace" != "epp--staging" ]]; then
  workflow_id_prefix="$namespace"
  namespace="epp--prod"
fi

if [[ "$namespace" == "epp--staging" ]]; then
  docmap_api_manuscript_prefix=https://data-hub-api--stg.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=
else
  docmap_api_manuscript_prefix=https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=
fi

if [ -z "$1" ]; then
  echo "No manuscript-id supplied"
  exit 1
fi

docmap_url="$docmap_api_manuscript_prefix$1"

if ! curl -sf $docmap_url > /dev/null; then
  echo "manuscript-id request failed to find docmap at $docmap_url"
  exit 2
fi

# Determine the appropriate md5 command based on the operating system
if command -v md5 >/dev/null 2>&1; then
    # macOS
    docmap_id_hash="$(echo -n $docmap_url | md5)"
elif command -v md5sum >/dev/null 2>&1; then
    # Ubuntu
    docmap_id_hash="$(echo -n $docmap_url | md5sum | awk '{print $1}')"
else
    echo "md5 or md5sum command not found"
    exit 3
fi

temporal workflow start -n "$namespace" --type importDocmap  -i '"'$docmap_url'"' -t 'epp' -w "$workflow_id_prefix$docmap_id_hash" --id-reuse-policy=TerminateIfRunning
