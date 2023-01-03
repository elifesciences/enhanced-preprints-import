import {
  Action,
  Assertion,
  AssertionStatus,
  AuthorResponse,
  DocMap,
  DOI,
  EvaluationSummary,
  Expression,
  ExpressionType,
  Input,
  Item,
  JsonLDAddonFrame,
  JsonLDFrameUrl,
  ManifestationType,
  Output,
  Participant,
  PeerReview,
  Preprint,
  Publisher,
  RevisedPreprint,
  Step,
  UpdateSummary,
  Url,
  VersionOfRecord,
  WebPage,
} from './docmap';

type Steps = {
  'first-step': string,
  steps: Map<string, Step>
};

export const generatePreprint = (doi: DOI, published?: Date, url?: Url, version?: string): Preprint => ({
  type: ExpressionType.Preprint,
  doi,
  url,
  published,
  versionIdentifier: version,
});

export const generateRevisedPreprint = (doi: DOI, published?: Date, url?: Url, version?: string): RevisedPreprint => ({
  type: ExpressionType.RevisedPreprint,
  doi,
  url,
  published,
  versionIdentifier: version,
});

export const generateEnhancedPreprint = (identifier: string, version: string, doi: DOI, url: Url, content: WebPage[], published?: Date): Preprint => ({
  identifier,
  versionIdentifier: version,
  type: ExpressionType.Preprint,
  doi,
  url,
  published,
  content,
});

export const generatePeerReview = (published: Date, content: WebPage[], doi?: DOI, url?: Url): PeerReview => ({
  type: ExpressionType.PeerReview,
  doi,
  published,
  url,
  content,
});

export const generateEvaluationSummary = (published: Date, content: WebPage[], doi?: DOI, url?: Url): EvaluationSummary => ({
  type: ExpressionType.EvaluationSummary,
  doi,
  published,
  url,
  content,
});

export const generateAuthorResponse = (published: Date, content: WebPage[], doi?: DOI, url?: Url): AuthorResponse => ({
  type: ExpressionType.AuthorResponse,
  doi,
  published,
  url,
  content,
});

export const generateUpdateSummary = (published: Date, content: WebPage[], doi?: DOI, url?: Url): UpdateSummary => ({
  type: ExpressionType.UpdateSummary,
  doi,
  published,
  url,
  content,
});

export const generateVersionOfRecord = (published: Date, content: WebPage[], doi?: DOI, url?: Url): VersionOfRecord => ({
  type: ExpressionType.VersionOfRecord,
  doi,
  published,
  url,
  content,
});

export const generateWebContent = (url: Url): WebPage => ({
  type: ManifestationType.WebPage,
  url,
});

export const generatePersonParticipant = (name: string, role: string): Participant => ({
  actor: {
    name,
    type: 'person',
  },
  role,
});

export const generateAction = (participants: Participant[], outputs: Output[]): Action => ({
  participants,
  outputs,
});

export const generatePeerReviewAction = (participants: Participant[], outputs: Output[]): Action => ({
  participants,
  outputs,
});

export const generateStep = (inputs: Input[], actions: Action[], assertions: Assertion[]): Step => ({
  assertions,
  inputs,
  actions,
});

export const simplifyExpression = (expression: Expression): Expression => ({
  type: expression.type,
  doi: expression.doi,
  versionIdentifier: expression.versionIdentifier,
  url: expression.doi === undefined ? expression.url : undefined,
});

export const addNextStep = (previousStep: Step, nextStep: Step): Step => {
  // eslint-disable-next-line no-param-reassign
  previousStep['next-step'] = nextStep;
  // eslint-disable-next-line no-param-reassign
  nextStep['previous-step'] = previousStep;

  return nextStep;
};

export const generatePublishedAssertion = (item: Item, date?: Date): Assertion => ({
  item,
  status: AssertionStatus.Published,
  happened: date,
});

export const generateRepublishedAssertion = (item: Item, date?: Date): Assertion => ({
  item,
  status: AssertionStatus.Republished,
  happened: date,
});

export const generatePeerReviewedAssertion = (item: Item, date?: Date): Assertion => ({
  item,
  status: AssertionStatus.PeerReviewed,
  happened: date,
});

export const generateEnhancedAssertion = (item: Item, date?: Date): Assertion => ({
  item,
  status: AssertionStatus.Enhanced,
  happened: date,
});

export const generateRevisedAssertion = (item: Item, date?: Date): Assertion => ({
  item,
  status: AssertionStatus.Revised,
  happened: date,
});

export const generateUnderReviewAssertion = (item: Item, date?: Date): Assertion => ({
  item,
  status: AssertionStatus.UnderReview,
  happened: date,
});

export const generateVersionOfRecordAssertion = (item: Item, date?: Date): Assertion => ({
  item,
  status: AssertionStatus.VersionOfRecord,
  happened: date,
});

export const generateDraftAssertion = (item: Item, date?: Date): Assertion => ({
  item,
  status: AssertionStatus.Draft,
  happened: date,
});

const findFirstStep = (step: Step): Step => {
  if (typeof step['previous-step'] === 'string') {
    throw Error('Cannot find first step, this step has already been dereferenced');
  }
  if (step['previous-step']) {
    return findFirstStep(step['previous-step']);
  }

  return step;
};

const dereferenceSteps = (step: Step): Steps => {
  const steps = new Map<string, Step>();

  const firstStep = findFirstStep(step);

  let currentStep: Step | undefined = firstStep;
  let currentStepId: number | undefined = 0;
  let previousStepId: number | undefined;
  let nextStepId: number | undefined;

  while (currentStep !== undefined) {
    nextStepId = currentStep['next-step'] !== undefined ? currentStepId + 1 : undefined;

    steps.set(`_:b${currentStepId}`, {
      actions: currentStep.actions,
      assertions: currentStep.assertions,
      inputs: currentStep.inputs,
      'next-step': nextStepId !== undefined ? `_:b${nextStepId}` : undefined,
      'previous-step': previousStepId !== undefined ? `_:b${previousStepId}` : undefined,
    });

    previousStepId = currentStepId;
    if (typeof currentStep['next-step'] === 'string') {
      currentStep = steps.get(currentStep['next-step']);
    } else {
      currentStep = currentStep['next-step'];
    }
    // eslint-disable-next-line no-plusplus
    currentStepId++;
  }

  return {
    'first-step': '_:b0',
    steps,
  };
};

export const generateDocMap = (id: string, publisher: Publisher, firstStep: Step): DocMap => {
  const steps = dereferenceSteps(firstStep);
  return {
    '@context': [JsonLDFrameUrl, JsonLDAddonFrame],
    type: 'docmap',
    id,
    created: new Date(),
    updated: new Date(),
    publisher,
    ...steps,
  };
};
