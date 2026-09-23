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
import { readVratGeoCache, writeVratGeoCache, clearVratGeoCache, type VratGeoState } from '../lib/vratCache';

function geo(overrides: Partial<VratGeoState> = {}): VratGeoState {
  return {
    lat: 23.1765,
    lon: 75.7885,
    timezone: 'Asia/Kolkata',
    tradition: 'hindu',
    appLanguage: 'en',
    meaningLanguage: 'en',
    calendarProfile: null,
    calendarScope: null,
    ...overrides,
  };
}

describe('Vrat geo cache -- identity isolation', () => {
  beforeEach(async () => {
    await clearVratGeoCache();
  });

  it('user A cannot read user B\'s cached geo/tradition', async () => {
    await writeVratGeoCache({ kind: 'authenticated', userId: 'user-A' }, geo({ tradition: 'jain' }));
    const asB = await readVratGeoCache({ kind: 'authenticated', userId: 'user-B' });
    assert.equal(asB, null);

    const asA = await readVratGeoCache({ kind: 'authenticated', userId: 'user-A' });
    assert.equal(asA?.tradition, 'jain');
  });
});

describe('Vrat geo cache -- fails safe', () => {
  beforeEach(async () => {
    await clearVratGeoCache();
  });

  it('a corrupt cache entry is treated as a miss, not a crash', async () => {
    await AsyncStorage.setItem('shoonaya.vrat.geo.v1', '{{{not json');
    const result = await readVratGeoCache({ kind: 'authenticated', userId: 'user-A' });
    assert.equal(result, null);
  });

  it('a stale schema version is treated as a miss', async () => {
    await AsyncStorage.setItem(
      'shoonaya.vrat.geo.v1',
      JSON.stringify({ schemaVersion: 99, identity: { kind: 'authenticated', userId: 'user-A' }, cachedAt: new Date().toISOString(), geo: geo() })
    );
    const result = await readVratGeoCache({ kind: 'authenticated', userId: 'user-A' });
    assert.equal(result, null);
  });

  it('rejects a malformed geo payload missing required numeric fields', async () => {
    await AsyncStorage.setItem(
      'shoonaya.vrat.geo.v1',
      JSON.stringify({
        schemaVersion: 1,
        identity: { kind: 'authenticated', userId: 'user-A' },
        cachedAt: new Date().toISOString(),
        geo: { tradition: 'hindu' },
      })
    );
    const result = await readVratGeoCache({ kind: 'authenticated', userId: 'user-A' });
    assert.equal(result, null);
  });

  it('clearVratGeoCache removes the entry so the next read is a genuine miss', async () => {
    await writeVratGeoCache({ kind: 'authenticated', userId: 'user-A' }, geo());
    assert.ok(await readVratGeoCache({ kind: 'authenticated', userId: 'user-A' }));
    await clearVratGeoCache();
    assert.equal(await readVratGeoCache({ kind: 'authenticated', userId: 'user-A' }), null);
  });
});
