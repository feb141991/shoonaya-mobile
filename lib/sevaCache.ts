import { createCacheStorageBarrier } from './cacheStorageBarrier';

// Reliability plan item 6: lets app/seva.tsx paint the last-known
// tradition/monthly seva count instantly on revisit instead of always
// blocking on SacredLoader while profile + seva_log queries resolve --
// same shape as lib/quizCache.ts. Guest never reaches this cache (its
// state is synchronous, no network call), so there is no guest variant.
const SEVA_CACHE_KEY = 'shoonaya.seva.v1';

export type SevaCacheIdentity = { kind: 'authenticated'; userId: string };

export type SevaCacheState = {
  tradition: string;
  monthlyCount: number;
};

type CachedSevaState = {
  schemaVersion: 1;
  identity: SevaCacheIdentity;
  cachedAt: string;
  monthKey: string;
  state: SevaCacheState;
};

const cacheStorage = createCacheStorageBarrier((key) => key === SEVA_CACHE_KEY);

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function readSevaCache(identity: SevaCacheIdentity): Promise<SevaCacheState | null> {
  try {
    const stored = await cacheStorage.read(SEVA_CACHE_KEY);
    if (!stored) return null;
    const cached = JSON.parse(stored.value) as CachedSevaState;
    if (cached.schemaVersion !== 1 || cached.identity?.userId !== identity.userId) return null;

    const state = cached.state;
    if (!state || typeof state.tradition !== 'string' || typeof state.monthlyCount !== 'number') return null;

    // The monthly count is scoped to a calendar month -- a cache entry
    // written last month must never paint as this month's count.
    if (cached.monthKey !== currentMonthKey()) return null;

    return state;
  } catch {
    return null;
  }
}

export async function writeSevaCache(identity: SevaCacheIdentity, state: SevaCacheState): Promise<void> {
  const payload: CachedSevaState = {
    schemaVersion: 1,
    identity,
    cachedAt: new Date().toISOString(),
    monthKey: currentMonthKey(),
    state,
  };
  await cacheStorage.setItem(SEVA_CACHE_KEY, JSON.stringify(payload));
}

export async function clearSevaCache(): Promise<void> {
  await cacheStorage.removeItem(SEVA_CACHE_KEY);
}
