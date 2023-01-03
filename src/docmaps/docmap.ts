export type Account = {
  id: string,
  service: string,
};

export type Url = string;
export type DOI = string;

export type Publisher = {
  id: string,
  name: string,
  logo: Url,
  homepage: Url,
  account: Account,
};

export enum ExpressionType {
  Preprint = 'preprint',
  RevisedPreprint = 'postprint',
  PeerReview = 'review-article',
  EvaluationSummary = 'evaluation-summary',
  VersionOfRecord = 'version-of-record',
  AuthorResponse = 'author-response',
  UpdateSummary = 'update-summary',
}

export enum ManifestationType {
  WebPage = 'web-page',
}

export type Expression = {
  type: ExpressionType,
  identifier?: string,
  versionIdentifier?: string,
  url?: Url,
  published?: Date,
  doi?: DOI,
  content?: Manifestation[]
};

export type Manifestation = {
  type: ManifestationType,
  url?: Url,
  published?: Date,
  doi?: DOI,
};

export type Preprint = Expression & {
  type: ExpressionType.Preprint,
};

export type PeerReview = Expression & {
  type: ExpressionType.PeerReview,
};

export type EvaluationSummary = Expression & {
  type: ExpressionType.EvaluationSummary,
};

export type AuthorResponse = Expression & {
  type: ExpressionType.AuthorResponse,
};

export type RevisedPreprint = Expression & {
  type: ExpressionType.RevisedPreprint,
};

export type UpdateSummary = Expression & {
  type: ExpressionType.UpdateSummary,
};

export type VersionOfRecord = Expression & {
  type: ExpressionType.VersionOfRecord,
};

export type WebPage = Manifestation & {
  type: ManifestationType.WebPage,
};

export type Item = Preprint | PeerReview | PeerReview | EvaluationSummary | VersionOfRecord | Expression;
export type Input = Item;
export type Output = Item;

export type Person = {
  type: string,
  name: string,
};

export type Participant = {
  actor: Person,
  role: string,
};

export type Action = {
  participants: Participant[],
  outputs: Output[],
};

export enum AssertionStatus {
  Draft = 'draft',
  Published = 'manuscript-published',
  UnderReview = 'under-review',
  PeerReviewed = 'peer-reviewed',
  Enhanced = 'enhanced',
  VersionOfRecord = 'version-of-record',
  Revised = 'revised',
  Republished = 'republished',
}

export type Assertion = {
  item: Item,
  status: AssertionStatus,
  happened?: Date,
};

export type Step = {
  assertions: Assertion[],
  inputs: Input[],
  actions: Action[],
  'next-step'?: Step | string,
  'previous-step'?: Step | string,
};

export type DocMap = {
  '@context': typeof JsonLDFrameUrl | typeof JsonLDAddonFrame | Array<typeof JsonLDFrameUrl | typeof JsonLDAddonFrame>,
  type: 'docmap',
  id: Url,
  created: Date,
  updated: Date,
  publisher: Publisher,
  'first-step': string,
  steps: Map<string, Step>,
};

export const JsonLDFrameUrl = 'https://w3id.org/docmaps/context.jsonld';

/* eslint-disable quote-props */
/* eslint-disable @typescript-eslint/quotes */
/* eslint-disable @typescript-eslint/comma-dangle */
export const JsonLDAddonFrame = {
  "updated": {
    "@id": "dcterms:updated",
    "@type": "xsd:date"
  },
  "author-response": "fabio:Reply",
  "decision-letter": "fabio:Letter",
  "preprint": "fabio:Preprint",
  "version-of-record": "fabio:DefinitiveVersion",
  "update-summary": "fabio:ExecutiveSummary",
  "draft": "pso:draft",
  "manuscript-published": "pso:published",
  "republished": "pso:republished",
  "identifier": "dcterms:identifier",
  "happened": {
    "@id": "pwo:happened",
    "@type": "xsd:date"
  },
  "versionIdentifier": "prism:versionIdentifier"
};
/* eslint-enable quote-props */
/* eslint-enable @typescript-eslint/quotes */
/* eslint-enable @typescript-eslint/comma-dangle */
