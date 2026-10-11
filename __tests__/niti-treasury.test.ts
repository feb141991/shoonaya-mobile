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

import { setAppIdentity, type AppIdentity } from '@/lib/appIdentity';
import {
  NITI_TREASURY_MAX_ITEMS,
  NITI_TREASURY_SCHEMA_VERSION,
  clearAllNitiTreasury,
  isNitiSaved,
  nitiItemKey,
  parseNitiTreasury,
  readNitiTreasury,
  resetNitiTreasuryMemoryForTests,
  serializeNitiTreasury,
  setNitiTreasurySaved,
  subscribeNitiTreasury,
  withNitiItem,
  withoutNitiItem,
  type NitiRef,
  type NitiTreasuryItem,
} from '@/lib/nitiTreasury';

const alice: AppIdentity = { kind: 'authenticated', userId: 'alice' };
const bob: AppIdentity = { kind: 'authenticated', userId: 'bob' };
const guest: AppIdentity = { kind: 'guest' };
const tale = (id: string): NitiRef => ({ kind: 'panchatantra', id });
const item = (id: string, savedAt: number): NitiTreasuryItem => ({ kind: 'panchatantra', id, savedAt });
const keyFor = (identityKey: string) => `shoonaya_niti_treasury_v1_${identityKey}`;

describe('pure helpers', () => {
  it('saving is idempotent and keeps the original save time', () => {
    const first = withNitiItem([], tale('lion-and-hare'), 100);
    assert.deepEqual(first, [item('lion-and-hare', 100)]);
    const again = withNitiItem(first, tale('lion-and-hare'), 999);
    assert.equal(again, first);
    assert.equal(again[0].savedAt, 100);
  });

  it('keeps the newest first', () => {
    let items: NitiTreasuryItem[] = [];
    items = withNitiItem(items, tale('a'), 100);
    items = withNitiItem(items, tale('b'), 300);
    items = withNitiItem(items, tale('c'), 200);
    assert.deepEqual(items.map((i) => i.id), ['b', 'c', 'a']);
  });

  it('removing something that is not saved changes nothing', () => {
    const items = [item('a', 1)];
    assert.equal(withoutNitiItem(items, tale('zzz')), items);
    assert.deepEqual(withoutNitiItem(items, tale('a')), []);
  });

  it('refuses a malformed reference', () => {
    const items = [item('a', 1)];
    assert.equal(withNitiItem(items, { kind: 'panchatantra', id: '' }, 5), items);
    assert.equal(withNitiItem(items, { kind: 'panchatantra', id: 'x'.repeat(201) }, 5), items);
    assert.equal(withNitiItem(items, { kind: 'scripture' as any, id: 'a2' }, 5), items);
  });

  it('is bounded: the oldest are dropped past the cap', () => {
    let items: NitiTreasuryItem[] = [];
    for (let i = 1; i <= NITI_TREASURY_MAX_ITEMS + 5; i += 1) items = withNitiItem(items, tale(`t${i}`), i);
    assert.equal(items.length, NITI_TREASURY_MAX_ITEMS);
    assert.equal(isNitiSaved(items, tale('t1')), false);
    assert.equal(isNitiSaved(items, tale(`t${NITI_TREASURY_MAX_ITEMS + 5}`)), true);
  });

  it('round-trips through serialisation', () => {
    const items = [item('b', 300), item('a', 100)];
    assert.deepEqual(parseNitiTreasury(serializeNitiTreasury('user_alice', items), 'user_alice'), items);
  });
});

