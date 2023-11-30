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
  doi: string;
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

const mapEvaluation = async (evaluation: Evaluation): Promise<EPPEvaluation> => ({
  date: evaluation.date,
  doi: evaluation.doi,
  participants: evaluation.participants.map<EPPParticipant>((participant): EPPParticipant => ({
    name: participant.name,
    role: participant.role,
    institution: [participant.institution.name, participant.institution.location].filter((v) => v).join(', '),
  })),
  reviewType: evaluation.reviewType,
  text: await fetchEvaluationContent(evaluation),
});

export const fetchReviewContent = async (version: VersionedReviewedPreprint): Promise<EPPPeerReview | undefined> => {
  let reviews: EPPEvaluation[] = [];
  let authorResponse: EPPEvaluation | undefined;
  let evaluationSummary: EPPEvaluation | undefined;

  if (!version.peerReview) {
    return undefined;
  }

  Context.current().heartbeat('Fetching "evaluation summary"');
  if (version.peerReview.evaluationSummary) {
    evaluationSummary = await mapEvaluation(version.peerReview.evaluationSummary);
  }

  Context.current().heartbeat('Fetching "author response"');
  if (version.peerReview.authorResponse) {
    authorResponse = await mapEvaluation(version.peerReview.authorResponse);
  }

  Context.current().heartbeat('Fetching "peer reviews"');
  reviews = await Promise.all(version.peerReview.reviews.map(mapEvaluation));

  return {
    ...evaluationSummary ? { evaluationSummary } : {},
    ...authorResponse ? { authorResponse } : {},
    reviews,
  };
};
