import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Context } from '@temporalio/activity';
import { VersionedPreprint } from '@elifesciences/docmap-ts';
import { S3File, constructEPPVersionS3FilePath, getEPPS3Client } from '../S3Bucket';
import { ExternalVersionSummary } from './send-version-to-epp';
import { NonRetryableError } from '../errors';

type GenerateVersionSummaryJson = (
  {
    msid, version,
  }: { msid: string, version: VersionedPreprint }
) => Promise<S3File>;

export const generateVersionSummaryJson: GenerateVersionSummaryJson = async ({
  msid, version,
}) => {
  if (version.publishedDate === undefined) {
    throw new NonRetryableError("Preprint doesn't have a published date");
  }

  const contentUrl = version.content?.find((url) => url.startsWith('http')) ?? version.url;
  if (contentUrl === undefined) {
    throw new NonRetryableError("Preprint doesn't have a content URL");
  }

  const s3 = getEPPS3Client();

  Context.current().heartbeat('Generating version summary JSON');
  const corrections = version.corrections ? version.corrections.reduce<{ date: Date, content: string }[]>((acc, current) => {
    if (current.content && current.content[0] !== undefined) {
      acc.push({
        date: current.correctedDate,
        content: current.content[0],
      });
    }

    return acc;
  }, []) : undefined;

  const versionSummaryJSON: ExternalVersionSummary = {
    msid,
    doi: version.doi,
    id: `${version.id}v${version.versionIdentifier}`, // construct a global version ID from concat of id and version-specific ID
    url: contentUrl,
    versionIdentifier: version.versionIdentifier,
    published: version.publishedDate ?? null,
    corrections,
  };

  Context.current().heartbeat('storing generated EPP JSON');
  const destination = constructEPPVersionS3FilePath('payload.json', version);
  await s3.send(new PutObjectCommand({
    Bucket: destination.Bucket,
    Key: destination.Key,
    Body: JSON.stringify(versionSummaryJSON),
  }));

  return destination;
};
