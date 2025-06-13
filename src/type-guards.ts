import { VersionedPreprint, VersionedReviewedPreprint } from '@elifesciences/docmap-ts';
import { VersionOfRecord } from './types';

export const isVersionedReviewedPreprint = (version: any): version is VersionedReviewedPreprint => 'preprint' in version;

export const isVersionedPreprint = (version: any): version is VersionedPreprint => 'content' in version && 'url' in version;

export const isVersionOfRecord = (version: any): version is VersionOfRecord => 'content' in version && !('url' in version) && !('preprint' in version);