describe('parsing what is on disk', () => {
  it('discards (null) anything unusable: nothing, corrupt, another schema, another identity', () => {
    assert.equal(parseNitiTreasury(null, 'user_alice'), null);
    assert.equal(parseNitiTreasury('not json', 'user_alice'), null);
    assert.equal(parseNitiTreasury('{"items":[]}', 'user_alice'), null);
    assert.equal(parseNitiTreasury(JSON.stringify({ schemaVersion: NITI_TREASURY_SCHEMA_VERSION + 1, identityKey: 'user_alice', items: [] }), 'user_alice'), null);
    assert.equal(parseNitiTreasury(serializeNitiTreasury('user_bob', [item('a', 1)]), 'user_alice'), null);
    assert.equal(parseNitiTreasury(JSON.stringify({ schemaVersion: NITI_TREASURY_SCHEMA_VERSION, identityKey: 'user_alice', items: 'nope' }), 'user_alice'), null);
  });

  it('drops malformed items inside a good envelope and de-duplicates, keeping the earliest save', () => {
    const raw = JSON.stringify({
      schemaVersion: NITI_TREASURY_SCHEMA_VERSION,
      identityKey: 'user_alice',
      items: [
        { kind: 'panchatantra', id: 'a', savedAt: 500 },
        { kind: 'panchatantra', id: 'a', savedAt: 100 },
        { kind: 'panchatantra', id: '', savedAt: 100 },
        { kind: 'unknown', id: 'b', savedAt: 100 },
        { kind: 'panchatantra', id: 'c', savedAt: 'yesterday' },
        { kind: 'panchatantra', id: 'd', savedAt: -4 },
        null,
        'x',
        { kind: 'panchatantra', id: 'e', savedAt: 200 },
      ],
    });
    assert.deepEqual(parseNitiTreasury(raw, 'user_alice'), [item('e', 200), item('a', 100)]);
  });
});

