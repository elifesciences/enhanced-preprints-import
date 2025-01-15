import axios from 'axios';
import { Context } from '@temporalio/activity';
import { VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { transformXML, transformXMLToJson, updateMecaFilePaths } from './convert-xml-to-json';
import { config } from '../config';
import { MecaFile, MecaFiles } from './extract-meca';
import { getPrefixlessKey } from '../S3Bucket';

jest.mock('../S3Bucket', () => ({
  constructEPPVersionS3FilePath: jest.fn(),
  getPrefixlessKey: jest.fn(), // .mockImplementation(() => '456/v1/content/123/foo'),
}));

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

  describe('updateMecaFilePaths', () => {
    it.each([
      {
        prefixlessKey: '456/v1/simple/foo',
        articleXml: 'simple/123.xml',
        items: [
          {
            fileName: 'file1.pdf',
            path: 'simple/supplements/file1.pdf',
          },
        ],
        jsonString: '{ "contentUrl": "supplements/file1.pdf"}',
        expected: '{ "contentUrl": "456/v1/simple/supplements/file1.pdf"}',
      },
      {
        prefixlessKey: '456/v1/sub/folder/foo',
        articleXml: 'sub/folder/123.xml',
        items: [
          {
            fileName: 'file1.pdf',
            path: 'sub/folder/supplements/file1.pdf',
          },
        ],
        jsonString: '{ "target": "supplements/file1.pdf"}',
        expected: '{ "target": "456/v1/sub/folder/supplements/file1.pdf"}',
      },
      {
        prefixlessKey: '456/v1/no-match/foo',
        articleXml: 'no-match/123.xml',
        items: [
          {
            fileName: 'file2.pdf',
            path: 'no-match/supplements/file2.pdf',
          },
        ],
        jsonString: '{ "contentUrl": "supplements/file1.pdf", "non-target": "supplements/file2.pdf"}',
        expected: '{ "contentUrl": "supplements/file1.pdf", "non-target": "supplements/file2.pdf"}',
      },
      {
        prefixlessKey: '456/v1/irregular-spacing/foo',
        articleXml: 'irregular-spacing/123.xml',
        items: [
          {
            fileName: 'file1.pdf',
            path: 'irregular-spacing/supplements/file1.pdf',
          },
        ],
        jsonString: '{ "target"    :   "supplements/file1.pdf", "contentUrl"  :"supplements/file1.pdf"}',
        expected: '{ "target"    :   "456/v1/irregular-spacing/supplements/file1.pdf", "contentUrl"  :"456/v1/irregular-spacing/supplements/file1.pdf"}',
      },
      {
        prefixlessKey: '456/v1/multiple/foo',
        articleXml: 'multiple/123.xml',
        items: [
          {
            fileName: 'file1.pdf',
            path: 'multiple/supplements/file1.pdf',
          },
          {
            fileName: 'file2.doc',
            path: 'multiple/supplements/file2.doc',
          },
          {
            fileName: 'file3.xlsx',
            path: 'multiple/file3.xlsx',
          },
        ],
        jsonString: '{ "target": "supplements/file1.pdf", "contentUrl": "supplements/file2.doc", "contentUrl": "file3.xlsx"}',
        expected: '{ "target": "456/v1/multiple/supplements/file1.pdf", "contentUrl": "456/v1/multiple/supplements/file2.doc", "contentUrl": "456/v1/multiple/file3.xlsx"}',
      },
    ])('return updated path in json string ($prefixlessKey)', async ({
      prefixlessKey,
      articleXml,
      items,
      jsonString,
      expected,
    }) => {
      (getPrefixlessKey as jest.Mock).mockReturnValue(prefixlessKey);
      const version = { id: '456', versionIdentifier: '1' } as VersionedReviewedPreprint;
      const mecaFiles: MecaFiles = {
        id: '456',
        title: 'foo',
        article: { path: articleXml } as MecaFile,
        supportingFiles: items.map((item) => ({
          id: 'foo',
          type: 'bar',
          mimeType: 'stuff',
          ...item,
        })),
      };
      const { jsonString: jsonStringResult } = updateMecaFilePaths({ jsonString, version, mecaFiles });

      expect(jsonStringResult).toEqual(expected);
    });
  });
});
