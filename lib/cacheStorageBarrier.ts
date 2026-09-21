import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Ordering boundary for one cache namespace. Reads remain concurrent; mutations
 * serialize per key. A purge waits for all already-registered writes (including
 * keys that do not exist on disk yet), and later work waits for the purge.
 * Network callers must still reject responses from superseded identities.
 */
export function createCacheStorageBarrier(matchesKey: (key: string) => boolean) {
  const tails = new Map<string, Promise<void>>();
  const revisions = new Map<string, number>();
  let generation = 0;
  let barrier: Promise<void> = Promise.resolve();

  const revision = (key: string) => revisions.get(key) ?? 0;
  const advance = (key: string) => revisions.set(key, revision(key) + 1);
  const settled = (promise: Promise<void>) => promise.catch(() => {});

  function enqueue(key: string, operation: () => Promise<void>): Promise<void> {
    const previous = tails.get(key) ?? Promise.resolve();
    const pendingPurge = barrier;
    const result = Promise.all([settled(previous), settled(pendingPurge)]).then(operation);
    tails.set(key, result);
    const release = () => {
      if (tails.get(key) === result) tails.delete(key);
    };
    void result.then(release, release);
    return result;
  }

  return {
    async read(key: string) {
      const startedGeneration = generation;
      const startedRevision = revision(key);
      const isCurrent = () => generation === startedGeneration && revision(key) === startedRevision;
      await Promise.all([settled(barrier), settled(tails.get(key) ?? Promise.resolve())]);
      if (!isCurrent()) return null;
      const value = await AsyncStorage.getItem(key);
      if (!isCurrent() || value === null) return null;
      return {
        value,
        // Corrupt/obsolete reads must not delete a newer valid write.
        discard(): Promise<void> {
          if (!isCurrent()) return Promise.resolve();
          advance(key);
          return enqueue(key, () => AsyncStorage.removeItem(key));
        },
      };
    },
    setItem(key: string, value: string): Promise<void> {
      advance(key);
      return enqueue(key, () => AsyncStorage.setItem(key, value));
    },
    removeItem(key: string): Promise<void> {
      advance(key);
      return enqueue(key, () => AsyncStorage.removeItem(key));
    },
    clearAll(): Promise<void> {
      generation += 1;
      const registeredKeys = [...tails.keys()];
      const pendingWrites = [...tails.values()];
      const previousPurge = barrier;
      const result = (async () => {
        await Promise.all([settled(previousPurge), ...pendingWrites.map(settled)]);
        const keys = await AsyncStorage.getAllKeys();
        const ownedKeys = [...new Set([...keys, ...registeredKeys])].filter(matchesKey);
        if (ownedKeys.length) await AsyncStorage.multiRemove(ownedKeys);
      })();
      barrier = result;
      return result;
    },
  };
}
