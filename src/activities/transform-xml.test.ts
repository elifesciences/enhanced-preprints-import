import axios from 'axios';
import { Context } from '@temporalio/activity';
import { transformXML } from './transform-xml';
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
  },
}));

describe('TransformXML', () => {
  afterEach(() => {
    jest.clearAllMocks();
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
    expect(result).toEqual(response.xml);
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
