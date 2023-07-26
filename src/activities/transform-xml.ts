import { Context } from '@temporalio/activity';
import axios from 'axios';
import { config } from '../config';

type TransformResponse = {
  xml: string,
  logs: string[],
};

export const transformXML = async (xmlInput: string): Promise<string> => {
  Context.current().heartbeat('Starting XML transform');
  const transformedResponse = await axios.post<TransformResponse>(config.xsltTransformAddress, xmlInput);
  const transformedXML = transformedResponse.data.xml;

  Context.current().heartbeat('Finishing XML transform');
  return transformedXML;
};
