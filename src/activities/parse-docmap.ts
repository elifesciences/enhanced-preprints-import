import { VersionedReviewedPreprint, parser } from '@elifesciences/docmap-ts';

export const parseDocMap = async (docMapInput: string): Promise<parser.ManuscriptData> => {
  const manuscriptData = parser.parsePreprintDocMap(docMapInput);

  try {
    // TO-DO: This is a temporary hack, remove/replace once DocMaps are fixed to hold the meca path in the output content
    const { steps } = JSON.parse(docMapInput);

    const contentPaths: Map<string, string> = new Map();
    Object.keys(steps).forEach((key) => {
      // Loop through the actions in a step and the corresponding outputs to extract _tdmPaths
      // eslint-disable-next-line @typescript-eslint/dot-notation
      steps[key].actions.forEach((action: any) => action.outputs?.forEach((output: any) => { if (output['_tdmPath'] && output['versionIdentifier']) contentPaths.set(output['versionIdentifier'], output['_tdmPath']); }));
    });

    if (manuscriptData && manuscriptData.versions.length >= contentPaths.size) {
      manuscriptData.versions = manuscriptData.versions
        .filter((version) => contentPaths.has(version.versionIdentifier))
        .map<VersionedReviewedPreprint>((version) => ({ ...version, preprint: { ...version.preprint, content: contentPaths.get(version.versionIdentifier) } }));
    } else throw Error(`Number of versions (${manuscriptData?.versions.length}) from parser does not match or exceed the number of tdmPaths in the DocMap (${contentPaths.size})`);

    return manuscriptData;
  } catch (error: any) {
    throw Error(`Could not parse docmap:\n${error.message}`);
  }
};
