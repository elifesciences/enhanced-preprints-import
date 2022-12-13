import { convert } from '@stencila/encoda';
import { writeFileSync } from 'fs';
import { dirname } from 'path';

export const convertXmlToJson = async (doi: string, xmlFilePath: string): Promise<string> => {
  const converted = await convert(
    xmlFilePath,
    undefined, // require undefined to return html, causes console output
    {
      from: 'jats',
      to: 'json',
      encodeOptions: {
        isBundle: false,
      },
    },
  );

  if (converted === undefined) {
    throw new Error(`Could not convert XML file ${xmlFilePath}`);
  }

  // correct any paths in the json
  const corrected = converted.replaceAll(dirname(xmlFilePath), doi);

  const outputFilePath = `${xmlFilePath}.json`;
  writeFileSync(outputFilePath, corrected);

  return outputFilePath;
};
