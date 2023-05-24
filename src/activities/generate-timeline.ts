import { ManuscriptData } from '@elifesciences/docmap-ts';

export type TimelineEvent = {
  name: 'PREPRINT_PUBLISHED' | 'SENT_FOR_REVIEW' | 'VERSION_PUBLISHED',
  date: Date,
  url?: string,
};

export const generateTimeline = async (manuscriptData: ManuscriptData): Promise<TimelineEvent[]> => {
  const timelineEvents: TimelineEvent[] = [];
  manuscriptData.versions.forEach((version) => {
    // Preprint publish date
    if (version.preprint.publishedDate !== undefined) {
      timelineEvents.push({
        name: 'PREPRINT_PUBLISHED',
        date: version.preprint.publishedDate,
        url: `https://doi.org/${version.preprint.doi}`,
      });
    }
    // Possibly add sent for review date
    if (version.sentForReviewDate !== undefined) {
      timelineEvents.push({
        name: 'SENT_FOR_REVIEW',
        date: version.sentForReviewDate,
      });
    }
    // Add (eLife) publish date
    if (version.publishedDate !== undefined) {
      timelineEvents.push({
        name: 'VERSION_PUBLISHED',
        date: version.publishedDate,
      });
    }
  });

  return timelineEvents;
};
