import { Heading as HeadingContent } from '@stencila/schema/dist/src/types';
import { Article } from '@stencila/schema';
import { GetObjectCommand, GetObjectCommandInput } from '@aws-sdk/client-s3';
import { getS3Client } from '../S3Bucket';
import { Content, EnhancedArticle, Heading } from './send-version-to-epp';
import { ImportContentOutput } from '../workflows/import-content';

const isHeadingContent = (content: Content): content is HeadingContent => !Array.isArray(content) && typeof content === 'object' && content?.type === 'Heading';

const extractHeadingContentPart = (contentPart: Content): HeadingContent[] => {
  if (isHeadingContent(contentPart)) {
    return [contentPart];
  }

  if (Array.isArray(contentPart)) {
    return contentPart.flatMap(extractHeadingContentPart);
  }

  return [];
};
const extractHeadings = (content: Content): Heading[] => {
  const headingContentParts = extractHeadingContentPart(content);

  return headingContentParts.map((heading, index) => ({
    id: (!heading.id || heading.id === '') ? `gen_header_${index}` : heading.id,
    text: heading.content,
  }));
};

const parseJsonContentToProcessedArticle = (content: string) => {
  const contentStruct = JSON.parse(content) as Article;
  return {
    title: contentStruct.title,
    authors: contentStruct.authors,
    abstract: contentStruct.description,
    licenses: contentStruct.licenses,
    content: contentStruct.content,
    headings: contentStruct.content ? extractHeadings(contentStruct.content) : [],
    references: contentStruct.references,
  };
};

type GenerateVersionJson = (
  { importContentResult, msid, version }: { importContentResult: ImportContentOutput, msid: string, version: any }
) => Promise<EnhancedArticle>;

export const generateVersionJson: GenerateVersionJson = async ({ importContentResult, msid, version }) => {
  const s3 = getS3Client();

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
