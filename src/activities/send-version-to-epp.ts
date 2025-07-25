import axios from 'axios';
import {
  BlockContent, CreativeWorkTypes, InlineContent, Node, Organization, Person,
} from '@stencila/schema';
import { ApplicationFailure, Context } from '@temporalio/activity';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config';
import { EPPPeerReview } from './fetch-review-content';
import { S3File, getEPPS3Client } from '../S3Bucket';
import { WorkflowArgs } from '../types';

export type Content = Array<Node> | Node;

export type ExternalVersionSummary = {
  id: string,
  msid: string,
  doi: string,
  url: string,
  versionIdentifier: string,
  published?: Date | null,
  corrections?: {
    date: Date,
    url: string,
  }[],
};

export type EnhancedArticlePreprint = {
  preprintDoi?: string,
  preprintUrl?: string,
  preprintPosted?: Date,
};

export type EnhancedArticle = EnhancedArticlePreprint & {
  id: string,
  msid: string,
  doi: string,
  versionIdentifier: string,
  versionDoi?: string,
  umbrellaDoi?: string,
  // When we drop the old article schema from the DB,
  // we can change ProcessedArticle to exclude these properties and drop `Omit` here
  article: {
    title: string | InlineContent[] | undefined,
    authors: (Organization | Person)[] | undefined,
    abstract: string | BlockContent[] | InlineContent[] | undefined,
    licenses: (string | CreativeWorkTypes)[] | undefined,
    content: (string & BlockContent[]) | (Node[] & BlockContent[]) | undefined,
    references: (string | CreativeWorkTypes)[] | undefined,
    meta?: {
      authorNotes?: {
        type: string,
        id: string,
        label?: string,
        text: string,
      }[],
    },
  },
  sentForReview?: Date,
  peerReview?: EPPPeerReview,
  published?: Date | null,
  volume?: string,
  eLocationId?: string,
  subjects?: string[],
  relatedContent?: {
    type: string,
    title?: string,
    url?: string,
    content?: string,
    imageUrl?: string,
  }[],
  publishedYear?: number,
  license?: string,
};

type EPPImportResponse = {
  result: boolean,
  message: string,
};

type SendVersionToEppArgs = WorkflowArgs & {
  payloadFile: S3File,
};

export const sendVersionToEpp = async ({ payloadFile, workflowArgs }: SendVersionToEppArgs): Promise<{ result: boolean, version: EnhancedArticle }> => {
  Context.current().heartbeat('Fetching article JSON');
  const s3 = getEPPS3Client();
  const versionJSON: string = await s3.send(new GetObjectCommand(payloadFile)).then((obj) => obj.Body?.transformToString() ?? '');
  const version = JSON.parse(versionJSON);
  if (workflowArgs?.siteName) {
    version.siteName = workflowArgs.siteName;
  }
  try {
    Context.current().heartbeat('Sending version data to EPP');
    const versionImportUri = `${config.eppServerUri}/preprints`;
    const { result, message } = await axios.post<EPPImportResponse>(versionImportUri, version).then(async (response) => response.data);
    if (!result) {
      throw new Error(`Failed to import version to EPP: ${message}`);
    }
    return {
      result,
      version,
    };
  } catch (error: any) {
    // remove the original payload from the error
    // eslint-disable-next-line no-underscore-dangle
    delete error.response.data.error._original;
    delete error.response.data.error.details[0].context.label;
    delete error.response.data.error.details[0].context.value;
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(error.response.data));
    throw new ApplicationFailure(
      `Failed to import version to EPP: ${error.response.data.message}`,
      'epp-server',
      undefined,
      [error.response.data.error],
      error,
    );
  }
};
