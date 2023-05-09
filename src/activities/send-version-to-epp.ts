import axios from 'axios';
import {
  BlockContent, CreativeWorkTypes, InlineContent, Node, Organization, Person,
} from '@stencila/schema';
import { config } from '../config';
import { EPPPeerReview } from './fetch-review-content';

export type Content = Array<Node> | Node;

export type Heading = {
  id: string,
  text: Content,
};

export type EnhancedArticle = {
  id: string,
  hash?: string,
  msid: string,
  doi: string,
  versionIdentifier: string,
  versionDoi?: string,
  // When we drop the old article schema from the DB,
  // we can change ProcessedArticle to exclude these properties and drop `Omit` here
  article: {
    title: string | InlineContent[] | undefined,
    authors: (Organization | Person)[] | undefined,
    abstract: string | BlockContent[] | InlineContent[] | undefined,
    licenses: (string | CreativeWorkTypes)[] | undefined,
    content: (string & BlockContent[]) | (Node[] & BlockContent[]) | undefined,
    headings: Heading[],
    references: (string | CreativeWorkTypes)[] | undefined,
  },
  preprintDoi: string,
  preprintUrl: string,
  preprintPosted: Date,
  sentForReview?: Date,
  peerReview?: EPPPeerReview,
  published?: Date,
};

type EPPImportResponse = {
  result: boolean,
  message: string,
};

export const sendVersionToEpp = async (versionJSON: EnhancedArticle, hash: string): Promise<boolean> => {
  const versionImportUri = `${config.eppServerUri}/preprints`;

  // Add hash to the version
  const versionJSONWithHash = { ...versionJSON, hash };

  try {
    const { result, message } = await axios.post<EPPImportResponse>(versionImportUri, versionJSONWithHash).then(async (response) => response.data);
    if (!result) {
      throw new Error(`Failed to import version to EPP: ${message}`);
    }
    return result;
  } catch (error: any) {
    throw new Error(`Failed to import version to EPP: ${error.response.data.message}`);
  }
};
