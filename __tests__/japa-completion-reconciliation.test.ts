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
import { attemptAndReconcilePendingCompletion, parsePendingCompletionMantra } from '../lib/japaCompletionReconciliation';
import { writePendingJapaCompletion, readPendingJapaCompletions } from '../lib/japaPendingCompletion';
import type { JapaCompleteFetch } from '../lib/japaCompleteRetry';

function jsonResponse(status: number, body: Record<string, unknown> = {}) {
  return new Response(JSON.stringify(body), { status });
}

const USER = 'user-A';
const noDelayFetchImpl = (impl: JapaCompleteFetch): JapaCompleteFetch => impl;
const noDelay = async () => {};

describe('attemptAndReconcilePendingCompletion -- the shared retry/quarantine path', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('on success, clears the entry from the durable queue', async () => {
    await writePendingJapaCompletion(USER, { clientCompletionId: 'c1', requestBody: '{}', createdAt: '' });
    const fetchImpl = noDelayFetchImpl(async () => jsonResponse(200, { success: true }));

    const outcome = await attemptAndReconcilePendingCompletion(
      USER,
      { clientCompletionId: 'c1', requestBody: '{}', createdAt: '', status: 'pending' },
      fetchImpl
    );

    assert.equal(outcome.kind, 'success');
    const result = await readPendingJapaCompletions(USER);
    assert.equal(result.status, 'ok');
    assert.deepEqual(result.status === 'ok' ? result.items : null, []);
  });

  it('on a definitive rejection, quarantines the entry (status: failed) instead of clearing it', async () => {
    await writePendingJapaCompletion(USER, { clientCompletionId: 'c1', requestBody: '{}', createdAt: '' });
    const fetchImpl = noDelayFetchImpl(async () => jsonResponse(400, { error: 'invalid' }));

    const outcome = await attemptAndReconcilePendingCompletion(
      USER,
      { clientCompletionId: 'c1', requestBody: '{}', createdAt: '', status: 'pending' },
      fetchImpl
    );

    assert.equal(outcome.kind, 'definitive_rejection');
    const result = await readPendingJapaCompletions(USER);
    assert.equal(result.status, 'ok');
    assert.deepEqual(result.status === 'ok' ? result.items.map((i) => i.status) : null, ['failed']);
  });

  it('on an uncertain outcome, leaves the entry untouched (still pending, not cleared or quarantined)', async () => {
    await writePendingJapaCompletion(USER, { clientCompletionId: 'c1', requestBody: '{}', createdAt: '' });
    const fetchImpl = noDelayFetchImpl(async () => { throw new Error('network down'); });

    const outcome = await attemptAndReconcilePendingCompletion(
      USER,
      { clientCompletionId: 'c1', requestBody: '{}', createdAt: '', status: 'pending' },
      fetchImpl,
      () => {},
      noDelay
    );

    assert.equal(outcome.kind, 'uncertain');
    const result = await readPendingJapaCompletions(USER);
    assert.equal(result.status, 'ok');
    assert.deepEqual(result.status === 'ok' ? result.items.map((i) => i.status) : null, ['pending']);
  });

  it('a definitive rejection on one entry does not affect an independent pending entry', async () => {
    await writePendingJapaCompletion(USER, { clientCompletionId: 'bad', requestBody: '{}', createdAt: '' });
    await writePendingJapaCompletion(USER, { clientCompletionId: 'good', requestBody: '{}', createdAt: '' });
    const fetchImpl = noDelayFetchImpl(async () => jsonResponse(400));

    await attemptAndReconcilePendingCompletion(
      USER,
      { clientCompletionId: 'bad', requestBody: '{}', createdAt: '', status: 'pending' },
      fetchImpl
    );

    const result = await readPendingJapaCompletions(USER);
    assert.equal(result.status, 'ok');
    const byId = result.status === 'ok'
      ? Object.fromEntries(result.items.map((i) => [i.clientCompletionId, i.status]))
      : {};
    assert.deepEqual(byId, { bad: 'failed', good: 'pending' });
  });

  it('a manual retry replays the SAME requestBody (same embedded clientCompletionId), never a new operation', async () => {
    const originalBody = JSON.stringify({ clientCompletionId: 'c1', mantra: 'Om Namah Shivaya' });
    await writePendingJapaCompletion(USER, { clientCompletionId: 'c1', requestBody: originalBody, createdAt: '' });

    const bodiesSent: string[] = [];
    const fetchImpl = noDelayFetchImpl(async (_path, options) => {
      bodiesSent.push(options.body);
      return jsonResponse(200, { success: true });
    });

    await attemptAndReconcilePendingCompletion(
      USER,
      { clientCompletionId: 'c1', requestBody: originalBody, createdAt: '', status: 'failed' },
      fetchImpl
    );

    assert.deepEqual(bodiesSent, [originalBody]);
  });

  it('does not throw even if the storage layer cannot write the reconciliation (e.g. quarantine or clear fails)', async () => {
    // No pending entry was ever written for this id -- clear/mark-failed
    // will find nothing to update, but must not throw and break the
    // caller's control flow (the server outcome is the important part).
    const fetchImpl = noDelayFetchImpl(async () => jsonResponse(200, { success: true }));
    await assert.doesNotReject(
      attemptAndReconcilePendingCompletion(
        USER,
        { clientCompletionId: 'never-written', requestBody: '{}', createdAt: '', status: 'pending' },
        fetchImpl
      )
    );
  });
});

describe('parsePendingCompletionMantra', () => {
  it('extracts the mantra field from a valid request body', () => {
    assert.equal(parsePendingCompletionMantra(JSON.stringify({ mantra: 'Om Namah Shivaya' })), 'Om Namah Shivaya');
  });

  it('returns null for invalid JSON instead of throwing', () => {
    assert.equal(parsePendingCompletionMantra('not json{{{'), null);
  });

  it('returns null when the mantra field is missing or not a string', () => {
    assert.equal(parsePendingCompletionMantra(JSON.stringify({})), null);
    assert.equal(parsePendingCompletionMantra(JSON.stringify({ mantra: 42 })), null);
  });
});
