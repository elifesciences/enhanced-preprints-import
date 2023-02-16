---
name: Publish manuscript
about: Use this template for tracking publication of manuscripts.
title: "MSID %%msid%% DOI %%doi-suffix%%"
labels: 
assignees: 
---

[PLACE MANUSCRIPT AND EDITOR DETAILS HERE WHEN AVAILABLE] See step 3

[PLACE PDF URL HERE WHEN AVAILABLE] See step 7

## Step 1. Inform bioRxiv

Who can help: @QueenKraken, @nlisgo, @scottaubrey

- [ ] Manuscript is in data hub index (https://data-hub-api.elifesciences.org/enhanced-preprints/docmaps/v1/get-by-doi?preprint_doi=%%doi-prefix%%%2F%%doi-suffix%%)

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

- [ ] Manuscript is available for preview (https://prod--epp.elifesciences.org/preview/%%doi-prefix%%/%%doi-suffix%%)
    - [ ] Pull request created to [enhanced-preprint-data](https://github.com/elifesciences/enhanced-preprints-data/pulls)
    - [ ] Post link to pull request below

Pull request: [PLACE LINK TO PULL REQUEST HERE]

<details>
<summary>Instructions</summary>

```
$ git clone git@github.com:elifesciences/enhanced-preprints-data.git
$ cd enhanced-preprints-data
$ git checkout -b import-%%doi-suffix%% origin/master
$ ./scripts/fetch_meca_archive.sh %%doi-suffix%% incoming/
$ ./scripts/extract_mecas.sh incoming/ data/
$ rm -rf incoming/
$ git add .
$ git commit -m 'import-%%doi-suffix%%'
$ git push -u origin import-%%doi-suffix%%
```

Create pull request: https://github.com/elifesciences/enhance/compare/master...import-%%doi-suffix%%

Merge in after CI passes and reviewing changes.

Manuscript should be available for preview shortly afterwards.

an example with multiple:

```
$ for doi in 2022.06.17.496451 2022.10.29.514266; do ./scripts/fetch_meca_archive.sh $doi incoming/; done
$ ./scripts/extract_mecas.sh incoming/ data/
$ rm -rf incoming/
$ for doi in 2022.06.17.496451 2022.10.29.514266; do git checkout --no-track -b "import-$doi" origin/master; git add data/10.1101/$doi/.; git commit -m "import-$doi"; git push origin "import-$doi"; done; git checkout master;
```
</details>

## Step 3: Awaiting public reviews

Who can help: Editorial team

- [ ] Public reviews available on sciety (https://sciety.org/articles/activity/%%doi-prefix%%/%%doi-suffix%%)
- [ ] Manuscript and editor details at the top of this issue (Supplied by Editorial team)

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

## Step 4: Request DocMap creation

- [ ] DocMap prepared by sciety
    - [ ] Post link to [#sciety-general](https://elifesciences.slack.com/archives/C011EQLKP51) comment below

[#sciety-general](https://elifesciences.slack.com/archives/C011EQLKP51) comment thread: [PLACE LINK TO COMMENT HERE]

Post the following to the [#sciety-general](https://elifesciences.slack.com/archives/C011EQLKP51) on slack:

```
Please can you provide a DocMap for:

- https://github.com/%%repo%%/issues/%%issue-id%% (%%doi-prefix%%/%%doi-suffix%%)

Thank you
```

## Step 5: Modify manuscripts.json (no PDF)

- [ ] Reviewed preprint is published to EPP (https://prod--epp.elifesciences.org/reviewed-preprints/%%msid%%)
    - [ ] Pull request created to [enhanced-preprint-client](https://github.com/elifesciences/enhanced-preprints-client/pulls)
    - [ ] Post link to pull request below

Pull request: [PLACE LINK TO PULL REQUEST HERE]

<details>
<summary>Instructions</summary>

- Visit: https://github.com/elifesciences/enhanced-preprints-client/actions/workflows/publish-manuscript.yaml
- Click: Run workflow
- Complete the form and click Run workflow
- A successful run should result in a new workflow at https://github.com/elifesciences/enhanced-preprints-client/pulls

Example pull request: https://github.com/elifesciences/enhanced-preprints-client/pull/334/files

Once the pull request is merged in it should be available a few minutes later.

</details>

## Step 6: Awaiting search reindex

- [ ] Reviewed preprint is avaliable on journal homepage (https://elifesciences.org)

The search reindex is triggered once an hour. We need the reviewed preprint to be indexed as the search application serves the journal homepage.

<details>
<summary>Additional info</summary>

If needed, the jenkins pipeline to reindex search can be triggered sooner.

https://alfred.elifesciences.org/job/process/job/process-reindex-reviewed-preprints/

</details>

## Step 7: Published! Request PDF generation

- [ ] Post the link to the PDF url at the top of the issue
    - [ ] Post link to [#sciety-general](https://elifesciences.slack.com/archives/C011EQLKP51) comment below

[#sciety-general](https://elifesciences.slack.com/archives/C011EQLKP51) comment thread: [PLACE LINK TO COMMENT HERE]

Post the following to the [#enhanced-preprint](https://elifesciences.slack.com/archives/C03EVJSUA77) on slack:

```
@Ryan Dix-Peek please can you generate a PDF for https://elifesciences.org/reviewed-preprints/%%msid%%
```

## Step 8: Add PDF to git repo

- [ ] PDF is avaliable at https://github.com/elifesciences/enhanced-preprints-data/raw/master/data/%%doi-prefix%%/%%doi-suffix%%/%%doi-suffix%%.pdf

<details>
<summary>Instructions</summary>

Download the PDF and rename to `%%doi-suffix%%.pdf`
Goto: https://github.com/elifesciences/enhanced-preprints-data/upload/master/data/%%doi-prefix%%/%%doi-suffix%%
Upload the file `%%doi-suffix%%.pdf` and commit directly to the master branch

</details>

## Step 9: Add PDF url to manuscripts.json

- [ ] Reviewed preprint PDF is available for download (https://prod--epp.elifesciences.org/reviewed-preprints/%%msid%%)
    - [ ] Pull request created to [enhanced-preprint-client](https://github.com/elifesciences/enhanced-preprints-client/pulls)
    - [ ] Post link to pull request below

[PLACE LINK TO PULL REQUEST HERE]

<details>
<summary>Instructions</summary>

Visit: https://github.com/elifesciences/enhanced-preprints-client/edit/master/manuscripts.json
Introduce the following in the `preprints > %%doi-prefix%%/%%doi-suffix%%` block:

```
"pdfUrl": "https://github.com/elifesciences/enhanced-preprints-data/raw/master/data/%%doi-prefix%%/%%doi-suffix%%/%%doi-suffix%%.pdf"
```

Example pull request: https://github.com/elifesciences/enhanced-preprints-client/pull/379/files

Create a new branch for this commit and start a pull request.

We are working on a github action to allow anyone to create the pull request.

Once the pull request is merged in it should be available a few minutes later.

</details>

## Step 10: Done!

- [ ] Kettle is on!
