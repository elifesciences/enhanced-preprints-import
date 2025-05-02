import axios from 'axios';
import { ApplicationFailure, Context } from '@temporalio/activity';
import { config } from '../config';

export const deleteManuscript = async (identifier: string): Promise<string[]> => {
  try {
    Context.current().heartbeat('Delete Manuscript from EPP');
    const versions = await axios.get<{ versions: Record<string, {}>[] }>(`${config.eppServerUri}/api/preprints/${identifier}`).then(({ data }) => Object.keys(data.versions));
    await Promise.all(versions.map((id) => axios.delete(`${config.eppServerUri}/preprints/${id}`)));
    return versions.map((id) => `Successfully deleted (${id})`);
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return [`Preprint not found (${identifier})`];
    }
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(error.response.data));
    throw new ApplicationFailure(
      `Failed to delete preprint ${identifier} EPP: ${error.response.data.message}`,
      'epp-server',
      undefined,
      [error.response.data.error],
      error,
    );
  }
};
