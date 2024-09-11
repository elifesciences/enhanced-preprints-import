import { Article } from '@stencila/schema';
import { GetObjectCommand, GetObjectCommandInput, PutObjectCommand } from '@aws-sdk/client-s3';
import { Context } from '@temporalio/activity';
import { parser, VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { S3File, constructEPPVersionS3FilePath, getEPPS3Client } from '../S3Bucket';
import { EnhancedArticle } from './send-version-to-epp';
import { ImportContentOutput } from '../workflows/import-content';
import { NonRetryableError } from '../errors';

const parseJsonContentToProcessedArticle = (content: string) => {
  const contentStruct = JSON.parse(content) as Article;
  return {
    title: contentStruct.title,
    authors: contentStruct.authors,
    abstract: contentStruct.description,
    licenses: contentStruct.licenses,
    content: contentStruct.content,
    references: contentStruct.references,
    ...(contentStruct.meta ? { meta: contentStruct.meta } : {}),
  };
};

type GenerateVersionJson = (
  {
    importContentResult, msid, version, manuscript,
  }: { importContentResult: ImportContentOutput, msid: string, version: VersionedReviewedPreprint, manuscript?: parser.Manuscript }
) => Promise<S3File>;

export const generateVersionJson: GenerateVersionJson = async ({
  importContentResult, msid, version, manuscript,
}) => {
  if (version.preprint.publishedDate === undefined) {
    throw new NonRetryableError("Preprint doesn't have a published date");
  }

  if (version.preprint.url === undefined && version.preprint.doi === undefined) {
    throw new NonRetryableError("Preprint doesn't have a URL or doi");
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
    preprintUrl: version.preprint.url ?? version.preprint.doi,
    preprintPosted: version.preprint.publishedDate,
    sentForReview: version.sentForReviewDate,
    peerReview: importContentResult.reviewData,
    published: version.publishedDate ?? null,
    volume: manuscript?.volume,
    eLocationId: manuscript?.eLocationId,
    subjects: manuscript?.subjects,
    relatedContent: manuscript?.relatedContent?.map(({
      type,
      title,
      url,
      description,
      thumbnail,
    }) => ({
      type,
      title,
      url,
      content: description,
      imageUrl: thumbnail,
    })),
    publishedYear: manuscript?.publishedDate ? new Date(manuscript.publishedDate).getFullYear() : undefined,
    license: version.license,
  };

  Context.current().heartbeat('storing generated EPP JSON');
  const destination = constructEPPVersionS3FilePath('payload.json', version);
  await s3.send(new PutObjectCommand({
    Bucket: destination.Bucket,
    Key: destination.Key,
    Body: JSON.stringify(versionJSON),
  }));

  return destination;
};