describe('storage', () => {
  beforeEach(async () => {
    setAppIdentity(alice);
    await clearAllNitiTreasury();
  });

  it('saves, reads back, and survives a cold start (memory dropped, disk kept)', async () => {
    const saved = await setNitiTreasurySaved(alice, tale('crow-and-snake'), true, 1000);
    assert.equal(saved.ok, true);
    assert.deepEqual(saved.items, [item('crow-and-snake', 1000)]);

    resetNitiTreasuryMemoryForTests();
    const afterRestart = await readNitiTreasury(alice);
    assert.deepEqual(afterRestart, [item('crow-and-snake', 1000)]);
  });

  it('writes an envelope that names the identity and the schema version', async () => {
    await setNitiTreasurySaved(alice, tale('a'), true, 5);
    const raw = await AsyncStorage.getItem(keyFor('user_alice'));
    const parsed = JSON.parse(raw as string);
    assert.equal(parsed.schemaVersion, NITI_TREASURY_SCHEMA_VERSION);
    assert.equal(parsed.identityKey, 'user_alice');
  });

  it('saving twice changes nothing, and un-saving removes it from disk too', async () => {
    await setNitiTreasurySaved(alice, tale('a'), true, 1);
    const again = await setNitiTreasurySaved(alice, tale('a'), true, 2);
    assert.deepEqual(again.items, [item('a', 1)]);

    await setNitiTreasurySaved(alice, tale('a'), false);
    resetNitiTreasuryMemoryForTests();
    assert.deepEqual(await readNitiTreasury(alice), []);
  });

  it('keeps each person (and each guest) in their own Treasury', async () => {
    await setNitiTreasurySaved(alice, tale('a'), true, 1);
    setAppIdentity(bob);
    assert.deepEqual(await readNitiTreasury(bob), []);
    await setNitiTreasurySaved(bob, tale('b'), true, 2);
    setAppIdentity(guest);
    assert.deepEqual(await readNitiTreasury(guest), []);

    resetNitiTreasuryMemoryForTests();
    setAppIdentity(alice);
    assert.deepEqual((await readNitiTreasury(alice)).map((i) => i.id), ['a']);
    setAppIdentity(bob);
    assert.deepEqual((await readNitiTreasury(bob)).map((i) => i.id), ['b']);
  });

  it('refuses a write for an identity that is no longer the current one', async () => {
    setAppIdentity(bob); // the person switched while the screen still held alice
    const result = await setNitiTreasurySaved(alice, tale('late'), true, 9);
    assert.equal(result.ok, false);
    assert.equal(await AsyncStorage.getItem(keyFor('user_alice')), null);
    assert.equal(await AsyncStorage.getItem(keyFor('user_bob')), null);
  });

  it('has nowhere to save while the identity is loading or signed out', async () => {
    for (const identity of [{ kind: 'loading' } as AppIdentity, { kind: 'unauthenticated' } as AppIdentity]) {
      setAppIdentity(identity);
      assert.deepEqual(await readNitiTreasury(identity), []);
      assert.equal((await setNitiTreasurySaved(identity, tale('a'), true)).ok, false);
    }
  });

  it('does not lose a save when two happen at once', async () => {
    await Promise.all([
      setNitiTreasurySaved(alice, tale('one'), true, 1),
      setNitiTreasurySaved(alice, tale('two'), true, 2),
      setNitiTreasurySaved(alice, tale('three'), true, 3),
    ]);
    resetNitiTreasuryMemoryForTests();
    assert.deepEqual((await readNitiTreasury(alice)).map((i) => i.id).sort(), ['one', 'three', 'two']);
  });

  it('a quick save then un-save ends un-saved', async () => {
    await Promise.all([setNitiTreasurySaved(alice, tale('a'), true, 1), setNitiTreasurySaved(alice, tale('a'), false)]);
    resetNitiTreasuryMemoryForTests();
    assert.deepEqual(await readNitiTreasury(alice), []);
  });

  it('rolls back and reports failure when the disk write fails, so the screen never claims a save that did not happen', async () => {
    await setNitiTreasurySaved(alice, tale('kept'), true, 1);
    const realSetItem = AsyncStorage.setItem;
    (AsyncStorage as any).setItem = async () => { throw new Error('disk full'); };
    let result;
    try {
      result = await setNitiTreasurySaved(alice, tale('lost'), true, 2);
    } finally {
      (AsyncStorage as any).setItem = realSetItem;
    }
    assert.equal(result.ok, false);
    assert.deepEqual((await readNitiTreasury(alice)).map((i) => i.id), ['kept']);
  });

  it('discards corrupt data and data written for another identity instead of showing it', async () => {
    await AsyncStorage.setItem(keyFor('user_alice'), 'garbage{');
    assert.deepEqual(await readNitiTreasury(alice), []);
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(await AsyncStorage.getItem(keyFor('user_alice')), null);

    resetNitiTreasuryMemoryForTests();
    await AsyncStorage.setItem(keyFor('user_alice'), serializeNitiTreasury('user_bob', [item('bobs', 1)]));
    assert.deepEqual(await readNitiTreasury(alice), []);
  });

  it('clearing (sign-out, account switch) removes memory and disk', async () => {
    await setNitiTreasurySaved(alice, tale('a'), true, 1);
    await clearAllNitiTreasury();
    assert.equal(await AsyncStorage.getItem(keyFor('user_alice')), null);
    assert.deepEqual(await readNitiTreasury(alice), []);
  });

  it('a read that is still in flight when the person signs out does not bring the data back', async () => {
    await AsyncStorage.setItem(keyFor('user_alice'), serializeNitiTreasury('user_alice', [item('a', 1)]));
    resetNitiTreasuryMemoryForTests();
    const pending = readNitiTreasury(alice);
    await clearAllNitiTreasury();
    assert.deepEqual(await pending, []);
    assert.deepEqual(await readNitiTreasury(alice), []);
  });

  it('tells subscribers when something changes, and stops after unsubscribe', async () => {
    let calls = 0;
    const unsubscribe = subscribeNitiTreasury(() => { calls += 1; });
    await setNitiTreasurySaved(alice, tale('a'), true, 1);
    await clearAllNitiTreasury();
    assert.ok(calls >= 2);
    unsubscribe();
    const before = calls;
    await setNitiTreasurySaved(alice, tale('b'), true, 2);
    assert.equal(calls, before);
  });

  it('item keys are stable', () => {
    assert.equal(nitiItemKey(tale('x')), 'panchatantra:x');
  });
});
