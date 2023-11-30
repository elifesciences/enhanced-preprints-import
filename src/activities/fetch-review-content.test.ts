import { Context } from '@temporalio/activity';
import { MockActivityEnvironment } from '@temporalio/testing';
import axios from 'axios';
import { mocked } from 'jest-mock';
import { ReviewType, VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { fetchReviewContent } from './fetch-review-content';

jest.mock('axios');

describe('fetch-review-content', () => {
  it('adds remote-fetched content to the peer review content', async () => {
    // Arrange
    const mockedGet = mocked(axios.get);

    // @ts-ignore
    mockedGet.mockImplementation(() => Promise.resolve({
      data: '<h1>Review</h1><p>Review content</p>',
      status: 200,
    }));

    const versionData: VersionedReviewedPreprint = {
      id: 'testid',
      doi: 'testdoi',
      versionIdentifier: '1',
      preprint: {
        id: 'testpreprintid',
        doi: 'testpreprintdoi',
      },
      peerReview: {
        reviews: [{
          doi: 'reviewdoi1',
          contentUrls: ['http://review-content.mockedapi/hypothesis:reviewId1/content'],
          date: new Date('2023-10-30'),
          participants: [],
          reviewType: ReviewType.Review,
        }],
        evaluationSummary: {
          doi: 'reviewdoi2',
          contentUrls: ['http://review-content.mockedapi/hypothesis:reviewId2/content'],
          date: new Date('2023-11-01'),
          participants: [{ name: 'Reviewing Editor', role: 'senior-editor', institution: { name: 'Monsters University', location: 'Monstropolis' } }],
          reviewType: ReviewType.EvaluationSummary,
        },
        authorResponse: {
          doi: 'reviewdoi3',
          contentUrls: ['http://review-content.mockedapi/hypothesis:reviewId3/content'],
          date: new Date('2023-11-02'),
          participants: [],
          reviewType: ReviewType.AuthorResponse,
        },
      },
    };

    const env = new MockActivityEnvironment({ attempt: 2 });
    const result = await env.run(fetchReviewContent, versionData);
    expect(result).toStrictEqual({
      evaluationSummary: {
        date: new Date('2023-11-01'),
        doi: 'reviewdoi2',
        participants: [{
          name: 'Reviewing Editor',
          role: 'senior-editor',
          institution: 'Monsters University, Monstropolis',
        }],
        reviewType: 'evaluation-summary',
        text: '<h1>Review</h1><p>Review content</p>',
      },
      authorResponse: {
        date: new Date('2023-11-02'),
        doi: 'reviewdoi3',
        participants: [],
        reviewType: 'author-response',
        text: '<h1>Review</h1><p>Review content</p>',
      },
      reviews: [{
        date: new Date('2023-10-30'),
        doi: 'reviewdoi1',
        participants: [],
        reviewType: 'review-article',
        text: '<h1>Review</h1><p>Review content</p>',
      }],
    });
  });
});
