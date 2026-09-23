import { createCacheStorageBarrier } from './cacheStorageBarrier';

// Reliability plan item 6: Bhakti's browse/katha-list/katha-detail/
// stotram-detail screens all fetch fully public, non-personalized content
// -- none of their load() functions reference appIdentity or a userId in
// the request itself, confirmed by reading each one before adding this.
// No user/guest key dimension applies for that reason; content is keyed
// only by its own request params (a view, an id, or nothing for the full
// list). A cache hit paints instantly; the network fetch always still
// runs in the background to reconcile it, same silent-SWR pattern as
// every other cache in this codebase -- so there is no TTL to get wrong
// either, and no sign-out clearing (this data was never private).
const SCHEMA_VERSION = 1;

type Envelope<T> = { schemaVersion: number; cachedAt: string; data: T };

const cacheStorage = createCacheStorageBarrier((key) => key.startsWith('shoonaya.bhakti.content.'));

export async function readBhaktiContentCache<T>(
  key: string,
  isValid: (value: unknown) => value is T
): Promise<T | null> {
  try {
    const stored = await cacheStorage.read(key);
    if (!stored) return null;
    const cached = JSON.parse(stored.value) as Envelope<unknown>;
    if (cached.schemaVersion !== SCHEMA_VERSION || !isValid(cached.data)) return null;
    return cached.data;
  } catch {
    return null;
  }
}

export async function writeBhaktiContentCache<T>(key: string, data: T): Promise<void> {
  const payload: Envelope<T> = {
    schemaVersion: SCHEMA_VERSION,
    cachedAt: new Date().toISOString(),
    data,
  };
  await cacheStorage.setItem(key, JSON.stringify(payload));
}

export async function clearAllBhaktiContentCaches(): Promise<void> {
  await cacheStorage.clearAll();
}

export const bhaktiCacheKeys = {
  stotramList: (): string => 'shoonaya.bhakti.content.stotram-list.v1',
  kathaList: (view: string): string => `shoonaya.bhakti.content.katha-list.v1.${view}`,
  stotramDetail: (id: string): string => `shoonaya.bhakti.content.stotram-detail.v1.${id}`,
  kathaDetail: (id: string): string => `shoonaya.bhakti.content.katha-detail.v1.${id}`,
};
