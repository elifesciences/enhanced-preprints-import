import { Evaluation, ReviewType, VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import axios from 'axios';

type EPPParticipant = {
  name: string;
  role: string;
  institution: string;
};
type EPPEvaluation = {
  date: Date;
  reviewType: ReviewType;
  text: string;
  participants: EPPParticipant[];
};
export type EPPPeerReview = {
  evaluationSummary?: EPPEvaluation;
  reviews: EPPEvaluation[];
  authorResponse?: EPPEvaluation;
};

export const fetchEvaluationContent = async (evaluation: Evaluation): Promise<string> => {
  const scietyContentUrl = evaluation.contentUrls.filter((url) => url.startsWith('https://sciety.org/evaluations/hypothesis:') && url.endsWith('/content'));
  if (scietyContentUrl.length === 1) {
    const { data } = await axios.get(scietyContentUrl[0]);
    return data;
  }
  throw Error('Could not resolve evaluation content URLs to content');
};

export const fetchReviewContent = async (version: VersionedReviewedPreprint): Promise<EPPPeerReview | undefined> => {
  let reviews: EPPEvaluation[] = [];
  let authorResponse: EPPEvaluation | undefined;
  let evaluationSummary: EPPEvaluation | undefined;

  if (!version.peerReview) {
    return undefined;
  }

  if (version.peerReview.evaluationSummary) {
    evaluationSummary = {
      date: version.peerReview.evaluationSummary.date,
      participants: version.peerReview.evaluationSummary.participants,
      reviewType: version.peerReview.evaluationSummary.reviewType,
      text: await fetchEvaluationContent(version.peerReview.evaluationSummary),
    };
  }

  if (version.peerReview.authorResponse) {
    authorResponse = {
      date: version.peerReview.authorResponse.date,
      participants: version.peerReview.authorResponse.participants,
      reviewType: version.peerReview.authorResponse.reviewType,
      text: await fetchEvaluationContent(version.peerReview.authorResponse),
    };
  }

  reviews = await Promise.all(version.peerReview.reviews.map(async (review) => ({
    date: review.date,
    participants: review.participants,
    reviewType: review.reviewType,
    text: await fetchEvaluationContent(review),
  })));

  return {
    evaluationSummary,
    reviews,
    authorResponse,
  };
};
