import { VersionedReviewedPreprint, parser } from '@elifesciences/docmap-ts';
import { Context } from '@temporalio/activity';

export const parseDocMap = async (docMapInput: string): Promise<parser.ManuscriptData> => {
  Context.current().heartbeat('parsing DocMap');
  const manuscriptData = parser.parsePreprintDocMap(docMapInput);

  try {
    // TO-DO: This is a temporary hack, remove/replace once DocMaps are fixed to hold the meca path in the output content
    const { steps } = JSON.parse(docMapInput);

    const contentPaths: string[] = [];
    Object.keys(steps).forEach((key) => {
      // Loop through the actions in a step and the corresponding outputs to extract _tdmPaths
      // eslint-disable-next-line @typescript-eslint/dot-notation
      steps[key].actions.forEach((action: any) => action.outputs?.forEach((output: any) => { if (output['_tdmPath']) contentPaths.push(output['_tdmPath']); }));
    });

    // where manuscriptData?.versions.length is 1 and contentPaths.length is 0, we get an error (i.e. when there is a preprint submitted without a published version)
    if (manuscriptData && contentPaths.length === 0) return manuscriptData;
    if (contentPaths.length === manuscriptData?.versions.length) {
      manuscriptData.versions = manuscriptData.versions.map<VersionedReviewedPreprint>((version, index) => ({ ...version, preprint: { ...version.preprint, content: contentPaths[index] } }));
    } else throw Error(`Number of tdmPaths in the DocMap (${manuscriptData?.versions.length}) from parser does not match the number of versions (${contentPaths.length})`);

    return manuscriptData;
  } catch (error: any) {
    throw Error(`Could not parse docmap:\n${error.message}`);
  }
};
