/**
 * The saved copy of /api/native/progress that My Progress paints before its
 * network refresh. Stored per person through userScopedStorage; bounded by
 * schema version and age because it drives today's streak.
 */
export const PROGRESS_CACHE_SCHEMA_VERSION = 3;
// Older than this, a saved copy says too little about today's streak to be worth showing.
export const PROGRESS_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type ProgressCacheEnvelope<T> = { schemaVersion: number; savedAt: number; payload: T };

export function serializeProgressCache<T>(payload: T, savedAt: number): string {
  const envelope: ProgressCacheEnvelope<T> = { schemaVersion: PROGRESS_CACHE_SCHEMA_VERSION, savedAt, payload };
  return JSON.stringify(envelope);
}

export function parseProgressCache<T>(raw: string | null, now: number): ProgressCacheEnvelope<T> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ProgressCacheEnvelope<T>>;
    if (parsed.schemaVersion !== PROGRESS_CACHE_SCHEMA_VERSION) return null;
    if (typeof parsed.savedAt !== 'number' || parsed.savedAt > now || now - parsed.savedAt > PROGRESS_CACHE_MAX_AGE_MS) {
      return null;
    }
    if (!parsed.payload || typeof parsed.payload !== 'object') return null;
    return parsed as ProgressCacheEnvelope<T>;
  } catch {
    return null;
  }
}
