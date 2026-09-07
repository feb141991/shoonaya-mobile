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
  markPendingJapaCompletionFailed,
  retryFailedJapaCompletion,
  discardFailedJapaCompletion,
  listFailedJapaCompletions,
  hasFailedJapaCompletion,
  foldSyncQueueItems,
  type PendingJapaCompletion,
} from '../lib/japaPendingCompletion';

describe('Japa pending completion -- durable, owner-scoped persistence across process death', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns null when nothing has been persisted', async () => {
    assert.equal(await readPendingJapaCompletion('user-A'), null);
  });

  it('round-trips a written pending completion, defaulting to pending status', async () => {
    const pending: Omit<PendingJapaCompletion, 'status'> = {
      clientCompletionId: 'completion-1',
      requestBody: JSON.stringify({ clientCompletionId: 'completion-1', mantra: 'Om Namah Shivaya' }),
      createdAt: '2026-09-06T00:00:00.000Z',
    };
    await writePendingJapaCompletion('user-A', pending);

    assert.deepEqual(await readPendingJapaCompletion('user-A'), { ...pending, status: 'pending' });
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

  it('fails safe (returns null) on a corrupt stored entry instead of throwing', async () => {
    await AsyncStorage.setItem('shoonaya.japa.pending_completion.v1_user_user-A', 'not json{{{');
    assert.equal(await readPendingJapaCompletion('user-A'), null);
  });

  it('fails safe (returns null) on a stored entry missing required fields', async () => {
    await AsyncStorage.setItem('shoonaya.japa.pending_completion.v1_user_user-A', JSON.stringify({ createdAt: 'x' }));
    assert.equal(await readPendingJapaCompletion('user-A'), null);
  });

  it('accepts a legacy entry with no status field, defaulting it to pending', async () => {
    await AsyncStorage.setItem(
      'shoonaya.japa.pending_completion.v1_user_user-A',
      JSON.stringify([{ clientCompletionId: 'legacy', requestBody: '{}', createdAt: '' }])
    );
    const result = await readPendingJapaCompletions('user-A');
    assert.equal(result.status, 'ok');
    assert.deepEqual(result.status === 'ok' ? result.items : null, [
      { clientCompletionId: 'legacy', requestBody: '{}', createdAt: '', status: 'pending' },
    ]);
  });

  it('treats an entry with an invalid status value as corrupt, not as a silently-defaulted one', async () => {
    await AsyncStorage.setItem(
      'shoonaya.japa.pending_completion.v1_user_user-A',
      JSON.stringify([{ clientCompletionId: 'x', requestBody: '{}', createdAt: '', status: 'not-a-real-status' }])
    );
    const result = await readPendingJapaCompletions('user-A');
    assert.deepEqual(result, { status: 'unavailable' });
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

  describe('failed-item outbox conventions (mirrors lib/reactionOutbox.ts)', () => {
    it('markPendingJapaCompletionFailed quarantines an entry -- it stays in the queue, visible, not silently discarded', async () => {
      await writePendingJapaCompletion('user-A', { clientCompletionId: 'bad', requestBody: '{}', createdAt: '' });
      await markPendingJapaCompletionFailed('user-A', 'bad');

      const result = await readPendingJapaCompletions('user-A');
      assert.equal(result.status, 'ok');
      assert.deepEqual(result.status === 'ok' ? result.items.map((p) => p.status) : null, ['failed']);
      assert.equal(await hasFailedJapaCompletion('user-A'), true);
      assert.deepEqual((await listFailedJapaCompletions('user-A')).map((p) => p.clientCompletionId), ['bad']);
    });

    it('a failed entry does not block an independent pending entry from being listed as pending', async () => {
      await writePendingJapaCompletion('user-A', { clientCompletionId: 'bad', requestBody: '{}', createdAt: '' });
      await writePendingJapaCompletion('user-A', { clientCompletionId: 'good', requestBody: '{}', createdAt: '' });
      await markPendingJapaCompletionFailed('user-A', 'bad');

      const result = await readPendingJapaCompletions('user-A');
      assert.equal(result.status, 'ok');
      const byStatus = result.status === 'ok'
        ? Object.fromEntries(result.items.map((p) => [p.clientCompletionId, p.status]))
        : {};
      assert.deepEqual(byStatus, { bad: 'failed', good: 'pending' });
    });

    it('retryFailedJapaCompletion re-arms a failed entry back to pending', async () => {
      await writePendingJapaCompletion('user-A', { clientCompletionId: 'bad', requestBody: '{}', createdAt: '' });
      await markPendingJapaCompletionFailed('user-A', 'bad');
      await retryFailedJapaCompletion('user-A', 'bad');

      assert.equal(await hasFailedJapaCompletion('user-A'), false);
      assert.equal((await readPendingJapaCompletion('user-A'))?.status, 'pending');
    });

    it('discardFailedJapaCompletion removes it permanently', async () => {
      await writePendingJapaCompletion('user-A', { clientCompletionId: 'bad', requestBody: '{}', createdAt: '' });
      await markPendingJapaCompletionFailed('user-A', 'bad');
      await discardFailedJapaCompletion('user-A', 'bad');

      assert.equal(await readPendingJapaCompletion('user-A'), null);
      assert.equal(await hasFailedJapaCompletion('user-A'), false);
    });

    it('hasFailedJapaCompletion and listFailedJapaCompletions are isolated per user', async () => {
      await writePendingJapaCompletion('user-A', { clientCompletionId: 'bad-a', requestBody: '{}', createdAt: '' });
      await markPendingJapaCompletionFailed('user-A', 'bad-a');
      await writePendingJapaCompletion('user-B', { clientCompletionId: 'good-b', requestBody: '{}', createdAt: '' });

      assert.equal(await hasFailedJapaCompletion('user-A'), true);
      assert.equal(await hasFailedJapaCompletion('user-B'), false);
      assert.deepEqual(await listFailedJapaCompletions('user-B'), []);
    });
  });

  describe('foldSyncQueueItems -- the UI-refresh fix for "unavailable disappears from the banner"', () => {
    const sample: PendingJapaCompletion = { clientCompletionId: 'c1', requestBody: '{}', createdAt: '', status: 'pending' };

    it('replaces the display list with fresh items on a successful read', () => {
      const next = foldSyncQueueItems([sample], { status: 'ok', items: [] });
      assert.deepEqual(next, []);
    });

    it('preserves the previously-known items unchanged when the read is unavailable -- never silently empties the banner', () => {
      const next = foldSyncQueueItems([sample], { status: 'unavailable' });
      assert.deepEqual(next, [sample]);
    });

    it('an unavailable read after already having zero items stays empty (nothing to preserve, nothing invented)', () => {
      const next = foldSyncQueueItems([], { status: 'unavailable' });
      assert.deepEqual(next, []);
    });
  });
});
