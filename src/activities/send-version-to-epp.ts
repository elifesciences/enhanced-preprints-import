import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import axios from 'axios';
import { Article, Node, Heading as HeadingContent } from '@stencila/schema';
import { config } from '../config';
import { getS3Client, S3File } from '../S3Bucket';
import { EPPPeerReview } from './fetch-review-content';

type EPPImportResponse = {
  result: boolean,
  message: string,
};

type Content = Array<Node> | Node;

type Heading = {
  id: string,
  text: Content,
};

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

type SendVersionToEPPImput = {
  msid: string,
  version: VersionedReviewedPreprint,
  contentJsonPath: S3File,
  doi?: string,
  reviewData?: EPPPeerReview
};

export const sendVersionToEpp = async ({
  contentJsonPath,
  msid,
  version,
  doi,
  reviewData,
}: SendVersionToEPPImput): Promise<boolean> => {
  const s3 = getS3Client();
  const readJsonStream = await s3.getObject(contentJsonPath.Bucket, contentJsonPath.Key);
  let json = '';
  // eslint-disable-next-line no-restricted-syntax
  for await (const chunk of readJsonStream) {
    json += chunk;
  }
  const articleStruct = parseJsonContentToProcessedArticle(json);

  const versionImportUri = `${config.eppServerUri}/import-version`;
  try {
    const { result, message } = await axios.post<EPPImportResponse>(versionImportUri, {
      msid,
      doi,
      id: version.id,
      versionIdentifier: version.versionIdentifier,
      versionDoi: version.doi,
      article: articleStruct,
      preprintDoi: version.preprint.doi,
      preprintUrl: version.preprint.content,
      preprintPosted: version.preprint.publishedDate,
      sentForReview: version.sentForReviewDate,
      peerReview: reviewData ?? version.peerReview,
      published: version.publishedDate,
    }).then(async (response) => response.data);
    if (!result) {
      throw new Error(`Failed to import version to EPP: ${message}`);
    }
    return result;
  } catch (error: any) {
    throw new Error(`Failed to import version to EPP: ${error.response.data.message}`);
  }
};
