import { Evaluation, ReviewType, VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { Context } from '@temporalio/activity';
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
  const scietyContentUrl = evaluation.contentUrls.filter((url) => url.match(/hypothesis:[^/]+\/content$/));
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

  Context.current().heartbeat('Fetching "evaluation summary"');
  if (version.peerReview.evaluationSummary) {
    evaluationSummary = {
      date: version.peerReview.evaluationSummary.date,
      participants: version.peerReview.evaluationSummary.participants,
      reviewType: version.peerReview.evaluationSummary.reviewType,
      text: await fetchEvaluationContent(version.peerReview.evaluationSummary),
    };
  }

  Context.current().heartbeat('Fetching "author response"');
  if (version.peerReview.authorResponse) {
    authorResponse = {
      date: version.peerReview.authorResponse.date,
      participants: version.peerReview.authorResponse.participants,
      reviewType: version.peerReview.authorResponse.reviewType,
      text: await fetchEvaluationContent(version.peerReview.authorResponse),
    };
  }

  Context.current().heartbeat('Fetching "peer reviews"');
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
