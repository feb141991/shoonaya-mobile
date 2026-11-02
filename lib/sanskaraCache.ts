// In-memory, per-identity cache for the Sanskara overview (AGENTS 5). It is never persisted: the records are private family
// and religious data, so there is nothing on disk to encrypt, and nothing survives the app being closed.
//
// Key dimension: the signed-in user id. The tracker has no language, tradition or location variants of this payload.
// Bound: 60 seconds. Cleared on every write, on sign-out and on account switch.
// A read that STARTED before a clear must not store its result afterwards (it was fetched from the old state):
// callers take a ticket before fetching and store with it.

export const SANSKARA_CACHE_TTL_MS = 60_000;

type Entry<T> = { value: T; timestamp: number };

export function createSanskaraCache<T>(ttlMs = SANSKARA_CACHE_TTL_MS, now: () => number = Date.now) {
  const entries = new Map<string, Entry<T>>();
  let generation = 0;

  return {
    get(userId: string): T | null {
      const hit = entries.get(userId);
      return hit && now() - hit.timestamp < ttlMs ? hit.value : null;
    },
    /** Take before starting a fetch; pass to `set`. */
    ticket(): number {
      return generation;
    },
    /** Stores only if nothing was cleared since the ticket was taken. Returns whether it stored. */
    set(userId: string, value: T, ticket: number): boolean {
      if (ticket !== generation) return false;
      entries.set(userId, { value, timestamp: now() });
      return true;
    },
    clear(userId?: string): void {
      generation += 1;
      if (userId) entries.delete(userId);
      else entries.clear();
    },
  };
}
