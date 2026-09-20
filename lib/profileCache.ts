/**
 * Identity-scoped, render-safe Profile cache.
 *
 * Subscription state, permissions, security claims, and direct identifiers
 * such as email are deliberately excluded. Those values must come from the
 * live authenticated session or API response.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PROFILE_CACHE_SCHEMA_VERSION = 1;

export type ProfileCacheIdentity =
  | { kind: 'authenticated'; userId: string }
  | { kind: 'guest' };

type CachedTradition = 'hindu' | 'sikh' | 'buddhist' | 'jain' | 'none';
type CachedAppLanguage = 'en' | 'hi' | 'pa';

export type CachedProfileRenderModel = {
  profile: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
    tradition: CachedTradition;
    sampradaya: string;
    ishta_devata: string;
    city: string;
    country: string;
    life_stage: string;
    app_language: CachedAppLanguage;
    active_symbol_id: string | null;
    seva_score: number;
    kul_id: string | null;
    kul_name: string | null;
  };
  summary: {
    completion: {
      pct: number;
      missing: string[];
      coreComplete?: boolean;
    };
    progress: {
      practices: { completed: number; total: number };
      streaks: { shloka: number; bestShloka: number; nitya: number; bestNitya: number };
      pathshala: { completedLessons: number };
      quiz: { doneToday: boolean };
      highlights: {
        totalBeads: number;
        totalRounds: number;
        totalMinutes: number;
        totalSessions: number;
        topMantra: string | null;
        nityaDays: number;
        pathshalaEntriesOpened: number;
        bookmarkedVerses: number;
      };
    };
  };
};

type ProfileCacheEnvelope = {
  schemaVersion: number;
  identity: ProfileCacheIdentity;
  savedAt: number;
  payload: unknown;
};

const GUEST_KEY = 'shoonaya_profile_cache_v1_guest';
const USER_KEY_PREFIX = 'shoonaya_profile_cache_v1_user_';

export function getProfileCacheKey(identity: ProfileCacheIdentity): string {
  return identity.kind === 'guest' ? GUEST_KEY : `${USER_KEY_PREFIX}${identity.userId}`;
}

const memorySnapshotMap = new Map<string, CachedProfileRenderModel>();
const inFlightDiskReadMap = new Map<string, Promise<CachedProfileRenderModel | null>>();
const keyInvalidationGeneration = new Map<string, number>();
let globalInvalidationGeneration = 0;
let clearAllInFlight: Promise<void> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isTradition(value: unknown): value is CachedTradition {
  return value === 'hindu' || value === 'sikh' || value === 'buddhist' || value === 'jain' || value === 'none';
}

function isAppLanguage(value: unknown): value is CachedAppLanguage {
  return value === 'en' || value === 'hi' || value === 'pa';
}

/** Validates every render dependency and returns a strict field whitelist. */
export function sanitizeProfileCachePayload(value: unknown): CachedProfileRenderModel | null {
  if (!isRecord(value) || !isRecord(value.profile) || !isRecord(value.summary)) return null;
  const profile = value.profile;
  const summary = value.summary;
  if (!isRecord(summary.completion) || !isRecord(summary.progress)) return null;
  const completion = summary.completion;
  const progress = summary.progress;
  if (
    !isRecord(progress.practices) ||
    !isRecord(progress.streaks) ||
    !isRecord(progress.pathshala) ||
    !isRecord(progress.quiz) ||
    !isRecord(progress.highlights)
  ) return null;

  const missing = completion.missing;
  const coreComplete = completion.coreComplete;
  const h = progress.highlights;
  if (
    !isString(profile.id) || profile.id.length === 0 ||
    !isString(profile.full_name) ||
    !isString(profile.username) ||
    !isNullableString(profile.avatar_url) ||
    !isTradition(profile.tradition) ||
    !isString(profile.sampradaya) ||
    !isString(profile.ishta_devata) ||
    !isString(profile.city) ||
    !isString(profile.country) ||
    !isString(profile.life_stage) ||
    !isAppLanguage(profile.app_language) ||
    !isNullableString(profile.active_symbol_id) ||
    !isFiniteNumber(profile.seva_score) ||
    !isNullableString(profile.kul_id) ||
    !isNullableString(profile.kul_name) ||
    !isFiniteNumber(completion.pct) ||
    !Array.isArray(missing) || !missing.every(isString) ||
    (coreComplete !== undefined && typeof coreComplete !== 'boolean') ||
    !isFiniteNumber(progress.practices.completed) ||
    !isFiniteNumber(progress.practices.total) ||
    !isFiniteNumber(progress.streaks.shloka) ||
    !isFiniteNumber(progress.streaks.bestShloka) ||
    !isFiniteNumber(progress.streaks.nitya) ||
    !isFiniteNumber(progress.streaks.bestNitya) ||
    !isFiniteNumber(progress.pathshala.completedLessons) ||
    typeof progress.quiz.doneToday !== 'boolean' ||
    !isFiniteNumber(h.totalBeads) ||
    !isFiniteNumber(h.totalRounds) ||
    !isFiniteNumber(h.totalMinutes) ||
    !isFiniteNumber(h.totalSessions) ||
    !isNullableString(h.topMantra) ||
    !isFiniteNumber(h.nityaDays) ||
    !isFiniteNumber(h.pathshalaEntriesOpened) ||
    !isFiniteNumber(h.bookmarkedVerses)
  ) return null;

  return {
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      username: profile.username,
      avatar_url: profile.avatar_url,
      tradition: profile.tradition,
      sampradaya: profile.sampradaya,
      ishta_devata: profile.ishta_devata,
      city: profile.city,
      country: profile.country,
      life_stage: profile.life_stage,
      app_language: profile.app_language,
      active_symbol_id: profile.active_symbol_id,
      seva_score: profile.seva_score,
      kul_id: profile.kul_id,
      kul_name: profile.kul_name,
    },
    summary: {
      completion: {
        pct: completion.pct,
        missing: [...missing],
        ...(coreComplete === undefined ? {} : { coreComplete }),
      },
      progress: {
        practices: { completed: progress.practices.completed, total: progress.practices.total },
        streaks: {
          shloka: progress.streaks.shloka,
          bestShloka: progress.streaks.bestShloka,
          nitya: progress.streaks.nitya,
          bestNitya: progress.streaks.bestNitya,
        },
        pathshala: { completedLessons: progress.pathshala.completedLessons },
        quiz: { doneToday: progress.quiz.doneToday },
        highlights: {
          totalBeads: h.totalBeads,
          totalRounds: h.totalRounds,
          totalMinutes: h.totalMinutes,
          totalSessions: h.totalSessions,
          topMantra: h.topMantra,
          nityaDays: h.nityaDays,
          pathshalaEntriesOpened: h.pathshalaEntriesOpened,
          bookmarkedVerses: h.bookmarkedVerses,
        },
      },
    },
  };
}

