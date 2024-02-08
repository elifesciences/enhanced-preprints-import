import axios from 'axios';
import { GetObjectCommand, NoSuchKey, PutObjectCommand } from '@aws-sdk/client-s3';
import { constructEPPStateS3FilePath, getEPPS3Client } from '../S3Bucket';
import { DocMapHashes, DocMapIndex, DocMapWithHashes } from '../types';
import { createDocMapHash } from './create-docmap-hash';

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

  const importableDocmapsWithHashes = (await Promise.all(result.docmaps.map<Promise<DocMapWithHashes>>(async (docMap) => ({
    docMap,
    docMapHashes: await createDocMapHash(docMap),
  }))))
    .filter((docMapWithHashes) => !docmapHashes.some((hash) => hash.docMapHash === docMapWithHashes.docMapHashes.docMapHash))
    .slice(start, end);

  return importableDocmapsWithHashes.map((docMapsWithHashes) => docMapsWithHashes.docMapHashes);
};

export const mergeDocmapState = async (newDocmapHashes: DocMapHashes[], s3StateFile?: string): Promise<boolean> => {
  if (!s3StateFile) {
    return false;
  }

  const s3 = getEPPS3Client();
  const docmapHashesMap = new Map<string, DocMapHashes>();

  try {
    const source = constructEPPStateS3FilePath(s3StateFile);
    const retrievedDocmapHashes = JSON.parse(await s3.send(new GetObjectCommand({
      Bucket: source.Bucket,
      Key: source.Key,
    })).then((obj) => obj.Body?.transformToString() ?? '')) as DocMapHashes[];

    // Add existing hashes to the map using array iteration
    retrievedDocmapHashes.forEach((hash) => docmapHashesMap.set(hash.docMapId, hash));
  } catch (err) {
    // nothing added to docmapHashes
  }

  // Merge new hashes using array iteration, overwriting any duplicates
  newDocmapHashes.forEach((newHash) => docmapHashesMap.set(newHash.docMapId, newHash));

  // Convert the map back to an array
  const mergedDocmapHashes = Array.from(docmapHashesMap.values());

  const destination = constructEPPStateS3FilePath(s3StateFile);
  await s3.send(new PutObjectCommand({
    Bucket: destination.Bucket,
    Key: destination.Key,
    Body: JSON.stringify(mergedDocmapHashes),
  }));

  return true;
};
