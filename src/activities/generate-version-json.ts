import { Article } from '@stencila/schema';
import { GetObjectCommand, GetObjectCommandInput } from '@aws-sdk/client-s3';
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
  { importContentResult, msid, version }: { importContentResult: ImportContentOutput, msid: string, version: any }
) => Promise<EnhancedArticle>;

export const generateVersionJson: GenerateVersionJson = async ({ importContentResult, msid, version }) => {
  const s3 = getEPPS3Client();

  const getObjectCommandInput: GetObjectCommandInput = {
    Bucket: importContentResult.jsonContentFile.Bucket,
    Key: importContentResult.jsonContentFile.Key,
  };

  const json: string = await s3.send(new GetObjectCommand(getObjectCommandInput))
    .then((obj) => obj.Body?.transformToString() ?? '');

  const articleStruct = parseJsonContentToProcessedArticle(json);
  const versionJSON: EnhancedArticle = {
    msid,
    doi: version.doi,
    id: version.id,
    versionIdentifier: version.versionIdentifier,
    versionDoi: version.doi,
    article: articleStruct,
    preprintDoi: version.preprint.doi,
    preprintUrl: version.preprint.content,
    preprintPosted: version.preprint.publishedDate,
    sentForReview: version.sentForReviewDate,
    peerReview: importContentResult.reviewData ?? version.peerReview,
    published: version.publishedDate,
  };

  return versionJSON;
};
