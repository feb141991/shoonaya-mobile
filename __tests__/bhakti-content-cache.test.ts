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
import {
  readBhaktiContentCache,
  getBhaktiContentCacheSnapshot,
  writeBhaktiContentCache,
  clearAllBhaktiContentCaches,
  bhaktiCacheKeys,
} from '../lib/bhaktiContentCache';

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
const hasId = (v: unknown): v is { id: string } =>
  !!v && typeof v === 'object' && typeof (v as Record<string, unknown>).id === 'string';
const isAnything = (_v: unknown): _v is unknown => true;

describe('Bhakti content cache -- keying', () => {
  beforeEach(async () => {
    await clearAllBhaktiContentCaches();
  });

  it('different views/ids get independent entries, not overwriting each other', async () => {
    await writeBhaktiContentCache(bhaktiCacheKeys.kathaList('puranic'), ['a', 'b']);
    await writeBhaktiContentCache(bhaktiCacheKeys.kathaList('bani'), ['c']);

    const puranic = await readBhaktiContentCache(bhaktiCacheKeys.kathaList('puranic'), isStringArray);
    const bani = await readBhaktiContentCache(bhaktiCacheKeys.kathaList('bani'), isStringArray);
    assert.deepEqual(puranic, ['a', 'b']);
    assert.deepEqual(bani, ['c']);
  });

  it('publishes disk reads and writes as synchronous snapshots', async () => {
    const key = bhaktiCacheKeys.mantraList();
    await writeBhaktiContentCache(key, ['cached mantra']);
    assert.deepEqual(getBhaktiContentCacheSnapshot(key, isStringArray), ['cached mantra']);

    await clearAllBhaktiContentCaches();
    await AsyncStorage.setItem(key, JSON.stringify({
      schemaVersion: 1,
      cachedAt: new Date().toISOString(),
      data: ['disk mantra'],
    }));
    assert.equal(getBhaktiContentCacheSnapshot(key, isStringArray), null);
    assert.deepEqual(await readBhaktiContentCache(key, isStringArray), ['disk mantra']);
    assert.deepEqual(getBhaktiContentCacheSnapshot(key, isStringArray), ['disk mantra']);
  });

  it('stotram and katha detail caches for the same id do not collide', async () => {
    await writeBhaktiContentCache(bhaktiCacheKeys.stotramDetail('shared-id'), { id: 'shared-id', kind: 'stotram' });
    await writeBhaktiContentCache(bhaktiCacheKeys.kathaDetail('shared-id'), { id: 'shared-id', kind: 'katha' });

    const stotram = await readBhaktiContentCache(bhaktiCacheKeys.stotramDetail('shared-id'), hasId);
    const katha = await readBhaktiContentCache(bhaktiCacheKeys.kathaDetail('shared-id'), hasId);
    assert.equal((stotram as any)?.kind, 'stotram');
    assert.equal((katha as any)?.kind, 'katha');
  });
});

describe('Bhakti content cache -- validation', () => {
  beforeEach(async () => {
    await clearAllBhaktiContentCaches();
  });

  it('rejects data that fails the caller\'s validator', async () => {
    await writeBhaktiContentCache(bhaktiCacheKeys.stotramDetail('bad'), { notAnId: true });
    const result = await readBhaktiContentCache(bhaktiCacheKeys.stotramDetail('bad'), hasId);
    assert.equal(result, null);
  });

  it('a corrupt cache entry is treated as a miss, not a crash', async () => {
    await AsyncStorage.setItem(bhaktiCacheKeys.stotramList(), '{{{not json');
    const result = await readBhaktiContentCache(bhaktiCacheKeys.stotramList(), isAnything);
    assert.equal(result, null);
  });

  it('a stale schema version is treated as a miss', async () => {
    await AsyncStorage.setItem(
      bhaktiCacheKeys.stotramList(),
      JSON.stringify({ schemaVersion: 99, cachedAt: new Date().toISOString(), data: { stotrams: [] } })
    );
    const result = await readBhaktiContentCache(bhaktiCacheKeys.stotramList(), isAnything);
    assert.equal(result, null);
  });
});

describe('Bhakti content cache -- clearing', () => {
  it('clearAllBhaktiContentCaches sweeps every key, list and detail alike', async () => {
    await writeBhaktiContentCache(bhaktiCacheKeys.stotramList(), { stotrams: [] });
    await writeBhaktiContentCache(bhaktiCacheKeys.kathaList('puranic'), []);
    await writeBhaktiContentCache(bhaktiCacheKeys.stotramDetail('x'), { id: 'x' });
    await writeBhaktiContentCache(bhaktiCacheKeys.kathaDetail('y'), { id: 'y' });

    await clearAllBhaktiContentCaches();

    assert.equal(await readBhaktiContentCache(bhaktiCacheKeys.stotramList(), isAnything), null);
    assert.equal(await readBhaktiContentCache(bhaktiCacheKeys.kathaList('puranic'), isAnything), null);
    assert.equal(await readBhaktiContentCache(bhaktiCacheKeys.stotramDetail('x'), isAnything), null);
    assert.equal(await readBhaktiContentCache(bhaktiCacheKeys.kathaDetail('y'), isAnything), null);
  });
});
