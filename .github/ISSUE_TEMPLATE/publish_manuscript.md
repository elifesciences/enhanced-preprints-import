---
name: Publish manuscript
about: Use this template for tracking publication of manuscripts.
title: "MSID: %%msid%% Version: %%version%% DOI: %%preprint-doi%%"
labels: 
assignees: 
---

## Step 1. Awaiting reviews

Editorial to post reviews via hypothesis

Useful links:
- DocMap: https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=%%msid%%
- New model tracking: https://docs.google.com/spreadsheets/d/1_fHaoOy7hjyocptKtVJRijeNpUY4hBS7Ck_aVmx6ZJk/
- Reviews on sciety: https://sciety.org/articles/activity/%%preprint-doi%%

For trouble shooting (e.g. no Docmaps available):
- DocMap issue addressing: https://miro.com/app/board/uXjVNCwK6EI=/
- Explore DataHub DocMaps API: https://lookerstudio.google.com/reporting/4c2f0368-babb-4beb-b5b3-497e7e7b0f08/page/ejphD
- Unmatched submissions and preprints: https://lookerstudio.google.com/u/0/reporting/9f86204f-3bf7-477c-9b18-5c5ef141bf69/page/p_gxi57ha93c
- Unmatched manuscripts spreadsheet: https://docs.google.com/spreadsheets/d/15QcK8w-ssB7109RQEDtFpJPZ0J5HTGxoHa_2TtpMBbg/edit#gid=1336081641


## Step 2. Preview reviewed preprint

Production QC content ahead of publication

Instructions:
- QC preview: https://prod--epp.elifesciences.org/previews/%%msid%%v%%version%%
- Update ticket with any problems (add `blocked` label)
- Add publication date and time to https://docs.google.com/spreadsheets/d/1amAlKvdLcaDp5W8Z8g77NmkwbMF5n_u89ArSqPMO8jg
- Move card to next column
- (At end of the day post link in [#enhanced-preprint](https://elifesciences.slack.com/archives/C03EVJSUA77) and ask for PDF to be generated) 

Useful links:
- Preprint DOI :  https://doi.org/%%preprint-doi%%
- Confirm reviews returned by EPP: https://prod--epp.elifesciences.org/api/reviewed-preprints/%%msid%%/v%%version%%/reviews
- To update the MECA path in the docmap: https://docs.google.com/spreadsheets/d/1mctCQuNFBjSn97Lihy7_vBO6z7-N-oqyLv4clyi6zHg


## Step 3: Awaiting search reindex

- This step adds the reviewed preprint to the homepage: https://elifesciences.org

The search reindex is triggered once an hour. We need the reviewed preprint to be indexed as the search application serves the journal homepage.

Useful links:
- Jenkins pipeline to reindex search can be triggered sooner or monitored here: https://alfred.elifesciences.org/job/process/job/process-reindex-reviewed-preprints/


## Step 4: Published! PDF requested

- Waiting for PDF to be generated

Useful links:
- PDF tracking: https://docs.google.com/spreadsheets/d/106_XeDjmuBae7gexOTNzg60lapeqjl2aRn9DzupGyS8/

## Step 5: Introduce PDF to data folder and git repo

Detailed instructions: https://github.com/elifesciences/enhanced-preprints-data#add-a-pdf

## Step 6: Add PDF url to manuscripts.json

- Pull request created to [enhanced-preprint-client](https://github.com/elifesciences/enhanced-preprints-client/pulls)

<details>
<summary>Instructions to add PDF url to manuscripts.json</summary>

- Visit: https://github.com/elifesciences/enhanced-preprints-client/actions/workflows/add-pdf-url-to-manuscript.yaml
- Click: Run workflow
- Complete the form and click "Run workflow"
- A successful run should result in a new pull request at https://github.com/elifesciences/enhanced-preprints-client/pulls
- Open the pull request and click the "Ready for review" button to trigger tests
- Once the tests pass and you are happy with the changes the PR can be merged

Example pull request: https://github.com/elifesciences/enhanced-preprints-client/pull/397/files

Once the pull request is merged in it should be available a few minutes later.

</details>

## Step 9: Done!

- [ ] Kettle is on!
