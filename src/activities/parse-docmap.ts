import { VersionedReviewedPreprint, parser } from '@elifesciences/docmap-ts';
import { Context } from '@temporalio/activity';

export const parseDocMap = async (docMapInput: string): Promise<parser.ManuscriptData> => {
  Context.current().heartbeat('parsing DocMap');
  const manuscriptData = parser.parsePreprintDocMap(docMapInput);

  try {
    if (!manuscriptData) { throw new Error('Manuscript data is undefined'); }

    // TO-DO: This is a temporary hack, remove/replace once DocMaps are fixed to hold the meca path in the output content
    const { steps } = JSON.parse(docMapInput);

    const contentPaths: Record<string, string> = {};
    Object.keys(steps).forEach((key) => {
      // Loop through the actions in a step and the corresponding outputs to extract _tdmPaths
      // eslint-disable-next-line @typescript-eslint/dot-notation
      steps[key].actions.forEach((action: any) => action.outputs?.forEach((output: any) => { if (output['_tdmPath']) contentPaths[output.versionIdentifier] = output['_tdmPath']; }));
    });

    manuscriptData.versions = manuscriptData.versions.reduce<VersionedReviewedPreprint[]>((versions, version) => {
      if (contentPaths[version.versionIdentifier]) {
        versions.push({ ...version, preprint: { ...version.preprint, content: contentPaths[version.versionIdentifier] } });
      }
      return versions;
    }, []);

    return manuscriptData;
  } catch (error: any) {
    throw Error(`Could not parse docmap:\n${error.message}`);
  }
};
