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
  },
}));

describe('ConvertXMLtoJSON', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('transformXML', () => {
    it('should transform XML successfully', async () => {
      const xml = '<root></root>';
      const response = {
        xml: '<root>transformed</root>',
        logs: ['log1', 'log2'],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: response });

      const result = await transformXML({ xml });

      expect(Context.current().heartbeat).toHaveBeenCalledTimes(2);
      expect(Context.current().heartbeat).toHaveBeenNthCalledWith(1, 'Starting XML transform');
      expect(Context.current().heartbeat).toHaveBeenNthCalledWith(2, 'Finishing XML transform');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(config.xsltTransformAddress, xml);
      expect(result).toEqual(response);
    });

    it('should handle transform error', async () => {
      const xml = '<root></root>';
      const error = new Error('Error transforming XML');

      mockedAxios.post.mockRejectedValueOnce(error);

      await expect(transformXML({ xml })).rejects.toStrictEqual(error);

      expect(Context.current().heartbeat).toHaveBeenCalledTimes(1);
      expect(Context.current().heartbeat).toHaveBeenCalledWith('Starting XML transform');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(config.xsltTransformAddress, xml);
    });

    it('should bypass xslt transforms if passthrough set', async () => {
      const xml = '<root></root>';
      const response = {
        xml: '<root>transformed</root>',
        logs: ['passthrough'],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: response });

      const result = await transformXML({ xml, xsltTransformPassthrough: true });

      expect(Context.current().heartbeat).toHaveBeenCalledTimes(2);
      expect(Context.current().heartbeat).toHaveBeenNthCalledWith(1, 'Starting XML transform');
      expect(Context.current().heartbeat).toHaveBeenNthCalledWith(2, 'Finishing XML transform');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        config.xsltTransformAddress,
        xml,
        {
          headers: {
            'X-Passthrough': 'true',
          },
        },
      );
      expect(result).toEqual(response);
    });

    it('should set blacklist header if set', async () => {
      const xml = '<root></root>';
      const response = {
        xml: '<root>transformed</root>',
        logs: ['blacklist'],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: response });

      const result = await transformXML({ xml, xsltBlacklist: 'file.xsl' });

      expect(Context.current().heartbeat).toHaveBeenCalledTimes(2);
      expect(Context.current().heartbeat).toHaveBeenNthCalledWith(1, 'Starting XML transform');
      expect(Context.current().heartbeat).toHaveBeenNthCalledWith(2, 'Finishing XML transform');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        config.xsltTransformAddress,
        xml,
        {
          headers: {
            'X-Blacklist': 'file.xsl',
          },
        },
      );
      expect(result).toEqual(response);
    });
  });

  describe('transformXMLToJson', () => {
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
  });
});
