import axios from 'axios';
import { Context } from '@temporalio/activity';
import { transformXML, transformXMLToJson } from './convert-xml-to-json';
import { config } from '../config';

// Mock Context, axios, and config
jest.mock('@temporalio/activity', () => ({
  Context: {
    current: jest.fn().mockReturnValue({
      heartbeat: jest.fn(),
    }),
  },
}));

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../config', () => ({
  config: {
    xsltTransformAddress: 'mock-xslt-transform-address',
    encodaTransformAddress: 'mock-encoda-transform-address',
    encodaReshape: true,
  },
}));

describe('TransformXML', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should transform XML to JSON successfully', async () => {
    const xmlInput = '<root></root>';
    const response = {
      transformed: {
        to: 'json',
      },
    };

    mockedAxios.post.mockResolvedValueOnce({ headers: { 'content-type': 'application/vnd.elife.encoda.v1+json; charset=utf-8' }, data: response });

    const result = await transformXMLToJson(xmlInput, '1');

    expect(Context.current().heartbeat).toHaveBeenCalledTimes(2);
    expect(Context.current().heartbeat).toHaveBeenNthCalledWith(1, 'Starting XML to JSON transform');
    expect(Context.current().heartbeat).toHaveBeenNthCalledWith(2, 'Finishing XML to JSON transform');

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenCalledWith(config.encodaTransformAddress, xmlInput, { headers: { accept: 'application/vnd.elife.encoda.v1+json' }, params: {} });
    expect(result).toEqual({
      version: 'application/vnd.elife.encoda.v1+json',
      body: JSON.stringify(response),
    });
  });

  it('should set reshape param to false', async () => {
    const xmlInput = '<root></root>';
    const response = {
      transformed: {
        to: 'json',
      },
    };

    config.encodaReshape = false;

    mockedAxios.post.mockResolvedValueOnce({ headers: { 'content-type': 'application/vnd.elife.encoda.v1+json; charset=utf-8' }, data: response });

    const result = await transformXMLToJson(xmlInput, '1');

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenCalledWith(config.encodaTransformAddress, xmlInput, {
      headers: { accept: 'application/vnd.elife.encoda.v1+json' },
      params: {
        reshape: 'false',
      },
    });
    expect(result).toEqual({
      version: 'application/vnd.elife.encoda.v1+json',
      body: JSON.stringify(response),
    });
  });

  it('should transform XML successfully', async () => {
    const xmlInput = '<root></root>';
    const response = {
      xml: '<root>transformed</root>',
      logs: ['log1', 'log2'],
    };

    mockedAxios.post.mockResolvedValueOnce({ data: response });

    const result = await transformXML(xmlInput);

    expect(Context.current().heartbeat).toHaveBeenCalledTimes(2);
    expect(Context.current().heartbeat).toHaveBeenNthCalledWith(1, 'Starting XML transform');
    expect(Context.current().heartbeat).toHaveBeenNthCalledWith(2, 'Finishing XML transform');

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenCalledWith(config.xsltTransformAddress, xmlInput);
    expect(result).toEqual(response);
  });

  it('should handle transform error', async () => {
    const xmlInput = '<root></root>';
    const error = new Error('Error transforming XML');

    mockedAxios.post.mockRejectedValueOnce(error);

    await expect(transformXML(xmlInput)).rejects.toStrictEqual(error);

    expect(Context.current().heartbeat).toHaveBeenCalledTimes(1);
    expect(Context.current().heartbeat).toHaveBeenCalledWith('Starting XML transform');

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenCalledWith(config.xsltTransformAddress, xmlInput);
  });
});
