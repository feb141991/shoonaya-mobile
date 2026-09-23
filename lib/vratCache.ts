import { createCacheStorageBarrier } from './cacheStorageBarrier';

// Reliability plan item 6: lets app/vrat.tsx paint the last-known
// profile geo/tradition instantly on revisit instead of always blocking
// on a full-screen ActivityIndicator while the profile query resolves --
// same shape as lib/quizCache.ts / lib/sevaCache.ts. No date scoping:
// geo/tradition/language settings are as stable as the profile itself
// (matches lib/profileCache.ts's own no-TTL policy), so a cache hit is
// always usable, just superseded by the background reconcile below.
const VRAT_CACHE_KEY = 'shoonaya.vrat.geo.v1';

export type VratCacheIdentity = { kind: 'authenticated'; userId: string };

export type VratGeoState = {
  lat: number;
  lon: number;
  timezone: string;
  tradition: string | null;
  appLanguage: string | null;
  meaningLanguage: string | null;
  calendarProfile: string | null;
  calendarScope: string | null;
};

type CachedVratGeo = {
  schemaVersion: 1;
  identity: VratCacheIdentity;
  cachedAt: string;
  geo: VratGeoState;
};

const cacheStorage = createCacheStorageBarrier((key) => key === VRAT_CACHE_KEY);

export async function readVratGeoCache(identity: VratCacheIdentity): Promise<VratGeoState | null> {
  try {
    const stored = await cacheStorage.read(VRAT_CACHE_KEY);
    if (!stored) return null;
    const cached = JSON.parse(stored.value) as CachedVratGeo;
    if (cached.schemaVersion !== 1 || cached.identity?.userId !== identity.userId) return null;

    const geo = cached.geo;
    if (!geo || typeof geo.lat !== 'number' || typeof geo.lon !== 'number' || typeof geo.timezone !== 'string') return null;

    return geo;
  } catch {
    return null;
  }
}

export async function writeVratGeoCache(identity: VratCacheIdentity, geo: VratGeoState): Promise<void> {
  const payload: CachedVratGeo = {
    schemaVersion: 1,
    identity,
    cachedAt: new Date().toISOString(),
    geo,
  };
  await cacheStorage.setItem(VRAT_CACHE_KEY, JSON.stringify(payload));
}

export async function clearVratGeoCache(): Promise<void> {
  await cacheStorage.removeItem(VRAT_CACHE_KEY);
}
