import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

if (typeof window === 'undefined' || !(window as any).localStorage) {
  const memoryStore = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => memoryStore.get(key) ?? null,
      setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
      removeItem: (key: string) => memoryStore.delete(key),
      clear: () => memoryStore.clear(),
      get length() { return memoryStore.size; },
      key: (index: number) => Array.from(memoryStore.keys())[index] ?? null,
    },
  };
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearAllPathshalaCaches,
  readPathshalaCache,
  writePathshalaCache,
  type PathshalaCachePayload,
} from '@/lib/pathshalaCache';

const payload: PathshalaCachePayload = {
  paths: [{
    id: 'path-1', title: 'Path', description: 'Description', difficulty: 'beginner',
    proRequired: false, tradition: 'hindu', total_lessons: 3, duration_days: 3,
  }],
  enrollments: [{ path_id: 'path-1', current_lesson: 1, completed_lessons: [0], status: 'active' }],
  tradition: 'hindu',
  sacredText: { label: 'Verse', icon: 'book', original: 'Text', transliteration: '', meaning: 'Meaning', source: 'Source' },
  spiritualDate: '2026-09-07',
  timezone: 'UTC',
};

describe('Pathshala cache', () => {
  beforeEach(clearAllPathshalaCaches);

  it('is isolated by authenticated user identity', async () => {
    await writePathshalaCache('user-a', payload);
    assert.equal(await readPathshalaCache('user-b', new Date('2026-09-07T12:00:00Z')), null);
    assert.equal((await readPathshalaCache('user-a', new Date('2026-09-07T12:00:00Z')))?.paths[0]?.id, 'path-1');
  });

  it('withholds only date-sensitive sacred text after the spiritual-day rollover', async () => {
    await writePathshalaCache('user-a', payload);
    const cached = await readPathshalaCache('user-a', new Date('2026-09-08T12:00:00Z'));
    assert.equal(cached?.sacredText, null);
    assert.equal(cached?.paths.length, 1);
    assert.equal(cached?.enrollments.length, 1);
  });

  it('rejects corrupt entries and removes them', async () => {
    const key = 'shoonaya_pathshala_cache_v1_user_user-a';
    await AsyncStorage.setItem(key, '{broken');
    assert.equal(await readPathshalaCache('user-a'), null);
    assert.equal(await AsyncStorage.getItem(key), null);
  });

  it('logout purge removes every account cache', async () => {
    await writePathshalaCache('user-a', payload);
    await writePathshalaCache('user-b', payload);
    await clearAllPathshalaCaches();
    assert.equal(await readPathshalaCache('user-a'), null);
    assert.equal(await readPathshalaCache('user-b'), null);
  });
});
