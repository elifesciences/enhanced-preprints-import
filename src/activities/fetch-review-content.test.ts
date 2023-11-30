import { Context } from '@temporalio/activity';
import { MockActivityEnvironment } from '@temporalio/testing';
import axios from 'axios';
import { mocked } from 'jest-mock';
import { ReviewType, VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { fetchReviewContent } from './fetch-review-content';

jest.mock('axios');

const mockReview = {
  doi: 'reviewdoi1',
  date: new Date('2023-10-30'),
  participants: [],
  reviewType: ReviewType.Review,
};

const mockEvaluationSummary = {
  doi: 'reviewdoi2',
  date: new Date('2023-11-01'),
  participants: [{ name: 'Reviewing Editor', role: 'senior-editor', institution: { name: 'Monsters University', location: 'Monstropolis' } }],
  reviewType: ReviewType.EvaluationSummary,
};

const mockAuthorResponse = {
  doi: 'reviewdoi3',
  date: new Date('2023-11-02'),
  participants: [],
  reviewType: ReviewType.AuthorResponse,
};

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
          ...mockReview,
          contentUrls: ['http://review-content.mockedapi/hypothesis:reviewId1/content'],
        }],
        evaluationSummary: {
          ...mockEvaluationSummary,
          contentUrls: ['http://review-content.mockedapi/hypothesis:reviewId2/content'],
        },
        authorResponse: {
          ...mockAuthorResponse,
          contentUrls: ['http://review-content.mockedapi/hypothesis:reviewId3/content'],
        },
      },
    };

    const env = new MockActivityEnvironment({ attempt: 2 });
    const result = await env.run(fetchReviewContent, versionData);
    expect(result).toStrictEqual({
      evaluationSummary: {
        ...mockEvaluationSummary,
        participants: [{
          name: 'Reviewing Editor',
          role: 'senior-editor',
          institution: 'Monsters University, Monstropolis',
        }],
        text: '<h1>Review</h1><p>Review content</p>',
      },
      authorResponse: {
        ...mockAuthorResponse,
        text: '<h1>Review</h1><p>Review content</p>',
      },
      reviews: [{
        ...mockReview,
        text: '<h1>Review</h1><p>Review content</p>',
      }],
    });
  });

  it('adds only return structural elements in original peer review', async () => {
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
          ...mockReview,
          contentUrls: ['http://review-content.mockedapi/hypothesis:reviewId1/content'],
        }],
      },
    };

    const env = new MockActivityEnvironment({ attempt: 2 });
    const result = await env.run(fetchReviewContent, versionData);
    expect(result).toStrictEqual({
      reviews: [{
        ...mockReview,
        text: '<h1>Review</h1><p>Review content</p>',
      }],
    });
  });
});
