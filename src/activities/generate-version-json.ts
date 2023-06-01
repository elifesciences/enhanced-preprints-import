import { Article } from '@stencila/schema';
import { GetObjectCommand, GetObjectCommandInput } from '@aws-sdk/client-s3';
import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { getS3Client } from '../S3Bucket';
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
  { importContentResult, version }: { importContentResult: ImportContentOutput, version: VersionedReviewedPreprint }
) => Promise<EnhancedArticle>;

export const generateVersionJson: GenerateVersionJson = async ({ importContentResult, version }) => {
  const s3 = getS3Client();

  const getObjectCommandInput: GetObjectCommandInput = {
    Bucket: importContentResult.jsonContentFile.Bucket,
    Key: importContentResult.jsonContentFile.Key,
  };

  const json: string = await s3.send(new GetObjectCommand(getObjectCommandInput))
    .then((obj) => obj.Body?.transformToString() ?? '');

  const articleStruct = parseJsonContentToProcessedArticle(json);
  const msid = `${version.doi.split('/').pop()}v${version.versionIdentifier}`;
  const versionJSON: EnhancedArticle = {
    msid,
    doi: version.doi,
    id: version.id,
    versionIdentifier: version.versionIdentifier,
    versionDoi: version.doi,
    article: articleStruct,
    preprintDoi: version.preprint.doi,
    preprintUrl: version.preprint.content ?? '',
    preprintPosted: version.preprint.publishedDate ?? new Date(),
    sentForReview: version.sentForReviewDate,
    peerReview: importContentResult.reviewData ?? version.peerReview,
    published: version.publishedDate,
  };

  return versionJSON;
};
