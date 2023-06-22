import { Context } from '@temporalio/activity';
import axios from 'axios';
import { config } from '../config';

export const removeVersionFromEpp = async (id: string): Promise<boolean> => {
  const versionImportUri = `${config.eppServerUri}/preprints/delete/${id}`;

  try {
    Context.current().heartbeat('Removing docmap from EPP');
    const { result, message } = await axios.post(versionImportUri).then(async (response) => response.data);
    if (!result) {
      throw new Error(`Failed to remove version: ${message}`);
    }
    return result;
  } catch (error: any) {
    throw new Error(`Failed to remove version: ${error.response.data.message}`);
  }
};
