import { createCacheStorageBarrier } from './cacheStorageBarrier';

import type { PathshalaPath } from '@/lib/pathshala-types';
import { spiritualDate } from '@/lib/spiritualDate';

export const PATHSHALA_CACHE_SCHEMA_VERSION = 1;

export type PathshalaEnrollment = {
  path_id: string;
  current_lesson: number | null;
  completed_lessons: number[] | null;
  status: string | null;
};

export type PathshalaSacredText = {
  label: string;
  icon: string;
  original: string;
  transliteration: string;
  meaning: string;
  source: string;
};

export type PathshalaCachePayload = {
  paths: PathshalaPath[];
  enrollments: PathshalaEnrollment[];
  tradition: string;
  sacredText: PathshalaSacredText | null;
  spiritualDate: string;
  timezone: string;
};

export type PathshalaLessonEntry = {
  id: string;
  source: string;
  original: string;
  transliteration?: string;
  meaning?: string;
};

export type PathshalaLesson = { title: string; entries: PathshalaLessonEntry[] };
export type PathshalaPathDetail = {
  path: PathshalaPath;
  lessons: PathshalaLesson[];
  locked: boolean;
};

type PathshalaCacheEnvelope = {
  schemaVersion: number;
  userId: string;
  savedAt: number;
  payload: PathshalaCachePayload;
};

const DETAIL_CACHE_PREFIX = 'shoonaya_pathshala_detail_v1_';
const detailSnapshots = new Map<string, PathshalaPathDetail>();
const detailReads = new Map<string, Promise<PathshalaPathDetail | null>>();
const cacheStorage = createCacheStorageBarrier((key) =>
  key.startsWith('shoonaya_pathshala_cache_v1_user_') || key.startsWith(DETAIL_CACHE_PREFIX)
);

function cacheKey(userId: string): string {
  return `shoonaya_pathshala_cache_v1_user_${userId}`;
}

function detailCacheKey(identityKey: string, pathId: string): string {
  return `${DETAIL_CACHE_PREFIX}${encodeURIComponent(identityKey)}_${encodeURIComponent(pathId)}`;
}

export function getPathshalaDetailCacheSnapshot(identityKey: string, pathId: string): PathshalaPathDetail | null {
  return detailSnapshots.get(detailCacheKey(identityKey, pathId)) ?? null;
}

function isValidDetail(value: unknown): value is PathshalaPathDetail {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return Boolean(
    candidate.path && typeof candidate.path === 'object' &&
    Array.isArray(candidate.lessons) && typeof candidate.locked === 'boolean' &&
    candidate.lessons.every((lesson) => lesson && typeof lesson === 'object' &&
      typeof lesson.title === 'string' && Array.isArray(lesson.entries))
  );
}

export async function readPathshalaDetailCache(identityKey: string, pathId: string): Promise<PathshalaPathDetail | null> {
  const key = detailCacheKey(identityKey, pathId);
  const snapshot = detailSnapshots.get(key);
  if (snapshot) return snapshot;
  const existing = detailReads.get(key);
  if (existing) return existing;
  const read = (async () => {
    try {
      const stored = await cacheStorage.read(key);
      if (!stored) return null;
      try {
        const envelope = JSON.parse(stored.value) as { version?: number; detail?: unknown };
        if (envelope.version !== 1 || !isValidDetail(envelope.detail)) {
          await stored.discard().catch(() => {});
          return null;
        }
        detailSnapshots.set(key, envelope.detail);
        return envelope.detail;
      } catch {
        await stored.discard().catch(() => {});
        return null;
      }
    } catch (error) {
      console.warn('[PathshalaCache] detail read failed', error);
      return null;
    } finally {
      detailReads.delete(key);
    }
  })();
  detailReads.set(key, read);
  return read;
}

export async function writePathshalaDetailCache(identityKey: string, pathId: string, detail: PathshalaPathDetail): Promise<void> {
  // Never persist locked payloads: entitlement-gated responses must not be
  // reusable after the account's subscription changes.
  if (detail.locked) return;
  const key = detailCacheKey(identityKey, pathId);
  detailSnapshots.set(key, detail);
  try {
    await cacheStorage.setItem(key, JSON.stringify({ version: 1, detail }));
  } catch (error) {
    console.warn('[PathshalaCache] detail write failed', error);
  }
}

function isValidPayload(value: unknown): value is PathshalaCachePayload {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.paths) &&
    Array.isArray(candidate.enrollments) &&
    typeof candidate.tradition === 'string' &&
    (candidate.sacredText === null || typeof candidate.sacredText === 'object') &&
    typeof candidate.spiritualDate === 'string' &&
    typeof candidate.timezone === 'string'
  );
}

export async function readPathshalaCache(userId: string, now: Date = new Date()): Promise<PathshalaCachePayload | null> {
  const key = cacheKey(userId);
  try {
    const stored = await cacheStorage.read(key);
    if (!stored) return null;
    const raw = stored.value;

    let parsed: Partial<PathshalaCacheEnvelope>;
    try {
      parsed = JSON.parse(raw) as Partial<PathshalaCacheEnvelope>;
    } catch {
      await stored.discard().catch(() => {});
      return null;
    }

    if (
      parsed.schemaVersion !== PATHSHALA_CACHE_SCHEMA_VERSION ||
      parsed.userId !== userId ||
      !isValidPayload(parsed.payload)
    ) {
      await stored.discard().catch(() => {});
      return null;
    }

    if (parsed.payload.spiritualDate !== spiritualDate(parsed.payload.timezone, now)) {
      return { ...parsed.payload, sacredText: null };
    }
    return parsed.payload;
  } catch (error) {
    console.warn('[PathshalaCache] read failed', error);
    return null;
  }
}

export async function writePathshalaCache(userId: string, payload: PathshalaCachePayload): Promise<void> {
  const envelope: PathshalaCacheEnvelope = {
    schemaVersion: PATHSHALA_CACHE_SCHEMA_VERSION,
    userId,
    savedAt: Date.now(),
    payload,
  };
  try {
    await cacheStorage.setItem(cacheKey(userId), JSON.stringify(envelope));
  } catch (error) {
    console.warn('[PathshalaCache] write failed', error);
  }
}

export async function clearAllPathshalaCaches(): Promise<void> {
  detailSnapshots.clear();
  detailReads.clear();
  try {
    await cacheStorage.clearAll();
  } catch (error) {
    console.warn('[PathshalaCache] clearAll failed', error);
  }
}
