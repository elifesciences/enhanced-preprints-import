import { type VersionedPreprint, type VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { type VersionOfRecord } from './types';

export const isVersionedReviewedPreprint = (version: any): version is VersionedReviewedPreprint => 'preprint' in version;

export const isVersionedPreprint = (version: any): version is VersionedPreprint => 'content' in version && 'url' in version;

export const isVersionOfRecord = (version: any): version is VersionOfRecord => 'content' in version && !('url' in version) && !('preprint' in version);