function getKeyGeneration(key: string): number {
  return keyInvalidationGeneration.get(key) ?? 0;
}

function invalidateKey(key: string): void {
  keyInvalidationGeneration.set(key, getKeyGeneration(key) + 1);
}

export function getProfileCacheSnapshot(identity: ProfileCacheIdentity): CachedProfileRenderModel | null {
  return memorySnapshotMap.get(getProfileCacheKey(identity)) ?? null;
}

export function getOrReadProfileCache(identity: ProfileCacheIdentity): Promise<CachedProfileRenderModel | null> {
  const key = getProfileCacheKey(identity);
  const existing = inFlightDiskReadMap.get(key);
  if (existing) return existing;

  const globalGenerationAtStart = globalInvalidationGeneration;
  const keyGenerationAtStart = getKeyGeneration(key);
  const pendingClearAll = clearAllInFlight;
  let readPromise!: Promise<CachedProfileRenderModel | null>;
  readPromise = (async () => {
    try {
      if (pendingClearAll) await pendingClearAll;
      const result = await readProfileCache(identity);
      const isStillCurrent =
        globalGenerationAtStart === globalInvalidationGeneration &&
        keyGenerationAtStart === getKeyGeneration(key);
      if (isStillCurrent) {
        if (result) memorySnapshotMap.set(key, result);
        else memorySnapshotMap.delete(key);
      }
      return isStillCurrent ? result : null;
    } finally {
      if (inFlightDiskReadMap.get(key) === readPromise) inFlightDiskReadMap.delete(key);
    }
  })();

  inFlightDiskReadMap.set(key, readPromise);
  return readPromise;
}

export async function readProfileCache(identity: ProfileCacheIdentity): Promise<CachedProfileRenderModel | null> {
  const key = getProfileCacheKey(identity);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    let envelope: ProfileCacheEnvelope;
    try {
      envelope = JSON.parse(raw) as ProfileCacheEnvelope;
    } catch {
      await AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }

    const identityMatches = identity.kind === 'guest'
      ? envelope?.identity?.kind === 'guest'
      : envelope?.identity?.kind === 'authenticated' && envelope.identity.userId === identity.userId;
    const sanitized = sanitizeProfileCachePayload(envelope?.payload);
    const profileOwnerMatches = identity.kind === 'guest' || sanitized?.profile.id === identity.userId;
    if (
      !envelope ||
      envelope.schemaVersion !== PROFILE_CACHE_SCHEMA_VERSION ||
      !identityMatches ||
      !sanitized ||
      !profileOwnerMatches
    ) {
      await AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }

    return sanitized;
  } catch (error) {
    console.warn('[ProfileCache] read failed', error);
    return null;
  }
}

export async function writeProfileCache(identity: ProfileCacheIdentity, payload: unknown): Promise<void> {
  const sanitized = sanitizeProfileCachePayload(payload);
  if (!sanitized) return;
  if (identity.kind === 'authenticated' && sanitized.profile.id !== identity.userId) return;

  const key = getProfileCacheKey(identity);
  const envelope: ProfileCacheEnvelope = {
    schemaVersion: PROFILE_CACHE_SCHEMA_VERSION,
    identity,
    savedAt: Date.now(),
    payload: sanitized,
  };
  memorySnapshotMap.set(key, sanitized);

  try {
    await AsyncStorage.setItem(key, JSON.stringify(envelope));
  } catch (error) {
    console.warn('[ProfileCache] write failed', error);
  }
}

export async function clearProfileCache(identity?: ProfileCacheIdentity): Promise<void> {
  try {
    if (!identity) {
      await clearAllProfileCaches();
      return;
    }
    const key = getProfileCacheKey(identity);
    invalidateKey(key);
    memorySnapshotMap.delete(key);
    inFlightDiskReadMap.delete(key);
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.warn('[ProfileCache] clear failed', error);
  }
}

export function clearAllProfileCaches(): Promise<void> {
  globalInvalidationGeneration += 1;
  memorySnapshotMap.clear();
  inFlightDiskReadMap.clear();
  keyInvalidationGeneration.clear();

  const clearPromise = (async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const profileKeys = keys.filter((key) => key === GUEST_KEY || key.startsWith(USER_KEY_PREFIX));
      if (profileKeys.length > 0) await AsyncStorage.multiRemove(profileKeys);
    } catch (error) {
      console.warn('[ProfileCache] clearAll failed', error);
    }
  })();

  clearAllInFlight = clearPromise;
  return clearPromise.finally(() => {
    if (clearAllInFlight === clearPromise) clearAllInFlight = null;
  });
}
