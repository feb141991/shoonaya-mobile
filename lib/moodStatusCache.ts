import { createCacheStorageBarrier } from './cacheStorageBarrier';
import type { MoodStatus } from './mood';

// Reliability plan item 6: lets app/mood.tsx paint today's already-known
// check-in status instantly on revisit instead of always blocking on
// SacredLoader while /api/mood/checkin resolves -- same shape as
// lib/quizCache.ts. MoodStatus carries no date/timezone field of its own
// (hasCompletedToday etc. are computed server-side against "today"), so
// freshness is checked against the device's local calendar day instead of
// a spiritual date -- more conservative than the server's actual
// spiritual-day boundary in most timezones, which errs toward treating a
// stale entry as a miss rather than risking a stale "already checked in"
// painting over a new day.
const MOOD_STATUS_CACHE_KEY = 'shoonaya.mood.status.v1';

export type MoodStatusCacheIdentity = { kind: 'guest' } | { kind: 'authenticated'; userId: string };

type CachedMoodStatus = {
  schemaVersion: 1;
  identity: MoodStatusCacheIdentity;
  localDateKey: string;
  cachedAt: string;
  status: MoodStatus;
};

const cacheStorage = createCacheStorageBarrier((key) => key === MOOD_STATUS_CACHE_KEY);

function identityMatches(a: MoodStatusCacheIdentity, b: MoodStatusCacheIdentity): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind === 'authenticated' && b.kind === 'authenticated' ? a.userId === b.userId : true;
}

function localDateKey(): string {
  return new Date().toDateString();
}

export async function readMoodStatusCache(identity: MoodStatusCacheIdentity): Promise<MoodStatus | null> {
  try {
    const stored = await cacheStorage.read(MOOD_STATUS_CACHE_KEY);
    if (!stored) return null;
    const cached = JSON.parse(stored.value) as CachedMoodStatus;
    if (cached.schemaVersion !== 1 || !identityMatches(cached.identity, identity)) return null;

    // A cache entry from a prior local calendar day must never paint as
    // if it were today's status -- "already checked in" or "not yet"
    // both flip meaning across a day boundary.
    if (cached.localDateKey !== localDateKey()) return null;

    const status = cached.status;
    if (!status || typeof status.hasCompletedToday !== 'boolean') return null;

    return status;
  } catch {
    return null;
  }
}

export async function writeMoodStatusCache(identity: MoodStatusCacheIdentity, status: MoodStatus): Promise<void> {
  const payload: CachedMoodStatus = {
    schemaVersion: 1,
    identity,
    localDateKey: localDateKey(),
    cachedAt: new Date().toISOString(),
    status,
  };
  await cacheStorage.setItem(MOOD_STATUS_CACHE_KEY, JSON.stringify(payload));
}

export async function clearMoodStatusCache(): Promise<void> {
  await cacheStorage.removeItem(MOOD_STATUS_CACHE_KEY);
}
