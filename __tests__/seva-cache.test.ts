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
import { readSevaCache, writeSevaCache, clearSevaCache } from '../lib/sevaCache';

describe('Seva cache -- identity isolation', () => {
  beforeEach(async () => {
    await clearSevaCache();
  });

  it('user A cannot read user B\'s cached seva log', async () => {
    await writeSevaCache({ kind: 'authenticated', userId: 'user-A' }, { tradition: 'hindu', monthlyCount: 4 });
    const asB = await readSevaCache({ kind: 'authenticated', userId: 'user-B' });
    assert.equal(asB, null);

    const asA = await readSevaCache({ kind: 'authenticated', userId: 'user-A' });
    assert.equal(asA?.monthlyCount, 4);
  });
});

describe('Seva cache -- month scoping', () => {
  beforeEach(async () => {
    await clearSevaCache();
  });

  it('rejects a count cached in a prior calendar month', async () => {
    await AsyncStorage.setItem(
      'shoonaya.seva.v1',
      JSON.stringify({
        schemaVersion: 1,
        identity: { kind: 'authenticated', userId: 'user-A' },
        cachedAt: new Date().toISOString(),
        monthKey: '2020-01',
        state: { tradition: 'hindu', monthlyCount: 9 },
      })
    );
    const result = await readSevaCache({ kind: 'authenticated', userId: 'user-A' });
    assert.equal(result, null, 'Last month\'s count must never paint as this month\'s');
  });

  it('accepts a count written this month', async () => {
    await writeSevaCache({ kind: 'authenticated', userId: 'user-A' }, { tradition: 'sikh', monthlyCount: 2 });
    const result = await readSevaCache({ kind: 'authenticated', userId: 'user-A' });
    assert.equal(result?.monthlyCount, 2);
    assert.equal(result?.tradition, 'sikh');
  });
});

describe('Seva cache -- fails safe', () => {
  beforeEach(async () => {
    await clearSevaCache();
  });

  it('a corrupt cache entry is treated as a miss, not a crash', async () => {
    await AsyncStorage.setItem('shoonaya.seva.v1', '{{{not json');
    const result = await readSevaCache({ kind: 'authenticated', userId: 'user-A' });
    assert.equal(result, null);
  });

  it('a stale schema version is treated as a miss', async () => {
    await AsyncStorage.setItem(
      'shoonaya.seva.v1',
      JSON.stringify({
        schemaVersion: 99,
        identity: { kind: 'authenticated', userId: 'user-A' },
        cachedAt: new Date().toISOString(),
        monthKey: '2026-09',
        state: { tradition: 'hindu', monthlyCount: 1 },
      })
    );
    const result = await readSevaCache({ kind: 'authenticated', userId: 'user-A' });
    assert.equal(result, null);
  });

  it('clearSevaCache removes the entry so the next read is a genuine miss', async () => {
    await writeSevaCache({ kind: 'authenticated', userId: 'user-A' }, { tradition: 'hindu', monthlyCount: 1 });
    assert.ok(await readSevaCache({ kind: 'authenticated', userId: 'user-A' }));
    await clearSevaCache();
    assert.equal(await readSevaCache({ kind: 'authenticated', userId: 'user-A' }), null);
  });
});
