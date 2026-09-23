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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { readMoodStatusCache, writeMoodStatusCache, clearMoodStatusCache } from '../lib/moodStatusCache';
import type { MoodStatus } from '../lib/mood';

function status(overrides: Partial<MoodStatus> = {}): MoodStatus {
  return {
    hasCompletedToday: false,
    hasDismissedToday: false,
    openSession: null,
    lastCompletedMood: null,
    hasLoggedMoodToday: false,
    lastMood: null,
    ...overrides,
  };
}

describe('Mood status cache -- identity isolation', () => {
  beforeEach(async () => {
    await clearMoodStatusCache();
  });

  it('a guest cache entry is never returned to an authenticated read', async () => {
    await writeMoodStatusCache({ kind: 'guest' }, status());
    const result = await readMoodStatusCache({ kind: 'authenticated', userId: 'user-A' });
    assert.equal(result, null);
  });

  it('user A cannot read user B\'s cached mood status', async () => {
    await writeMoodStatusCache({ kind: 'authenticated', userId: 'user-A' }, status({ hasCompletedToday: true, lastMood: 'calm' }));
    const asB = await readMoodStatusCache({ kind: 'authenticated', userId: 'user-B' });
    assert.equal(asB, null);

    const asA = await readMoodStatusCache({ kind: 'authenticated', userId: 'user-A' });
    assert.equal(asA?.lastMood, 'calm');
  });
});

describe('Mood status cache -- date scoping', () => {
  beforeEach(async () => {
    await clearMoodStatusCache();
  });

  it('rejects a status cached on a prior local calendar day', async () => {
    await AsyncStorage.setItem(
      'shoonaya.mood.status.v1',
      JSON.stringify({
        schemaVersion: 1,
        identity: { kind: 'guest' },
        localDateKey: 'Mon Jan 01 2001',
        cachedAt: new Date().toISOString(),
        status: status({ hasCompletedToday: true }),
      })
    );
    const result = await readMoodStatusCache({ kind: 'guest' });
    assert.equal(result, null, 'Yesterday\'s "already checked in" must never paint as today\'s');
  });

  it('accepts a status cached today', async () => {
    await writeMoodStatusCache({ kind: 'guest' }, status({ hasCompletedToday: true, lastMood: 'joyful' }));
    const result = await readMoodStatusCache({ kind: 'guest' });
    assert.equal(result?.hasCompletedToday, true);
    assert.equal(result?.lastMood, 'joyful');
  });
});

describe('Mood status cache -- fails safe', () => {
  beforeEach(async () => {
    await clearMoodStatusCache();
  });

  it('a corrupt cache entry is treated as a miss, not a crash', async () => {
    await AsyncStorage.setItem('shoonaya.mood.status.v1', '{{{not json');
    const result = await readMoodStatusCache({ kind: 'guest' });
    assert.equal(result, null);
  });

  it('a stale schema version is treated as a miss', async () => {
    await AsyncStorage.setItem(
      'shoonaya.mood.status.v1',
      JSON.stringify({ schemaVersion: 99, identity: { kind: 'guest' }, localDateKey: new Date().toDateString(), cachedAt: new Date().toISOString(), status: status() })
    );
    const result = await readMoodStatusCache({ kind: 'guest' });
    assert.equal(result, null);
  });

  it('clearMoodStatusCache removes the entry so the next read is a genuine miss', async () => {
    await writeMoodStatusCache({ kind: 'guest' }, status());
    assert.ok(await readMoodStatusCache({ kind: 'guest' }));
    await clearMoodStatusCache();
    assert.equal(await readMoodStatusCache({ kind: 'guest' }), null);
  });
});
