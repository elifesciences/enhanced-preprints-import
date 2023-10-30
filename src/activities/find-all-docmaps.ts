import axios from 'axios';
import { DocMap } from '@elifesciences/docmap-ts';
import { MD5 } from 'object-hash';
import { GetObjectCommand, NoSuchKey, PutObjectCommand } from '@aws-sdk/client-s3';
import { constructEPPStateS3FilePath, getEPPS3Client } from '../S3Bucket';

type DocMapIndex = {
  docmaps: DocMap[],
};

type DocMapHashes = {
  docMapId: string,
  docMapHash: string,
  docMapIdHash: string,
};

type DocMapWithHashes = {
  docMap: DocMap,
  docMapHashes: DocMapHashes,
};

export const filterDocmapIndex = async (docMapIndex: string, s3StateFile?: string, start?: number, end?: number): Promise<DocMapHashes[]> => {
  const docmapHashes: DocMapHashes[] = [];

  if (s3StateFile) {
    try {
      const s3 = getEPPS3Client();
      const source = constructEPPStateS3FilePath(s3StateFile);
      const retreivedDocmapHashes = JSON.parse(await s3.send(new GetObjectCommand({
        Bucket: source.Bucket,
        Key: source.Key,
      })).then((obj) => obj.Body?.transformToString() ?? '')) as DocMapHashes[];

      docmapHashes.push(...retreivedDocmapHashes);
    } catch (err) {
      if (!(err instanceof NoSuchKey)) {
        throw err;
      }
      // nothing added to docmapHashes
    }
  }

  const { data: result } = await axios.get<DocMapIndex>(docMapIndex);

  const importableDocmapsWithHashes = result.docmaps.map<DocMapWithHashes>((docMap) => ({
    docMap,
    docMapHashes: {
      docMapId: docMap.id,
      docMapHash: MD5(docMap),
      docMapIdHash: MD5(docMap.id),
    },
  }))
    .filter((docMapWithHashes) => !docmapHashes.some((hash) => hash.docMapHash === docMapWithHashes.docMapHashes.docMapHash))
    .slice(start, end);

  return importableDocmapsWithHashes.map((docMapsWithHashes) => docMapsWithHashes.docMapHashes);
};

export const mergeDocmapState = async (newDocmapHashes: DocMapHashes[], s3StateFile?: string): Promise<boolean> => {
  const docmapHashes = [];
  if (s3StateFile) {
    const s3 = getEPPS3Client();
    try {
      const source = constructEPPStateS3FilePath(s3StateFile);
      const retreivedDocmapHashes = JSON.parse(await s3.send(new GetObjectCommand({
        Bucket: source.Bucket,
        Key: source.Key,
      })).then((obj) => obj.Body?.transformToString() ?? '')) as DocMapHashes[];
      docmapHashes.push(...retreivedDocmapHashes);
    } catch (err) {
      // nothing added to docmapHashes
    }
    docmapHashes.push(...newDocmapHashes);

    const destination = constructEPPStateS3FilePath(s3StateFile);
    s3.send(new PutObjectCommand({
      Bucket: destination.Bucket,
      Key: destination.Key,
      Body: JSON.stringify(docmapHashes),
    }));
    return true;
  }
  return false;
};
