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
    await clearPendingJapaCompletion('user-A');

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

    await clearPendingJapaCompletion('user-A');

    assert.equal(await readPendingJapaCompletion('user-A'), null);
    assert.ok(await readPendingJapaCompletion('user-B'));
  });

  it('a fresh write replaces the previous single slot for that user (one true pending completion at a time)', async () => {
    await writePendingJapaCompletion('user-A', { clientCompletionId: 'first', requestBody: '{}', createdAt: '' });
    await writePendingJapaCompletion('user-A', { clientCompletionId: 'second', requestBody: '{}', createdAt: '' });

    const pending = await readPendingJapaCompletion('user-A');
    assert.equal(pending?.clientCompletionId, 'second');
  });

  it('fails safe (returns null) on a corrupt stored entry instead of throwing', async () => {
    await AsyncStorage.setItem('shoonaya.japa.pending_completion.v1_user_user-A', 'not json{{{');
    assert.equal(await readPendingJapaCompletion('user-A'), null);
  });

  it('fails safe (returns null) on a stored entry missing required fields', async () => {
    await AsyncStorage.setItem('shoonaya.japa.pending_completion.v1_user_user-A', JSON.stringify({ createdAt: 'x' }));
    assert.equal(await readPendingJapaCompletion('user-A'), null);
  });
});
