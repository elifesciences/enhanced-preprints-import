import {
  Action,
  AssertionStatus,
  DocMap,
  Expression,
  ExpressionType,
  Step,
} from './docmap';

export enum ReviewType {
  EvaluationSummary = 'evaluation-summary',
  Review = 'review-article',
  AuthorResponse = 'author-response',
}

const stringToReviewType = (reviewTypeString: string): ReviewType | undefined => {
  if (reviewTypeString === ReviewType.EvaluationSummary) {
    return ReviewType.EvaluationSummary;
  }
  if (reviewTypeString === ReviewType.AuthorResponse) {
    return ReviewType.AuthorResponse;
  }
  if (reviewTypeString === ReviewType.Review) {
    return ReviewType.Review;
  }
  return undefined;
};

type Participant = {
  name: string,
  role: string,
  institution: string,
};

type Evaluation = {
  date: Date,
  reviewType: ReviewType,
  text: string,
  participants: Participant[],
};

type PeerReview = {
  evaluationSummary?: Evaluation,
  reviews: Evaluation[],
  authorResponse?: Evaluation,
};

export type TimelineEvent = {
  name: string,
  date: Date,
  link?: {
    text: string,
    url: string,
  }
};

export enum ContentType {
  Article = 'article',
  EvaluationSummary = 'evaluation-summary',
  Review = 'review-article',
  AuthorResponse = 'author-response',
}

export type Content = {
  type: ContentType,
  url: string,
};

export type Version = {
  id: string,
  versionIdentifier?: string,
  doi: string,
  url?: string,
  type: string,
  status: string,
  peerReview?: PeerReview,
  publishedDate?: Date,
  sentForReviewDate?: Date,
  reviewedDate?: Date,
  authorResponseDate?: Date,
  content: Content[],
  superceded: boolean,
};

export type ParseResult = {
  timeline: TimelineEvent[],
  versions: Version[],
};

const upperCaseFirstLetter = (string: string) => `${string.substring(0, 1).toUpperCase()}${string.substring(1)}`;

const getVersionFromExpression = (expression: Expression): Version => {
  if (!expression.doi) {
    throw Error('Cannot identify Expression by DOI');
  }
  const content = [];
  if (expression.url) {
    content.push({ type: ContentType.Article, url: expression.url });
  }

  return {
    type: upperCaseFirstLetter(expression.type),
    superceded: false,
    status: '',
    id: expression.identifier ?? expression.doi,
    doi: expression.doi,
    url: expression.url ?? `https://doi.org/${expression.doi}`,
    content,
    versionIdentifier: expression.versionIdentifier,
    publishedDate: expression.published,
  };
};

const isVersionAboutExpression = (version: Version, expression: Expression): boolean => {
  if (expression.doi !== version.doi) {
    return false;
  }

  if (expression.versionIdentifier && expression.versionIdentifier !== version.versionIdentifier) {
    return false;
  }

  return true;
};
const isContentEqual = (contentA: Content, contentB: Content): boolean => contentA.url === contentB.url && contentA.type === contentB.type;
const findVersionDescribedBy = (results: ParseResult, expression: Expression): Version | undefined => results.versions.find((version) => isVersionAboutExpression(version, expression));
const findAndUpdateOrCreateVersionDescribedBy = (results: ParseResult, expression: Expression): Version => {
  const foundVersion = findVersionDescribedBy(results, expression);
  const newVersion = getVersionFromExpression(expression);
  if (foundVersion) {
    // update any fields, defaulting to existing values
    foundVersion.url = newVersion.url ?? foundVersion.url;
    foundVersion.type = newVersion.type ?? foundVersion.type;
    foundVersion.status = newVersion.status ?? foundVersion.status;
    foundVersion.publishedDate = newVersion.publishedDate ?? foundVersion.publishedDate;

    newVersion.content.forEach((contentEntry) => foundVersion.content.find((contentEntryInFoundVersion) => isContentEqual(contentEntryInFoundVersion, contentEntry)) || foundVersion.content.push(contentEntry));

    return foundVersion;
  }
  results.versions.push(newVersion);
  return newVersion;
};

const findAndFlatMapAllEvaluations = (actions: Action[]): Evaluation[] => actions.flatMap((action) => action.outputs.map((output) => {
  const reviewType = stringToReviewType(output.type);
  if (!reviewType || !Object.values(ReviewType).includes(reviewType)) {
    return undefined;
  }
  if (output.content === undefined) {
    return undefined;
  }
  if (output.content.length === 0) {
    return undefined;
  }
  const allContent = output.content.filter((content) => content.type === 'web-page');
  const text = (allContent.length === 1) ? `fetched content for ${allContent[0].url}` : undefined; // TODO

  return {
    reviewType: stringToReviewType(output.type),
    date: output.published,
    participants: action.participants.map((participant) => ({
      name: participant.actor.name,
      institution: 'unknown', // TODO
      role: participant.role,
    })),
    text,
  };
})).filter((output): output is Evaluation => output !== undefined);

