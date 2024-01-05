---
name: Publish manuscript
about: Use this template for tracking publication of manuscripts.
title: "MSID: %%msid%% Version: %%version%% DOI: %%doi-suffix%%"
labels: 
assignees: 
---

[PLACE MANUSCRIPT AND EDITOR DETAILS HERE WHEN AVAILABLE] See step 3

[PLACE PDF URL HERE WHEN AVAILABLE] See step 7

## Step 1. Inform bioRxiv

Who can help: @QueenKraken, @nlisgo, @scottaubrey

- [ ] Manuscript is in data hub index (https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v2/by-publisher/elife/get-by-manuscript-id?manuscript_id=%%msid%%)

or (only one should be ticked. remove other from description.)

- [ ] Confirmed with Ted at bioRxiv that MECA archive is available

Send the following email to Ted and wait for his reply.

```
Hi Ted,

Please can you prepare the preprint MECA for %%doi-prefix%%/%%doi-suffix%%%%doi-suffix2%%

Thanks
```

## Step 2. Create preview of manuscript

Who can help: @fred-atherden, @nlisgo, @scottaubrey

- [ ] Manuscript is available for preview (https://prod--epp.elifesciences.org/previews/%%msid%%v%%version%%)
    - [ ] Trigger import for staging: https://prod--epp.elifesciences.org/import
    - [ ] Sync data folder with s3://prod-elife-epp-data/data
    - [ ] Trigger import for staging: https://staging--epp.elifesciences.org/import
    - [ ] Sync data folder with s3://staging-elife-epp-data/data
    - [ ] Pull request created to [enhanced-preprint-data](https://github.com/elifesciences/enhanced-preprints-data/pulls)
    - [ ] Post link to pull request below

Pull request: [PLACE LINK TO PULL REQUEST HERE]

Detailed instructions: https://github.com/elifesciences/enhanced-preprints-data#add-a-manuscript

## Step 3: Awaiting public reviews and QC

Who can help: Production team

- [ ] QC passed or QC not needed

Who can help: Editorial team

- [ ] Public reviews available on sciety (https://sciety.org/articles/activity/%%doi-prefix%%/%%doi-suffix%%)
- [ ] Manuscript and editor details at the top of this issue (Supplied by Editorial team)
- [ ] Reviews returned by EPP - https://prod--epp.elifesciences.org/api/reviewed-preprints/%%msid%%/v%%version%%/reviews

<details>
<summary>Example</summary>

```
"msas": "Genetics and Genomics", "Neuroscience"
"msid": "84628"
"version": "1"
"preprintDoi": "10.1101/2022.10.28.514241"
"articleType": "Reviewed Preprint"
"status": "Published from the original preprint after peer review and assessment by eLife."

"Reviewed Preprint posted": "2023-01-02"
"Sent for peer review": "2022-10-28"
"Posted to bioRxiv": "2022-11-21" (link: "Go to bioRxiv": "https://www.biorxiv.org/content/10.1101/2022.10.28.514241v1")

Editors:
Reviewing Editor
Michael B Eisen
University of California, Berkeley, United States
Senior Editor
Michael B Eisen
University of California, Berkeley, United States
```

</details>

## Step 4: Modify manuscripts.json (no PDF)

- [ ] Reviewed preprint is published to EPP (https://elifesciences.org/reviewed-preprints/%%msid%%)
    - [ ] Pull request created to [enhanced-preprint-client](https://github.com/elifesciences/enhanced-preprints-client/pulls)
    - [ ] Pull request switched to "Ready for review"
    - [ ] Post link to pull request below
- [ ] Request that a doi be registered
    - [ ] Post link to [#enhanced-preprint](https://elifesciences.slack.com/archives/C03EVJSUA77) comment below

Pull request: [PLACE LINK TO PULL REQUEST HERE]
[#enhanced-preprint](https://elifesciences.slack.com/archives/C03EVJSUA77) comment thread: [PLACE LINK TO COMMENT HERE]

<details>
<summary>Instructions to modify manuscripts.json</summary>

- Visit: https://github.com/elifesciences/enhanced-preprints-client/actions/workflows/publish-manuscript.yaml
- Click: Run workflow
- Complete the form and click "Run workflow"
- A successful run should result in a new pull request at https://github.com/elifesciences/enhanced-preprints-client/pulls
- Open the pull request and click the "Ready for review" button to trigger tests
- Once the tests pass and you are happy with the changes the PR can be merged

Example pull request: https://github.com/elifesciences/enhanced-preprints-client/pull/334/files

Once the pull request is merged in it should be available a few minutes later.

</details>

### Request that a doi

Post the following in [#enhanced-preprint](https://elifesciences.slack.com/archives/C03EVJSUA77):

```
@Fred can you register a doi for https://elifesciences.org/reviewed-preprints/%%msid%%
```

## Step 5: Awaiting search reindex

- [ ] Reviewed preprint is avaliable on journal homepage (https://elifesciences.org)

The search reindex is triggered once an hour. We need the reviewed preprint to be indexed as the search application serves the journal homepage.

<details>
<summary>Additional info</summary>

If needed, the jenkins pipeline to reindex search can be triggered sooner.

https://alfred.elifesciences.org/job/process/job/process-reindex-reviewed-preprints/

</details>

## Step 6: Published! Request PDF generation

- [ ] Post the link to the PDF url at the top of the issue
    - [ ] Post link to [#enhanced-preprint](https://elifesciences.slack.com/archives/C03EVJSUA77) comment below

[#enhanced-preprint](https://elifesciences.slack.com/archives/C03EVJSUA77) comment thread: [PLACE LINK TO COMMENT HERE]

Post the following to the [#enhanced-preprint](https://elifesciences.slack.com/archives/C03EVJSUA77) on slack:

```
@Ryan Dix-Peek please can you generate a PDF for https://elifesciences.org/reviewed-preprints/%%msid%%
```

## Step 7: Introduce PDF to data folder and git repo

- [ ] PDF is avaliable at https://github.com/elifesciences/enhanced-preprints-data/raw/master/data/%%msid%%/v%%version%%/%%msid%%-v%%version%%.pdf

Detailed instructions: https://github.com/elifesciences/enhanced-preprints-data#add-a-pdf

## Step 8: Add PDF url to manuscripts.json

- [ ] Reviewed preprint PDF is available for download (https://prod--epp.elifesciences.org/reviewed-preprints/%%msid%%)
    - [ ] Pull request created to [enhanced-preprint-client](https://github.com/elifesciences/enhanced-preprints-client/pulls)
    - [ ] Pull request switched to "Ready for review"
    - [ ] Post link to pull request below

[PLACE LINK TO PULL REQUEST HERE]

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
