import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities/index';
import { DocMap, ParseResult } from '../docmaps';

const {
  parseDocMap,
  identifyPreprintLocation,
  // fetchMeca,
  // extractMeca,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

type DocMapImportOutput = {
  result: ParseResult,
  mecaLocation?: string,
};

export async function importDocmap(docMap: DocMap): Promise<DocMapImportOutput> {
  const result = await parseDocMap(docMap);

  const dois = result.versions.map((version) => {
    const bioRxivUrl = version.contentUrls.find((url) => url.startsWith('https://doi.org/10.1101/'));
    if (bioRxivUrl) {
      const doi = bioRxivUrl.match(/https:\/\/doi.org\/(10.1101\/.+)/);
      if (doi) {
        return doi[1];
      }
    }
    return undefined;
  }).filter((urlOrUndefined: string | undefined): urlOrUndefined is string => !!urlOrUndefined);

  if (dois.length === 1) {
    const mecaLocation = await identifyPreprintLocation(dois[0]);
    return {
      mecaLocation,
      result,
    };
  }

  return {
    result,
  };
}
