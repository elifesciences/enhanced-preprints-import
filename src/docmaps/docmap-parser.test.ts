import { Step } from './docmap';
import {
  addNextStep,
  generateAction,
  generateAuthorResponse,
  generateDocMap,
  generateEnhancedAssertion,
  generateEvaluationSummary,
  generatePeerReview,
  generatePeerReviewedAssertion,
  generatePersonParticipant,
  generatePreprint,
  generatePublishedAssertion,
  generateRepublishedAssertion,
  generateStep,
  generateUnderReviewAssertion,
  generateWebContent,
} from './docmap-generator';
import {
  parsePreprintDocMap,
  ParseResult,
  ReviewType,
  Version,
} from './docmap-parser';

const publisher = {
  id: 'https://elifesciences.org/',
  name: 'eLife',
  logo: 'https://sciety.org/static/groups/elife--b560187e-f2fb-4ff9-a861-a204f3fc0fb0.png',
  homepage: 'https://elifesciences.org/',
  account: {
    id: 'https://sciety.org/groups/elife',
    service: 'https://sciety.org',
  },
};

const parseDocMapFromFirstStep = (step: Step): ParseResult => {
  const docmap = generateDocMap('test', publisher, step);
  return parsePreprintDocMap(docmap);
};

describe('docmap-parser', () => {
  it('returns empty result without any steps', () => {
    const docmap = generateDocMap('test', publisher, { assertions: [], inputs: [], actions: [] });
    docmap.steps = new Map();
    const parsedData = parsePreprintDocMap(docmap);

    expect(parsedData.timeline.length).toStrictEqual(0);
    expect(parsedData.versions.length).toStrictEqual(0);
  });

  it('returns empty result when it cant find the first step', () => {
    const docmap = generateDocMap('test', publisher, { assertions: [], inputs: [], actions: [] });
    docmap['first-step'] = 'wrongid';
    const parsedData = parsePreprintDocMap(docmap);

    expect(parsedData.timeline.length).toStrictEqual(0);
    expect(parsedData.versions.length).toStrictEqual(0);
  });

  it('finds a published preprint from input step with URL', () => {
    const preprint = generatePreprint('preprint/article1', new Date('2022-03-01'), 'https://somewhere.org/preprint/article1');
    const firstStep = generateStep([preprint], [], []);
    const parsedData = parseDocMapFromFirstStep(firstStep);

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      url: 'https://somewhere.org/preprint/article1',
      type: 'Preprint',
    });

    expect(parsedData.timeline.length).toStrictEqual(1);
    expect(parsedData.timeline[0]).toMatchObject({
      date: new Date('2022-03-01'),
      name: 'Preprint posted',
      link: {
        text: 'Go to preprint',
        url: 'https://somewhere.org/preprint/article1',
      },
    });
  });

  it('finds a bioRxiv preprint and labels it', () => {
    const preprint = generatePreprint('10.1101/article1', new Date('2022-03-01'));
    const firstStep = generateStep([preprint], [], []);
    const parsedData = parseDocMapFromFirstStep(firstStep);

    expect(parsedData.timeline.length).toStrictEqual(1);
    expect(parsedData.timeline[0].link).toMatchObject({
      text: 'Go to BioRxiv',
      url: 'https://doi.org/10.1101/article1',
    });
  });

  it('finds a published preprint from input step with DOI', () => {
    const preprint = generatePreprint('preprint/article1', new Date('2022-03-01'));
    const firstStep = generateStep([preprint], [], []);
    const parsedData = parseDocMapFromFirstStep(firstStep);

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      type: 'Preprint',
    });

    expect(parsedData.timeline.length).toStrictEqual(1);
    expect(parsedData.timeline[0]).toMatchObject({
      name: 'Preprint posted',
      date: new Date('2022-03-01'),
      link: {
        text: 'Go to preprint',
        url: 'https://doi.org/preprint/article1',
      },
    });
  });

  it('finds a preprint from a docmap describing under review assertion', () => {
    // Arrange
    const preprint = generatePreprint('preprint/article1', new Date('2022-03-01'), 'https://something.org/preprint/article1');
    const firstStep = generateStep(
      [],
      [],
      [generateUnderReviewAssertion(preprint, new Date('2022-04-12'))],
    );

    // Act
    const parsedData = parseDocMapFromFirstStep(firstStep);

    // Assert
    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      type: 'Preprint',
      status: '(Preview) Reviewed',
    });

    expect(parsedData.timeline.length).toStrictEqual(2);
    expect(parsedData.timeline[0]).toMatchObject({
      date: new Date('2022-03-01'),
      name: 'Preprint posted',
      link: {
        text: 'Go to preprint',
        url: 'https://something.org/preprint/article1',
      },
    });
    expect(parsedData.timeline[1]).toMatchObject({
      date: new Date('2022-04-12'),
      name: 'Preprint sent for review',
    });
  });

  it('finds a preprint from a docmap describing under review assertion without URL', () => {
    // Arrange
    const preprint = generatePreprint('preprint/article1', new Date('2022-03-01'));
    const firstStep = generateStep(
      [],
      [],
      [generateUnderReviewAssertion(preprint, new Date('2022-04-12'))],
    );

    // Act
    const parsedData = parseDocMapFromFirstStep(firstStep);

    // Assert
    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      type: 'Preprint',
      status: '(Preview) Reviewed',
    });

    expect(parsedData.timeline.length).toStrictEqual(2);
    expect(parsedData.timeline[0]).toMatchObject({
      date: new Date('2022-03-01'),
      name: 'Preprint posted',
      link: {
        text: 'Go to preprint',
        url: 'https://doi.org/preprint/article1',
      },
    });
    expect(parsedData.timeline[1]).toMatchObject({
      date: new Date('2022-04-12'),
      name: 'Preprint sent for review',
    });
  });

  it('finds a single version when a step makes an assertion about an existing version', () => {
    // Arrange
    const preprint = generatePreprint('preprint/article1', new Date('2022-03-01'));
    const firstStep = generateStep(
      [],
      [],
      [generatePublishedAssertion(preprint, new Date('2022-03-01'))],
    );
    addNextStep(firstStep, generateStep(
      [],
      [],
      [generateUnderReviewAssertion(preprint, new Date('2022-04-12'))],
    ));

    // Act
    const parsedData = parseDocMapFromFirstStep(firstStep);

    // Assert
    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      type: 'Preprint',
      status: '(Preview) Reviewed',
    });

    expect(parsedData.timeline.length).toStrictEqual(2);
    expect(parsedData.timeline[0]).toMatchObject({
      date: new Date('2022-03-01'),
      name: 'Preprint posted',
      link: {
        text: 'Go to preprint',
        url: 'https://doi.org/preprint/article1',
      },
    });
    expect(parsedData.timeline[1]).toMatchObject({
      date: new Date('2022-04-12'),
      name: 'Preprint sent for review',
    });
  });

  it('finds two versions when a step makes an assertion about a new version', () => {
    // Arrange
    const preprintv1 = generatePreprint('preprint/article1', new Date('2022-03-01'));
    const preprintv2 = generatePreprint('preprint/article1', new Date('2022-04-12'), undefined, '4');
    const firstStep = generateStep(
      [],
      [],
      [generatePublishedAssertion(preprintv1, new Date('2022-03-01'))],
    );
    addNextStep(firstStep, generateStep(
      [preprintv1],
      [],
      [generatePublishedAssertion(preprintv2, new Date('2022-04-12'))],
    ));

    // Act
    const parsedData = parseDocMapFromFirstStep(firstStep);

    // Assert
    expect(parsedData.versions.length).toStrictEqual(2);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      type: 'Preprint',
      versionIdentifier: undefined,
    });
    expect(parsedData.versions[1]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      type: 'Preprint',
      versionIdentifier: '4',
    });

    expect(parsedData.timeline.length).toStrictEqual(2);
    expect(parsedData.timeline[0]).toMatchObject({
      date: new Date('2022-03-01'),
      name: 'Preprint posted',
      link: {
        text: 'Go to preprint',
        url: 'https://doi.org/preprint/article1',
      },
    });
    expect(parsedData.timeline[1]).toMatchObject({
      date: new Date('2022-04-12'),
      name: 'Preprint v4 posted',
      link: {
        text: 'Go to preprint',
        url: 'https://doi.org/preprint/article1',
      },
    });
  });

  it('detect when a step makes a republished assertion', () => {
    // Arrange
    const preprintv1 = generatePreprint('preprint/article1', new Date('2022-03-01'), undefined);
    const preprintv2 = generatePreprint('elife/12345.1', new Date('2022-04-12'), undefined, '1');

    const firstStep = generateStep(
      [],
      [],
      [generatePublishedAssertion(preprintv1, new Date('2022-03-01'))],
    );
    addNextStep(firstStep, generateStep(
      [preprintv1],
      [generateAction([], [preprintv2])],
      [generateRepublishedAssertion(preprintv2, new Date('2022-04-12'))],
    ));

    // Act
    const parsedData = parseDocMapFromFirstStep(firstStep);

    // Assert
    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'elife/12345.1',
      id: 'elife/12345.1',
      type: 'Preprint',
      versionIdentifier: '1',
      originalContentDoi: 'preprint/article1',
    });

    expect(parsedData.timeline.length).toStrictEqual(2);
    expect(parsedData.timeline[0]).toMatchObject({
      date: new Date('2022-03-01'),
      name: 'Preprint posted',
      link: {
        text: 'Go to preprint',
        url: 'https://doi.org/preprint/article1',
      },
    });
    expect(parsedData.timeline[1]).toMatchObject({
      date: new Date('2022-04-12'),
      name: 'Preprint v1 posted',
    });
  });

  it('finds a revised preprint from a docmap', () => {
    // Arrange
    const preprintv1 = generatePreprint('preprint/article1', new Date('2022-03-01'), undefined, '1');
    const preprintv2 = generatePreprint('preprint/article1v2', new Date('2022-06-01'), undefined, '2');

    const firstStep = generateStep(
      [],
      [],
      [generatePublishedAssertion(preprintv1, new Date('2022-03-01'))],
    );
    addNextStep(firstStep, generateStep(
      [],
      [],
      [generatePublishedAssertion(preprintv2, new Date('2022-06-01'))],
    ));

    // Act
    const parsedData = parseDocMapFromFirstStep(firstStep);

    // Assert
    expect(parsedData.versions.length).toStrictEqual(2);
    expect(parsedData.versions[0]).toMatchObject({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      type: 'Preprint',
      versionIdentifier: '1',
    });
    expect(parsedData.versions[1]).toMatchObject({
      doi: 'preprint/article1v2',
      id: 'preprint/article1v2',
      type: 'Preprint',
      versionIdentifier: '2',
    });

    expect(parsedData.timeline.length).toStrictEqual(2);
    expect(parsedData.timeline[0]).toMatchObject({
      date: new Date('2022-03-01'),
      name: 'Preprint v1 posted',
      link: {
        text: 'Go to preprint',
        url: 'https://doi.org/preprint/article1',
      },
    });
    expect(parsedData.timeline[1]).toMatchObject({
      date: new Date('2022-06-01'),
      name: 'Preprint v2 posted',
      link: {
        text: 'Go to preprint',
        url: 'https://doi.org/preprint/article1v2',
      },
    });
  });

  it('finds reviews and editor evaluations from a docmap', () => {
    // Arrange
    const preprintv1 = generatePreprint('preprint/article1', new Date('2022-03-01'), undefined, '1');
    const anonReviewerParticipant = generatePersonParticipant('anonymous', 'peer-reviewer');
    const peerReview1 = generatePeerReview(
      new Date('2022-04-06'),
      [
        generateWebContent('https://content.com/12345.sa1'),
      ],
      'elife/eLife.12345.sa1',
    );
    const peerReview2 = generatePeerReview(
      new Date('2022-04-07'),
      [
        generateWebContent('https://content.com/12345.sa2'),
      ],
      'elife/eLife.12345.sa2',
    );
    const editor = generatePersonParticipant('Daffy Duck', 'editor');
    const editorsEvaluation = generateEvaluationSummary(
      new Date('2022-04-10'),
      [
        generateWebContent('https://content.com/12345.sa3'),
      ],
      'elife/eLife.12345.sa3',
    );

    const firstStep = generateStep(
      [],
      [],
      [generatePublishedAssertion(preprintv1, new Date('2022-03-01'))],
    );
    addNextStep(firstStep, generateStep( //
      [preprintv1],
      [
        generateAction([anonReviewerParticipant], [peerReview1]),
        generateAction([anonReviewerParticipant], [peerReview2]),
        generateAction([editor], [editorsEvaluation]),
      ],
      [generatePeerReviewedAssertion(preprintv1, new Date('2022-04-01'))],
    ));

    // Act
    const parsedData = parseDocMapFromFirstStep(firstStep);

    // Assert
    expect(parsedData.timeline.length).toStrictEqual(2);
    expect(parsedData.timeline[0]).toMatchObject({
      name: 'Preprint v1 posted',
      date: new Date('2022-03-01'),
      link: {
        text: 'Go to preprint',
        url: 'https://doi.org/preprint/article1',
      },
    });
    expect(parsedData.timeline[1]).toMatchObject({
      name: 'Reviews received for Preprint',
      date: new Date('2022-04-01'),
    });

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject<Version>({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      superceded: false,
      type: 'Preprint',
      status: 'Reviewed',
      versionIdentifier: '1',
      peerReview: {
        reviews: [
          {
            reviewType: ReviewType.Review,
            text: 'fetched content for https://content.com/12345.sa1',
            date: new Date('2022-04-06'),
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
              institution: 'unknown',
            }],
          },
          {
            reviewType: ReviewType.Review,
            text: 'fetched content for https://content.com/12345.sa2',
            date: new Date('2022-04-07'),
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
              institution: 'unknown',
            }],
          },
        ],
        evaluationSummary: {
          reviewType: ReviewType.EvaluationSummary,
          text: 'fetched content for https://content.com/12345.sa3',
          date: new Date('2022-04-10'),
          participants: [{
            name: 'Daffy Duck',
            role: 'editor',
            institution: 'unknown',
          }],
        },
      },
    });
  });

  it('finds author response after publishing reviewed preprint', () => {
    const preprintv1 = generatePreprint('preprint/article1', new Date('2022-03-01'), undefined, '1');
    const anonReviewerParticipant = generatePersonParticipant('anonymous', 'peer-reviewer');
    const peerReview1 = generatePeerReview(
      new Date('2022-04-06'),
      [
        generateWebContent('https://content.com/12345.sa1'),
      ],
      'elife/eLife.12345.sa1',
    );
    const peerReview2 = generatePeerReview(
      new Date('2022-04-07'),
      [
        generateWebContent('https://content.com/12345.sa2'),
      ],
      'elife/eLife.12345.sa2',
    );
    const editor = generatePersonParticipant('Daffy Duck', 'editor');
    const editorsEvaluation = generateEvaluationSummary(
      new Date('2022-04-10'),
      [
        generateWebContent('https://content.com/12345.sa3'),
      ],
      'elife/eLife.12345.sa3',
    );
    const author = generatePersonParticipant('Bugs Bunny', 'author');
    const authorResponse = generateAuthorResponse(
      new Date('2022-05-09'),
      [
        generateWebContent('https://content.com/12345.sa4'),
      ],
      'elife/eLife.12345.sa4',
    );

    const firstStep = generateStep(
      [],
      [],
      [generatePublishedAssertion(preprintv1, new Date('2022-03-01'))],
    );
    const nextStep = addNextStep(firstStep, generateStep( //
      [preprintv1],
      [
        generateAction([anonReviewerParticipant], [peerReview1]),
        generateAction([anonReviewerParticipant], [peerReview2]),
        generateAction([editor], [editorsEvaluation]),
      ],
      [generatePeerReviewedAssertion(preprintv1, new Date('2022-04-01'))],
    ));
    addNextStep(nextStep, generateStep( //
      [preprintv1],
      [
        generateAction([author], [authorResponse]),
      ],
      [generateEnhancedAssertion(preprintv1, new Date('2022-05-09'))],
    ));

    const parsedData = parseDocMapFromFirstStep(firstStep);

    expect(parsedData.timeline.length).toStrictEqual(2);
    expect(parsedData.timeline[0]).toMatchObject({
      name: 'Preprint v1 posted',
      date: new Date('2022-03-01'),
      link: {
        text: 'Go to preprint',
        url: 'https://doi.org/preprint/article1',
      },
    });
    expect(parsedData.timeline[1]).toMatchObject({
      name: 'Reviews received for Preprint',
      date: new Date('2022-04-01'),
    });

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject<Version>({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      superceded: false,
      type: 'Preprint',
      status: 'Reviewed',
      versionIdentifier: '1',
      peerReview: {
        reviews: [
          {
            reviewType: ReviewType.Review,
            text: 'fetched content for https://content.com/12345.sa1',
            date: new Date('2022-04-06'),
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
              institution: 'unknown',
            }],
          },
          {
            reviewType: ReviewType.Review,
            text: 'fetched content for https://content.com/12345.sa2',
            date: new Date('2022-04-07'),
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
              institution: 'unknown',
            }],
          },
        ],
        evaluationSummary: {
          reviewType: ReviewType.EvaluationSummary,
          text: 'fetched content for https://content.com/12345.sa3',
          date: new Date('2022-04-10'),
          participants: [{
            name: 'Daffy Duck',
            role: 'editor',
            institution: 'unknown',
          }],
        },
        authorResponse: {
          reviewType: ReviewType.AuthorResponse,
          text: 'fetched content for https://content.com/12345.sa4',
          date: new Date('2022-05-09'),
          participants: [{
            name: 'Bugs Bunny',
            role: 'author',
            institution: 'unknown',
          }],
        },
      },
    });
  });

  it('finds a revised preprint reviews and evaluations from a docmap', () => {
    const preprintv1 = generatePreprint('preprint/article1', new Date('2022-03-01'), undefined, '1');
    const anonReviewerParticipant = generatePersonParticipant('anonymous', 'peer-reviewer');
    const peerReview1 = generatePeerReview(
      new Date('2022-04-06'),
      [
        generateWebContent('https://content.com/12345.sa1'),
      ],
      'elife/eLife.12345.sa1',
    );
    const peerReview2 = generatePeerReview(
      new Date('2022-04-07'),
      [
        generateWebContent('https://content.com/12345.sa2'),
      ],
      'elife/eLife.12345.sa2',
    );
    const editor = generatePersonParticipant('Daffy Duck', 'editor');
    const editorsEvaluation = generateEvaluationSummary(
      new Date('2022-04-10'),
      [
        generateWebContent('https://content.com/12345.sa3'),
      ],
      'elife/eLife.12345.sa3',
    );

    const firstStep = generateStep(
      [],
      [],
      [generatePublishedAssertion(preprintv1, new Date('2022-03-01'))],
    );
    addNextStep(firstStep, generateStep( //
      [preprintv1],
      [
        generateAction([anonReviewerParticipant], [peerReview1]),
        generateAction([anonReviewerParticipant], [peerReview2]),
        generateAction([editor], [editorsEvaluation]),
      ],
      [generatePeerReviewedAssertion(preprintv1, new Date('2022-04-01'))],
    ));

    const parsedData = parseDocMapFromFirstStep(firstStep);

    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject<Version>({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      superceded: false,
      type: 'Preprint',
      status: 'Reviewed',
      versionIdentifier: '1',
      peerReview: {
        reviews: [
          {
            reviewType: ReviewType.Review,
            text: 'fetched content for https://content.com/12345.sa1',
            date: new Date('2022-04-06'),
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
              institution: 'unknown',
            }],
          },
          {
            reviewType: ReviewType.Review,
            text: 'fetched content for https://content.com/12345.sa2',
            date: new Date('2022-04-07'),
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
              institution: 'unknown',
            }],
          },
        ],
        evaluationSummary: {
          reviewType: ReviewType.EvaluationSummary,
          text: 'fetched content for https://content.com/12345.sa3',
          date: new Date('2022-04-10'),
          participants: [{
            name: 'Daffy Duck',
            role: 'editor',
            institution: 'unknown',
          }],
        },
      },
    });

    expect(parsedData.timeline.length).toStrictEqual(2);
    expect(parsedData.timeline[0]).toMatchObject({
      name: 'Preprint v1 posted',
      date: new Date('2022-03-01'),
      link: {
        text: 'Go to preprint',
        url: 'https://doi.org/preprint/article1',
      },
    });
    expect(parsedData.timeline[1]).toMatchObject({
      name: 'Reviews received for Preprint',
      date: new Date('2022-04-01'),
    });
  });

  it('inference of reviewed preprint from input/outputs', () => {
    // Arrange
    const preprintv1 = generatePreprint('preprint/article1', new Date('2022-03-01'), undefined, '1');
    const anonReviewerParticipant = generatePersonParticipant('anonymous', 'peer-reviewer');
    const peerReview1 = generatePeerReview(
      new Date('2022-04-06'),
      [
        generateWebContent('https://content.com/12345.sa1'),
      ],
      'elife/eLife.12345.sa1',
    );
    const peerReview2 = generatePeerReview(
      new Date('2022-04-07'),
      [
        generateWebContent('https://content.com/12345.sa2'),
      ],
      'elife/eLife.12345.sa2',
    );
    const editor = generatePersonParticipant('Daffy Duck', 'editor');
    const editorsEvaluation = generateEvaluationSummary(
      new Date('2022-04-10'),
      [
        generateWebContent('https://content.com/12345.sa3'),
      ],
      'elife/eLife.12345.sa3',
    );

    const firstStep = generateStep(
      [preprintv1],
      [
        generateAction([anonReviewerParticipant], [peerReview1]),
        generateAction([anonReviewerParticipant], [peerReview2]),
        generateAction([editor], [editorsEvaluation]),
      ],
      [],
    );

    // Act
    const parsedData = parseDocMapFromFirstStep(firstStep);

    // Assert
    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject<Version>({
      doi: 'preprint/article1',
      id: 'preprint/article1',
      superceded: false,
      type: 'Preprint',
      status: 'Reviewed',
      versionIdentifier: '1',
      peerReview: {
        reviews: [
          {
            reviewType: ReviewType.Review,
            text: 'fetched content for https://content.com/12345.sa1',
            date: new Date('2022-04-06'),
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
              institution: 'unknown',
            }],
          },
          {
            reviewType: ReviewType.Review,
            text: 'fetched content for https://content.com/12345.sa2',
            date: new Date('2022-04-07'),
            participants: [{
              name: 'anonymous',
              role: 'peer-reviewer',
              institution: 'unknown',
            }],
          },
        ],
        evaluationSummary: {
          reviewType: ReviewType.EvaluationSummary,
          text: 'fetched content for https://content.com/12345.sa3',
          date: new Date('2022-04-10'),
          participants: [{
            name: 'Daffy Duck',
            role: 'editor',
            institution: 'unknown',
          }],
        },
      },
    });

    expect(parsedData.timeline.length).toStrictEqual(2);
    expect(parsedData.timeline[0]).toMatchObject({
      name: 'Preprint v1 posted',
      date: new Date('2022-03-01'),
      link: {
        text: 'Go to preprint',
        url: 'https://doi.org/preprint/article1',
      },
    });
    expect(parsedData.timeline[1]).toMatchObject({
      name: 'Reviews received for Preprint',
      date: new Date('2022-04-06'),
    });
  });

  it('inference of revised preprint from input/outputs', () => {
    // Arrange
    const preprintv1 = generatePreprint('preprint/article1', new Date('2022-03-01'), undefined, '1');
    const anonReviewerParticipant = generatePersonParticipant('anonymous', 'peer-reviewer');
    const peerReview1 = generatePeerReview(
      new Date('2022-04-06'),
      [
        generateWebContent('https://content.com/12345.sa1'),
      ],
      'elife/eLife.12345.sa1',
    );
    const peerReview2 = generatePeerReview(
      new Date('2022-04-07'),
      [
        generateWebContent('https://content.com/12345.sa2'),
      ],
      'elife/eLife.12345.sa2',
    );
    const editor = generatePersonParticipant('Daffy Duck', 'editor');
    const editorsEvaluation = generateEvaluationSummary(
      new Date('2022-04-10'),
      [
        generateWebContent('https://content.com/12345.sa3'),
      ],
      'elife/eLife.12345.sa3',
    );

    const firstStep = generateStep(
      [preprintv1],
      [
        generateAction([anonReviewerParticipant], [peerReview1]),
        generateAction([anonReviewerParticipant], [peerReview2]),
        generateAction([editor], [editorsEvaluation]),
      ],
      [],
    );

    const preprintv2 = generatePreprint('preprint/article2', new Date('2022-05-01'), undefined, '2');
    addNextStep(firstStep, generateStep(
      [preprintv1, peerReview1, peerReview2, editorsEvaluation],
      [
        generateAction([], [preprintv2]),
      ],
      [],
    ));

    // Act
    const parsedData = parseDocMapFromFirstStep(firstStep);

    // Assert
    expect(parsedData.versions.length).toStrictEqual(1);
    expect(parsedData.versions[0]).toMatchObject<Version>({
      doi: 'preprint/article2',
      id: 'preprint/article2',
      superceded: false,
      type: 'Preprint',
      status: '',
      versionIdentifier: '2',
    });

    expect(parsedData.timeline.length).toStrictEqual(3);
    expect(parsedData.timeline[0]).toMatchObject({
      name: 'Preprint v1 posted',
      date: new Date('2022-03-01'),
      link: {
        text: 'Go to preprint',
        url: 'https://doi.org/preprint/article1',
      },
    });
    expect(parsedData.timeline[1]).toMatchObject({
      name: 'Reviews received for Preprint',
      date: new Date('2022-04-06'),
    });
    expect(parsedData.timeline[2]).toMatchObject({
      name: 'Preprint v2 posted',
      date: new Date('2022-05-01'),
      link: {
        text: 'Go to preprint',
        url: 'https://doi.org/preprint/article2',
      },
    });
  });

  it.todo('finds a revised preprint evaluations, but no new reviews from a docmap');
  it.todo('finds a revised preprint evaluations, but no new reviews from a docmap');
});
