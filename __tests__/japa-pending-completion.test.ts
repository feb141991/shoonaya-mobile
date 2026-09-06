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
  readPendingJapaCompletion,
  writePendingJapaCompletion,
  clearPendingJapaCompletion,
  readPendingJapaCompletions,
  isJapaCompletionAcknowledged,
  type PendingJapaCompletion,
} from '../lib/japaPendingCompletion';

describe('Japa pending completion -- durable, owner-scoped persistence across process death', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns null when nothing has been persisted', async () => {
    assert.equal(await readPendingJapaCompletion('user-A'), null);
  });

  it('round-trips a written pending completion', async () => {
    const pending: PendingJapaCompletion = {
      clientCompletionId: 'completion-1',
      requestBody: JSON.stringify({ clientCompletionId: 'completion-1', mantra: 'Om Namah Shivaya' }),
      createdAt: '2026-09-06T00:00:00.000Z',
    };
    await writePendingJapaCompletion('user-A', pending);

    assert.deepEqual(await readPendingJapaCompletion('user-A'), pending);
  });

  it('clearing removes it -- a subsequent read returns null', async () => {
    await writePendingJapaCompletion('user-A', {
      clientCompletionId: 'completion-1',
      requestBody: '{}',
      createdAt: '2026-09-06T00:00:00.000Z',
    });
    await clearPendingJapaCompletion('user-A', 'completion-1');

    assert.equal(await readPendingJapaCompletion('user-A'), null);
  });

  it('is isolated per user -- one user\'s pending completion is never visible to another', async () => {
    await writePendingJapaCompletion('user-A', {
      clientCompletionId: 'completion-for-A',
      requestBody: '{}',
      createdAt: '2026-09-06T00:00:00.000Z',
    });

    assert.equal(await readPendingJapaCompletion('user-B'), null);
    assert.ok(await readPendingJapaCompletion('user-A'));
  });

  it('clearing one user\'s pending completion does not touch another\'s', async () => {
    await writePendingJapaCompletion('user-A', { clientCompletionId: 'a', requestBody: '{}', createdAt: '' });
    await writePendingJapaCompletion('user-B', { clientCompletionId: 'b', requestBody: '{}', createdAt: '' });

    await clearPendingJapaCompletion('user-A', 'a');

    assert.equal(await readPendingJapaCompletion('user-A'), null);
    assert.ok(await readPendingJapaCompletion('user-B'));
  });

  it('a later round preserves the previous unacknowledged operation', async () => {
    await writePendingJapaCompletion('user-A', { clientCompletionId: 'first', requestBody: '{}', createdAt: '' });
    await writePendingJapaCompletion('user-A', { clientCompletionId: 'second', requestBody: '{}', createdAt: '' });

    const pending = await readPendingJapaCompletion('user-A');
    assert.equal(pending?.clientCompletionId, 'first');
    await clearPendingJapaCompletion('user-A', 'first');
    assert.equal((await readPendingJapaCompletion('user-A'))?.clientCompletionId, 'second');
  });

  it('serializes parallel writes and ignores duplicate acknowledgements', async () => {
    await Promise.all(['first', 'second'].map((clientCompletionId) => writePendingJapaCompletion('user-A', { clientCompletionId, requestBody: '{}', createdAt: '' })));
    await clearPendingJapaCompletion('user-A', 'first');
    await clearPendingJapaCompletion('user-A', 'first');
    const result = await readPendingJapaCompletions('user-A');
    assert.equal(result.status, 'ok');
    assert.deepEqual(result.status === 'ok' ? result.items.map((p) => p.clientCompletionId) : null, ['second']);
  });

  it('does not acknowledge exhausted server failures, auth failures or rate limits', () => {
    for (const status of [400, 401, 403, 429, 500, 503]) {
      assert.equal(isJapaCompletionAcknowledged(new Response(null, { status })), false);
    }
    assert.equal(isJapaCompletionAcknowledged(null), false);
    assert.equal(isJapaCompletionAcknowledged(new Response(null, { status: 200 })), true);
  });

  it('fails safe (returns null) on a corrupt stored entry instead of throwing', async () => {
    await AsyncStorage.setItem('shoonaya.japa.pending_completion.v1_user_user-A', 'not json{{{');
    assert.equal(await readPendingJapaCompletion('user-A'), null);
  });

  it('fails safe (returns null) on a stored entry missing required fields', async () => {
    await AsyncStorage.setItem('shoonaya.japa.pending_completion.v1_user_user-A', JSON.stringify({ createdAt: 'x' }));
    assert.equal(await readPendingJapaCompletion('user-A'), null);
  });

  it('readPendingJapaCompletions reports "unavailable" (not an empty queue) on corrupt stored data', async () => {
    await AsyncStorage.setItem('shoonaya.japa.pending_completion.v1_user_user-A', 'not json{{{');
    const result = await readPendingJapaCompletions('user-A');
    assert.deepEqual(result, { status: 'unavailable' });
  });

  it('readPendingJapaCompletions reports "unavailable" on a stored entry missing required fields', async () => {
    await AsyncStorage.setItem('shoonaya.japa.pending_completion.v1_user_user-A', JSON.stringify([{ createdAt: 'x' }]));
    const result = await readPendingJapaCompletions('user-A');
    assert.deepEqual(result, { status: 'unavailable' });
  });

  it('a write ABORTS instead of overwriting the queue when the existing stored data is corrupt -- the original bytes survive', async () => {
    const key = 'shoonaya.japa.pending_completion.v1_user_user-A';
    // A malformed queue is stored, simulating a read failure at the moment
    // of a second write -- this used to be silently treated as "empty" and
    // overwritten with just the new entry, discarding whatever was there.
    await AsyncStorage.setItem(key, 'not json{{{');

    await assert.rejects(
      writePendingJapaCompletion('user-A', { clientCompletionId: 'second', requestBody: '{}', createdAt: '' })
    );

    // The original (corrupt) bytes are untouched -- nothing was overwritten.
    assert.equal(await AsyncStorage.getItem(key), 'not json{{{');
  });

  it('reproduces and fixes the exact reported bug: first is never lost when a read fails before the second write', async () => {
    const key = 'shoonaya.japa.pending_completion.v1_user_user-A';
    await writePendingJapaCompletion('user-A', { clientCompletionId: 'first', requestBody: '{}', createdAt: '' });

    // Simulate a storage read failure occurring for the second write only,
    // by corrupting the bytes between the two writes.
    const goodBytes = await AsyncStorage.getItem(key);
    await AsyncStorage.setItem(key, 'not json{{{');

    await assert.rejects(
      writePendingJapaCompletion('user-A', { clientCompletionId: 'second', requestBody: '{}', createdAt: '' }),
      'a write must abort, not silently succeed, when it cannot read the existing queue'
    );

    // Restore the good bytes (as if the transient read failure passed) and
    // confirm "first" is still there -- it must never have been at risk.
    await AsyncStorage.setItem(key, goodBytes as string);
    const result = await readPendingJapaCompletions('user-A');
    assert.equal(result.status, 'ok');
    assert.deepEqual(result.status === 'ok' ? result.items.map((p) => p.clientCompletionId) : null, ['first']);
  });

  it('a clear ABORTS instead of writing a possibly-wrong queue when the existing stored data is corrupt', async () => {
    const key = 'shoonaya.japa.pending_completion.v1_user_user-A';
    await AsyncStorage.setItem(key, 'not json{{{');

    await assert.rejects(clearPendingJapaCompletion('user-A', 'anything'));
    assert.equal(await AsyncStorage.getItem(key), 'not json{{{');
  });
});
