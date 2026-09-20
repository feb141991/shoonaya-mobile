import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Polyfill AsyncStorage in node environment
if (typeof window === 'undefined' || !(window as any).localStorage) {
  const memoryStore = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => memoryStore.get(key) ?? null,
      setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
      removeItem: (key: string) => memoryStore.delete(key),
      clear: () => memoryStore.clear(),
      get length() {
        return memoryStore.size;
      },
      key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
    },
  };
}

import {
  writeProfileCache,
  readProfileCache,
  getOrReadProfileCache,
  getProfileCacheSnapshot,
  clearProfileCache,
  clearAllProfileCaches,
  getProfileCacheKey,
  sanitizeProfileCachePayload,
  type ProfileCacheIdentity,
  type CachedProfileRenderModel,
} from '../lib/profileCache';

describe('Profile Safe-Contract Summary Cache & Identity Isolation', () => {
  const sampleProfilePayload = (userId: string): CachedProfileRenderModel => ({
    profile: {
      id: userId,
      full_name: 'Prince Sharma',
      username: 'princesharma',
      avatar_url: 'https://example.com/avatar.jpg',
      tradition: 'hindu',
      sampradaya: 'smarta',
      ishta_devata: 'shiva',
      city: 'London',
      country: 'UK',
      life_stage: 'grihastha',
      app_language: 'en',
      active_symbol_id: null,
      seva_score: 250,
      kul_id: null,
      kul_name: null,
    },
    summary: {
      completion: {
        pct: 80,
        missing: ['kul'],
        coreComplete: true,
      },
      progress: {
        practices: { completed: 3, total: 5 },
        streaks: { shloka: 7, bestShloka: 14, nitya: 5, bestNitya: 10 },
        pathshala: { completedLessons: 12 },
        quiz: { doneToday: true },
        highlights: {
          totalBeads: 1080,
          totalRounds: 10,
          totalMinutes: 60,
          totalSessions: 15,
          topMantra: 'Om Namah Shivaya',
          nityaDays: 21,
          pathshalaEntriesOpened: 8,
          bookmarkedVerses: 4,
        },
      },
    },
  });

  beforeEach(async () => {
    await clearAllProfileCaches();
  });

  it('deduplicates in-flight disk reads and populates memory snapshot', async () => {
    const identity: ProfileCacheIdentity = { kind: 'authenticated', userId: 'user_abc' };
    const payload = sampleProfilePayload(identity.userId);

    // Initially, snapshot is null
    assert.equal(getProfileCacheSnapshot(identity), null);

    // Write to disk cache
    await writeProfileCache(identity, payload);

    // Verify snapshot populated synchronously from write
    assert.deepEqual(getProfileCacheSnapshot(identity), payload);

    // Clear memory snapshot only to test disk hydration
    await clearProfileCache(identity);
    await AsyncStorage.setItem(
      getProfileCacheKey(identity),
      JSON.stringify({
        schemaVersion: 1,
        identity,
        savedAt: Date.now(),
        payload,
      })
    );

    // Issue multiple concurrent getOrReadProfileCache calls
    const [result1, result2, result3] = await Promise.all([
      getOrReadProfileCache(identity),
      getOrReadProfileCache(identity),
      getOrReadProfileCache(identity),
    ]);

    assert.deepEqual(result1, payload);
    assert.deepEqual(result2, payload);
    assert.deepEqual(result3, payload);

    // Now synchronous snapshot returns the payload
    assert.deepEqual(getProfileCacheSnapshot(identity), payload);
  });

  it('guarantees strict identity isolation between different users and guest', async () => {
    const user1: ProfileCacheIdentity = { kind: 'authenticated', userId: 'user_1' };
    const user2: ProfileCacheIdentity = { kind: 'authenticated', userId: 'user_2' };
    const guest: ProfileCacheIdentity = { kind: 'guest' };

    const payload = sampleProfilePayload(user1.userId);
    await writeProfileCache(user1, payload);

    // User 1 has cached data
    assert.deepEqual(getProfileCacheSnapshot(user1), payload);
    // User 2 and guest must be strictly null
    assert.equal(getProfileCacheSnapshot(user2), null);
    assert.equal(getProfileCacheSnapshot(guest), null);

    const user2Read = await readProfileCache(user2);
    assert.equal(user2Read, null);

    const guestRead = await readProfileCache(guest);
    assert.equal(guestRead, null);
  });

  it('recovers gracefully from corrupted JSON and invalid schema version', async () => {
    const identity: ProfileCacheIdentity = { kind: 'authenticated', userId: 'user_corrupt' };
    const payload = sampleProfilePayload(identity.userId);
    const key = getProfileCacheKey(identity);

    // Corrupted JSON
    await AsyncStorage.setItem(key, 'INVALID_JSON_CORRUPT{');
    const result = await readProfileCache(identity);
    assert.equal(result, null);
    // Verified cleaned up
    assert.equal(await AsyncStorage.getItem(key), null);

    // Incompatible schema version
    await AsyncStorage.setItem(
      key,
      JSON.stringify({
        schemaVersion: 999,
        identity,
        savedAt: Date.now(),
        payload,
      })
    );
    const resultOutdated = await readProfileCache(identity);
    assert.equal(resultOutdated, null);
    assert.equal(await AsyncStorage.getItem(key), null);
  });

  it('rejects malformed same-schema payloads before they reach rendering', async () => {
    const identity: ProfileCacheIdentity = { kind: 'authenticated', userId: 'user_malformed' };
    const key = getProfileCacheKey(identity);
    await AsyncStorage.setItem(key, JSON.stringify({
      schemaVersion: 1,
      identity,
      savedAt: Date.now(),
      payload: { profile: { id: identity.userId, tradition: 'invalid' }, summary: {} },
    }));

    assert.equal(await readProfileCache(identity), null);
    assert.equal(await AsyncStorage.getItem(key), null);
  });

  it('whitelists render-safe fields and strips email and entitlement extras', () => {
    const raw = {
      ...sampleProfilePayload('user_safe'),
      email: 'private@example.com',
      profile: {
        ...sampleProfilePayload('user_safe').profile,
        is_pro: true,
        subscription_status: 'pro',
      },
    };

    const sanitized = sanitizeProfileCachePayload(raw);
    assert.ok(sanitized);
    assert.equal('email' in sanitized, false);
    assert.equal('is_pro' in sanitized.profile, false);
    assert.equal('subscription_status' in sanitized.profile, false);
  });

  it('does not let an in-flight read restore a cache after identity purge', async () => {
    const identity: ProfileCacheIdentity = { kind: 'authenticated', userId: 'user_clear_race' };
    const key = getProfileCacheKey(identity);
    const payload = sampleProfilePayload(identity.userId);
    await AsyncStorage.setItem(key, JSON.stringify({
      schemaVersion: 1,
      identity,
      savedAt: Date.now(),
      payload,
    }));

    const originalGetItem = AsyncStorage.getItem.bind(AsyncStorage);
    let releaseRead!: () => void;
    let markCaptured!: () => void;
    const captured = new Promise<void>((resolve) => { markCaptured = resolve; });
    const release = new Promise<void>((resolve) => { releaseRead = resolve; });
    (AsyncStorage as any).getItem = async (requestedKey: string) => {
      const value = await originalGetItem(requestedKey);
      if (requestedKey === key) {
        markCaptured();
        await release;
      }
      return value;
    };

    try {
      const pendingRead = getOrReadProfileCache(identity);
      await captured;
      await clearProfileCache(identity);
      releaseRead();
      assert.equal(await pendingRead, null);
      assert.equal(getProfileCacheSnapshot(identity), null);
      assert.equal(await originalGetItem(key), null);
    } finally {
      (AsyncStorage as any).getItem = originalGetItem;
      releaseRead?.();
    }
  });

  it('clears all memory snapshots and AsyncStorage entries on clearAllProfileCaches', async () => {
    const user1: ProfileCacheIdentity = { kind: 'authenticated', userId: 'user_1' };
    const guest: ProfileCacheIdentity = { kind: 'guest' };

    await writeProfileCache(user1, sampleProfilePayload(user1.userId));
    await writeProfileCache(guest, sampleProfilePayload('guest'));

    assert.notEqual(getProfileCacheSnapshot(user1), null);
    assert.notEqual(getProfileCacheSnapshot(guest), null);

    await clearAllProfileCaches();

    assert.equal(getProfileCacheSnapshot(user1), null);
    assert.equal(getProfileCacheSnapshot(guest), null);
    assert.equal(await readProfileCache(user1), null);
    assert.equal(await readProfileCache(guest), null);
  });
});
