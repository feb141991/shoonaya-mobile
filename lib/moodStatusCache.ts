import { createCacheStorageBarrier } from './cacheStorageBarrier';
import type { MoodStatus } from './mood';
import { getMoodSpiritualDate, getMoodTimeZone } from './moodPulsePreference';

// Reliability plan item 6: paints today's already-known check-in status
// instantly, scoped to account, device timezone, and the same 4 a.m.
// spiritual day used by the status endpoint.
const MOOD_STATUS_CACHE_KEY = 'shoonaya.mood.status.v1';

export type MoodStatusCacheIdentity = { kind: 'guest' } | { kind: 'authenticated'; userId: string };

type CachedMoodStatus = {
  schemaVersion: 2;
  identity: MoodStatusCacheIdentity;
  spiritualDate: string;
  timeZone: string;
  cachedAt: string;
  status: MoodStatus;
};

const cacheStorage = createCacheStorageBarrier((key) => key === MOOD_STATUS_CACHE_KEY);

function identityMatches(a: MoodStatusCacheIdentity, b: MoodStatusCacheIdentity): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind === 'authenticated' && b.kind === 'authenticated' ? a.userId === b.userId : true;
}

export async function readMoodStatusCache(identity: MoodStatusCacheIdentity): Promise<MoodStatus | null> {
  try {
    const stored = await cacheStorage.read(MOOD_STATUS_CACHE_KEY);
    if (!stored) return null;
    const cached = JSON.parse(stored.value) as CachedMoodStatus;
    if (cached.schemaVersion !== 2 || !identityMatches(cached.identity, identity)) return null;

    // A cache entry from a prior spiritual day or timezone must never paint
    // as if it were current -- the completion gate changes at that boundary.
    if (cached.spiritualDate !== getMoodSpiritualDate() || cached.timeZone !== getMoodTimeZone()) return null;

    const status = cached.status;
    if (!status || typeof status.hasCompletedToday !== 'boolean' || status.spiritualDate !== cached.spiritualDate) return null;

    return status;
  } catch {
    return null;
  }
}

export async function writeMoodStatusCache(identity: MoodStatusCacheIdentity, status: MoodStatus): Promise<void> {
  const payload: CachedMoodStatus = {
    schemaVersion: 2,
    identity,
    spiritualDate: status.spiritualDate,
    timeZone: getMoodTimeZone(),
    cachedAt: new Date().toISOString(),
    status,
  };
  await cacheStorage.setItem(MOOD_STATUS_CACHE_KEY, JSON.stringify(payload));
}

export async function clearMoodStatusCache(): Promise<void> {
  await cacheStorage.removeItem(MOOD_STATUS_CACHE_KEY);
}
