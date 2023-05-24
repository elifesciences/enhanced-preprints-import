import { ManuscriptData } from '@elifesciences/docmap-ts';
import { generateTimeline, TimelineEvent } from './generate-timeline';

describe('generateTimeline', () => {
  it('should throw an error if manuscriptData is missing versions', async () => {
    const manuscriptData = {};

    await expect(generateTimeline((manuscriptData as ManuscriptData))).rejects.toThrowError();
  });

  it('should generate the timeline events correctly', async () => {
    const manuscriptData = {
      versions: [
        {
          preprint: {
            publishedDate: new Date('2022-01-01'),
            doi: '12345',
          },
          sentForReviewDate: new Date('2022-02-01'),
          publishedDate: new Date('2022-03-01'),
        },
        {
          publishedDate: new Date('2022-05-01'),
          preprint: {},
        },
      ],
    };

    const expectedTimeline: TimelineEvent[] = [
      {
        name: 'PREPRINT_PUBLISHED',
        date: new Date('2022-01-01'),
        url: 'https://doi.org/12345',
      },
      {
        name: 'SENT_FOR_REVIEW',
        date: new Date('2022-02-01'),
      },
      {
        name: 'VERSION_PUBLISHED',
        date: new Date('2022-03-01'),
      },
      {
        name: 'VERSION_PUBLISHED',
        date: new Date('2022-05-01'),
      },
    ];

    const result = await generateTimeline((manuscriptData as ManuscriptData));

    expect(result).toEqual(expectedTimeline);
  });
});
