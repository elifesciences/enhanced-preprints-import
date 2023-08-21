import { Article } from '@stencila/schema';
import { GetObjectCommand, GetObjectCommandInput } from '@aws-sdk/client-s3';
import { Context } from '@temporalio/activity';
import { Manuscript, VersionedReviewedPreprint } from '@elifesciences/docmap-ts/dist/docmap-parser';
import { getEPPS3Client } from '../S3Bucket';
import { EnhancedArticle } from './send-version-to-epp';
import { ImportContentOutput } from '../workflows/import-content';

const parseJsonContentToProcessedArticle = (content: string) => {
  const contentStruct = JSON.parse(content) as Article;
  return {
    title: contentStruct.title,
    authors: contentStruct.authors,
    abstract: contentStruct.description,
    licenses: contentStruct.licenses,
    content: contentStruct.content,
    references: contentStruct.references,
  };
};

type GenerateVersionJson = (
  {
    importContentResult, msid, version, manuscript,
  }: { importContentResult: ImportContentOutput, msid: string, version: VersionedReviewedPreprint, manuscript?: Manuscript }
) => Promise<EnhancedArticle>;

export const generateVersionJson: GenerateVersionJson = async ({
  importContentResult, msid, version, manuscript,
}) => {
  if (version.preprint.publishedDate === undefined) {
    throw new Error("Preprint doesn't have a published date");
  }

  if (version.preprint.url === undefined) {
    throw new Error("Preprint doesn't have a URL");
  }

  const s3 = getEPPS3Client();

  const getObjectCommandInput: GetObjectCommandInput = {
    Bucket: importContentResult.jsonContentFile.Bucket,
    Key: importContentResult.jsonContentFile.Key,
  };

  Context.current().heartbeat('Fetching article JSON');
  const json: string = await s3.send(new GetObjectCommand(getObjectCommandInput))
    .then((obj) => obj.Body?.transformToString() ?? '');

  Context.current().heartbeat('Generating version JSON');
  const articleStruct = parseJsonContentToProcessedArticle(json);
  const versionJSON: EnhancedArticle = {
    msid,
    doi: version.doi,
    id: `${version.id}v${version.versionIdentifier}`, // construct a global version ID from concat of id and version-specific ID
    versionIdentifier: version.versionIdentifier,
    versionDoi: version.doi,
    article: articleStruct,
    preprintDoi: version.preprint.doi,
    preprintUrl: version.preprint.url,
    preprintPosted: version.preprint.publishedDate,
    sentForReview: version.sentForReviewDate,
    peerReview: importContentResult.reviewData,
    published: version.publishedDate,
    volume: manuscript?.volume,
    eLocationId: manuscript?.eLocationId,
    subjects: manuscript?.subjects,
  };

  return versionJSON;
};
