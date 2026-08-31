import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

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
  readMandaliCache,
  writeMandaliCache,
  clearAllMandaliCaches,
  clearMandaliCache,
  type CachedMandaliRenderModel,
} from '../lib/mandaliCache';

describe('Mandali disk cache — identity isolation', () => {
  const samplePayload: CachedMandaliRenderModel = {
    mandaliId: 'mandali-1',
    mandaliName: 'Test Mandali',
    city: 'London',
    country: 'UK',
    latitude: 51.5,
    longitude: -0.12,
    posts: [{ id: 'post-1' } as any],
    blendedPosts: [],
    comments: [],
    rsvps: [],
    members: [],
    nextCursor: null,
  };

  beforeEach(async () => {
    await clearAllMandaliCaches();
  });

  it('one user cannot read another user\'s cached Mandali feed', async () => {
    await writeMandaliCache({ kind: 'authenticated', userId: 'user-A' }, {
      ...samplePayload,
      posts: [{ id: 'user-A-post' } as any],
    });

    const userBRead = await readMandaliCache({ kind: 'authenticated', userId: 'user-B' });
    assert.equal(userBRead, null, 'User B must never see User A\'s cached posts');

    const userARead = await readMandaliCache({ kind: 'authenticated', userId: 'user-A' });
    assert.equal(userARead?.payload.posts[0]?.id, 'user-A-post', 'User A still reads their own cache');
  });

  it('guest and authenticated caches are fully isolated from each other', async () => {
    await writeMandaliCache({ kind: 'guest' }, { ...samplePayload, posts: [{ id: 'guest-post' } as any] });
    await writeMandaliCache({ kind: 'authenticated', userId: 'user-C' }, { ...samplePayload, posts: [{ id: 'user-C-post' } as any] });

    const guestRead = await readMandaliCache({ kind: 'guest' });
    const userRead = await readMandaliCache({ kind: 'authenticated', userId: 'user-C' });

    assert.equal(guestRead?.payload.posts[0]?.id, 'guest-post');
    assert.equal(userRead?.payload.posts[0]?.id, 'user-C-post');
  });

  it('clearing one identity\'s cache does not remove another\'s', async () => {
    await writeMandaliCache({ kind: 'authenticated', userId: 'user-D' }, samplePayload);
    await writeMandaliCache({ kind: 'authenticated', userId: 'user-E' }, samplePayload);

    await clearMandaliCache({ kind: 'authenticated', userId: 'user-D' });

    assert.equal(await readMandaliCache({ kind: 'authenticated', userId: 'user-D' }), null);
    assert.notEqual(await readMandaliCache({ kind: 'authenticated', userId: 'user-E' }), null);
  });

  it('clearAllMandaliCaches wipes every identity, including guest', async () => {
    await writeMandaliCache({ kind: 'guest' }, samplePayload);
    await writeMandaliCache({ kind: 'authenticated', userId: 'user-F' }, samplePayload);

    await clearAllMandaliCaches();

    assert.equal(await readMandaliCache({ kind: 'guest' }), null);
    assert.equal(await readMandaliCache({ kind: 'authenticated', userId: 'user-F' }), null);
  });

  it('rejects a payload with the wrong schema version instead of returning stale-shaped data', async () => {
    // Simulate a stored envelope from a previous, incompatible cache shape.
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(
      'shoonaya_mandali_cache_v1_user_user-G',
      JSON.stringify({
        schemaVersion: 999,
        identity: { kind: 'authenticated', userId: 'user-G' },
        savedAt: Date.now(),
        payload: samplePayload,
      })
    );

    const read = await readMandaliCache({ kind: 'authenticated', userId: 'user-G' });
    assert.equal(read, null, 'A schema-version mismatch must be treated as no cache, not a malformed hit');
  });
});
