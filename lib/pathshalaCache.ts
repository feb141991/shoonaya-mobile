import AsyncStorage from '@react-native-async-storage/async-storage';

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

type PathshalaCacheEnvelope = {
  schemaVersion: number;
  userId: string;
  savedAt: number;
  payload: PathshalaCachePayload;
};

function cacheKey(userId: string): string {
  return `shoonaya_pathshala_cache_v1_user_${userId}`;
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
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    let parsed: Partial<PathshalaCacheEnvelope>;
    try {
      parsed = JSON.parse(raw) as Partial<PathshalaCacheEnvelope>;
    } catch {
      await AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }

    if (
      parsed.schemaVersion !== PATHSHALA_CACHE_SCHEMA_VERSION ||
      parsed.userId !== userId ||
      !isValidPayload(parsed.payload)
    ) {
      await AsyncStorage.removeItem(key).catch(() => {});
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
    await AsyncStorage.setItem(cacheKey(userId), JSON.stringify(envelope));
  } catch (error) {
    console.warn('[PathshalaCache] write failed', error);
  }
}

export async function clearAllPathshalaCaches(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const pathshalaKeys = keys.filter((key) => key.startsWith('shoonaya_pathshala_cache_v1_user_'));
    if (pathshalaKeys.length > 0) await AsyncStorage.multiRemove(pathshalaKeys);
  } catch (error) {
    console.warn('[PathshalaCache] clearAll failed', error);
  }
}