const addEvaluationsToVersion = (version: Version, evaluations: Evaluation[]) => {
  const evaluationSummary = evaluations.filter((evaluation) => evaluation?.reviewType === ReviewType.EvaluationSummary);
  const authorResponse = evaluations.filter((evaluation) => evaluation?.reviewType === ReviewType.AuthorResponse);
  const reviews = evaluations.filter((evaluation) => evaluation?.reviewType === ReviewType.Review);

  const thisVersion = version;
  if (!thisVersion.peerReview) {
    thisVersion.peerReview = {
      reviews: [],
    };
  }
  thisVersion.peerReview.reviews.push(...reviews);
  thisVersion.peerReview.evaluationSummary = evaluationSummary.length > 0 ? evaluationSummary[0] : thisVersion.peerReview.evaluationSummary;
  thisVersion.peerReview.authorResponse = authorResponse.length > 0 ? authorResponse[0] : thisVersion.peerReview.authorResponse;
};

const parseStep = (step: Step, results: ParseResult): ParseResult => {
  // look for any preprint inputs that need importing
  const preprintInputs = step.inputs.filter((input) => input.type === 'preprint');
  const preprintOutputs = step.actions.flatMap((action) => action.outputs.filter((output) => output.type === 'preprint'));

  // create and import or update versions
  [...preprintInputs, ...preprintOutputs].forEach((preprint) => findAndUpdateOrCreateVersionDescribedBy(results, preprint));

  // useful to infer actions from inputs and output types
  const evaluationTypes = [
    ExpressionType.AuthorResponse.toString(),
    ExpressionType.EvaluationSummary.toString(),
    ExpressionType.PeerReview.toString(),
  ];
  const evaluationInputs = step.inputs.filter((input) => evaluationTypes.includes(input.type));
  const evaluationOutputs = step.actions.flatMap((action) => action.outputs.filter((output) => evaluationTypes.includes(output.type)));

  const preprintPublishedAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.Published);
  if (preprintPublishedAssertion) {
    findAndUpdateOrCreateVersionDescribedBy(results, preprintPublishedAssertion.item);
  }

  const preprintUnderReviewAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.UnderReview);
  if (preprintUnderReviewAssertion) {
    // Update type and sent for review date
    const version = findAndUpdateOrCreateVersionDescribedBy(results, preprintUnderReviewAssertion.item);
    version.sentForReviewDate = preprintUnderReviewAssertion.happened;
    version.status = '(Preview) Reviewed';

    // if there is an input and output preprint, let's assume it's a republish with the intent to review
    if (preprintInputs.length === 1 && preprintOutputs.length === 1) {
      const newVersion = findAndUpdateOrCreateVersionDescribedBy(results, preprintOutputs[0]);
      if (newVersion !== version) {
        version.superceded = true;
        // bring forward any content
        newVersion.content = [
          ...version.content,
          ...newVersion.content,
        ];

        // Update type
        newVersion.status = '(Preview) Reviewed';
      }
    }
  }

  const preprintRepublishedAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.Republished);
  if (preprintRepublishedAssertion) {
    // assume there is only one input, which is the preprint
    const preprint = findAndUpdateOrCreateVersionDescribedBy(results, step.inputs[0]);
    const replacementPreprint = findAndUpdateOrCreateVersionDescribedBy(results, preprintRepublishedAssertion.item);
    preprint.superceded = true;
    // bring forward any content
    replacementPreprint.content = [
      ...preprint.content,
      ...replacementPreprint.content,
    ];
  } else if (preprintInputs.length === 1 && evaluationInputs.length > 0 && preprintOutputs.length === 1) {
    // preprint input, evaluation input, and preprint output = superceed input preprint with output Reviewed Preprint
    const inputVersion = findAndUpdateOrCreateVersionDescribedBy(results, preprintInputs[0]);
    const outputVersion = findAndUpdateOrCreateVersionDescribedBy(results, preprintOutputs[0]);
    inputVersion.superceded = true;
    // bring forward any content
    outputVersion.content = [
      ...inputVersion.content,
      ...outputVersion.content,
    ];
  }

  const preprintPeerReviewedAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.PeerReviewed);
  if (preprintPeerReviewedAssertion) {
    const version = findVersionDescribedBy(results, preprintPeerReviewedAssertion.item);
    if (version) {
      // Update type and sent for review date
      version.type = 'Preprint';
      version.reviewedDate = preprintPeerReviewedAssertion.happened;
      version.status = 'Reviewed';

      // push all reviews into peerReview (override if necessary)
      const evaluations = findAndFlatMapAllEvaluations(step.actions);
      addEvaluationsToVersion(version, evaluations);
    }
  } else if (preprintInputs.length === 1 && evaluationOutputs.length > 0 && preprintOutputs.length === 0) {
    // preprint input, evaluation output, but no preprint output = Reviewed Preprint (input)
    const inputVersion = findAndUpdateOrCreateVersionDescribedBy(results, preprintInputs[0]);

    const publishedDates = evaluationOutputs.map((evaluationOutput) => evaluationOutput.published).filter((publishedDate) => !!publishedDate);
    if (publishedDates.length > 0) {
      inputVersion.status = 'Reviewed';
      inputVersion.reviewedDate = inputVersion.reviewedDate ?? publishedDates[0];
      addEvaluationsToVersion(inputVersion, findAndFlatMapAllEvaluations(step.actions));
    }
  }

  // Enhanced can cover a multitude of enhancements to the paper.
  const enhancedAssertion = step.assertions.find((assertion) => assertion.status === AssertionStatus.Enhanced);
  if (enhancedAssertion) {
    const version = findVersionDescribedBy(results, enhancedAssertion.item);
    if (version) {
      // Decide what to do by examining the outputs
      const evaluations = findAndFlatMapAllEvaluations(step.actions);
      if (evaluations.length > 0) {
        addEvaluationsToVersion(version, evaluations);
      }
    }
  }
  return results;
};

