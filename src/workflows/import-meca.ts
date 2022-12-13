import { proxyActivities } from '@temporalio/workflow';
import { MecaFiles } from '../activities/extract-meca';
import type * as activities from '../activities/index';

const {
  identifyPreprintLocation,
  fetchMeca,
  extractMeca,
  convertXmlToJson,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

type ImportMecaArgs = {
  id: string,
  version: string,
  preprintDoi: string,
};

type ImportMecaOutput = MecaFiles & {
  preprintPath: string,
  localMecaPath: string,
  json: string,
};

export async function importMeca(args: ImportMecaArgs): Promise<ImportMecaOutput> {
  const preprintPath = await identifyPreprintLocation(args.preprintDoi);
  const { file, dir } = await fetchMeca(args.id, args.version, args.preprintDoi, preprintPath);
  const mecaFiles = await extractMeca(file, dir);
  const json = await convertXmlToJson(mecaFiles.id, mecaFiles.article.path);
  return {
    preprintPath,
    localMecaPath: file,
    json,
    ...mecaFiles,
  };
}