function* getSteps(docMap: DocMap): Generator<Step> {
  let currentStep = docMap.steps.get(docMap['first-step']);
  if (currentStep === undefined) {
    return;
  }

  while (currentStep !== undefined) {
    yield currentStep;

    if (typeof currentStep['next-step'] === 'string') {
      currentStep = docMap.steps.get(currentStep['next-step']);
    } else {
      currentStep = currentStep['next-step'];
    }
  }
}

const getEventsFromVersion = (version: Version): TimelineEvent[] => {
  const events = [];
  if (version.publishedDate) {
    const url = version.url ?? (version.doi ? `https://doi.org/${version.doi}` : undefined);
    const bioRxiv = version.doi?.startsWith('10.1101') ?? false;
    const link = url ? { text: bioRxiv ? 'Go to BioRxiv' : 'Go to preprint', url } : undefined;
    events.push({
      name: `${version.type}${version.versionIdentifier ? ` v${version.versionIdentifier}` : ''} posted`,
      date: version.publishedDate,
      link,
    });
  }

  if (version.sentForReviewDate) {
    events.push({
      name: `${version.type} sent for review`,
      date: version.sentForReviewDate,
    });
  }

  if (version.reviewedDate) {
    events.push({
      name: `Reviews received for ${version.type}`,
      date: version.reviewedDate,
    });
  }

  // sort by event dates
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
};

const getTimelineFromVersions = (versions: Version[]): TimelineEvent[] => versions.flatMap((version: Version): TimelineEvent[] => getEventsFromVersion(version));

// Removes any that has collected a superceded By property
const removeSupercededVersions = (versions: Version[]): Version[] => versions.filter((version) => !version.superceded);

const parseDocMapJson = (docMapJson: string): DocMap => {
  const docMapStruct = JSON.parse(docMapJson, (key, value) => {
    if (key === 'steps') {
      return new Map<string, Step>(Object.entries(value));
    }
    const dateFields = [
      'happened',
      'published',
    ];
    if (dateFields.includes(key)) {
      return new Date(value);
    }
    return value;
  });

  return docMapStruct as DocMap;
};

export const parsePreprintDocMap = (docMap: DocMap | string): ParseResult => {
  const docMapStruct = typeof docMap === 'string' ? parseDocMapJson(docMap) : docMap;

  let results: ParseResult = {
    timeline: [],
    versions: [],
  };

  const steps = Array.from(docMapStruct.steps.values());
  if (steps.length === 0) {
    return results;
  }

  const stepsIterator = getSteps(docMapStruct);
  let currentStep = stepsIterator.next().value;
  while (currentStep) {
    results = parseStep(currentStep, results);
    currentStep = stepsIterator.next().value;
  }

  results.timeline = getTimelineFromVersions(results.versions);
  results.versions = removeSupercededVersions(results.versions);
  return results;
};
