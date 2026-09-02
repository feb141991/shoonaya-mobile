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
  queueSankalpaCheckin,
  resumePendingSankalpaCheckins,
  retryFailedSankalpaCheckins,
  hasFailedSankalpaCheckin,
  discardFailedSankalpaCheckins,
  clearSankalpaOutbox,
  clearAllSankalpaOutboxes,
} from '../lib/sankalpaOutbox';
import type { SankalpaCheckinFetch } from '../lib/sankalpaCheckinRetry';

function jsonResponse(status: number, body: Record<string, unknown> = {}) {
  return new Response(JSON.stringify(body), { status });
}

// Every outbox call below passes this as its trailing delay argument --
// the outbox's internal retry loop defaults to real setTimeout-based
// backoff (2s/10s/...), which would make a "permanently failing" test case
// take 12+ real seconds. This collapses those waits to nothing.
const noDelay = async () => {};

describe('Sankalpa outbox -- durability and identity isolation', () => {
  beforeEach(async () => {
    await clearAllSankalpaOutboxes();
  });

  it('a successful check-in leaves nothing queued', async () => {
    const fetchImpl: SankalpaCheckinFetch = async () => jsonResponse(200, { success: true });
    await queueSankalpaCheckin('user-A', 'sankalpa-1', fetchImpl, noDelay);
    assert.equal(await hasFailedSankalpaCheckin('user-A', 'sankalpa-1'), false);
  });

  it('a permanently-failing check-in is recorded as failed, not silently dropped', async () => {
    const fetchImpl: SankalpaCheckinFetch = async () => jsonResponse(500);
    await queueSankalpaCheckin('user-B', 'sankalpa-1', fetchImpl, noDelay);
    assert.equal(await hasFailedSankalpaCheckin('user-B', 'sankalpa-1'), true);
  });

  it('resumePendingSankalpaCheckins only resumes pending entries, never failed ones', async () => {
    // Queue and let it fail.
    await queueSankalpaCheckin('user-C', 'sankalpa-1', async () => jsonResponse(500), noDelay);
    assert.equal(await hasFailedSankalpaCheckin('user-C', 'sankalpa-1'), true);

    let resumeCalls = 0;
    await resumePendingSankalpaCheckins('user-C', async () => {
      resumeCalls++;
      return jsonResponse(200, { success: true });
    }, noDelay);

    assert.equal(resumeCalls, 0, 'A failed entry must wait for an explicit Retry, not auto-resume');
    assert.equal(await hasFailedSankalpaCheckin('user-C', 'sankalpa-1'), true, 'Still failed -- resume did not touch it');
  });

  it('retryFailedSankalpaCheckins explicitly retries a failed entry and can clear it', async () => {
    await queueSankalpaCheckin('user-D', 'sankalpa-1', async () => jsonResponse(500), noDelay);
    assert.equal(await hasFailedSankalpaCheckin('user-D', 'sankalpa-1'), true);

    await retryFailedSankalpaCheckins('user-D', async () => jsonResponse(200, { success: true }), noDelay);

    assert.equal(await hasFailedSankalpaCheckin('user-D', 'sankalpa-1'), false);
  });

  it('queueing the same sankalpa twice reuses the existing entry instead of duplicating it', async () => {
    let calls = 0;
    const fetchImpl: SankalpaCheckinFetch = async () => {
      calls++;
      return jsonResponse(500);
    };
    await queueSankalpaCheckin('user-E', 'sankalpa-1', fetchImpl, noDelay);
    await queueSankalpaCheckin('user-E', 'sankalpa-1', fetchImpl, noDelay);

    // Each queueSankalpaCheckin call attempts once internally (with its own
    // bounded retry inside attemptSankalpaCheckinWithRetry); the assertion
    // here is about outbox state, not raw call count -- there should be
    // exactly one failed entry, not two.
    const envelope = await AsyncStorage.getItem('shoonaya_sankalpa_outbox_v1_user_user-E');
    const parsed = JSON.parse(envelope!);
    assert.equal(parsed.pendingOperations.length, 1, 'A second queue for the same sankalpa must not create a duplicate outbox entry');
  });

  it('discardFailedSankalpaCheckins removes only failed entries', async () => {
    await queueSankalpaCheckin('user-F', 'sankalpa-1', async () => jsonResponse(500), noDelay);
    await discardFailedSankalpaCheckins('user-F');
    assert.equal(await hasFailedSankalpaCheckin('user-F', 'sankalpa-1'), false);
  });

  it('one user\'s outbox is never visible to another user', async () => {
    await queueSankalpaCheckin('user-G', 'sankalpa-1', async () => jsonResponse(500), noDelay);
    assert.equal(await hasFailedSankalpaCheckin('user-H', 'sankalpa-1'), false, 'User H must never see User G\'s failed check-in');
  });

  it('clearSankalpaOutbox removes one identity without touching another', async () => {
    await queueSankalpaCheckin('user-I', 'sankalpa-1', async () => jsonResponse(500), noDelay);
    await queueSankalpaCheckin('user-J', 'sankalpa-1', async () => jsonResponse(500), noDelay);

    await clearSankalpaOutbox('user-I');

    assert.equal(await hasFailedSankalpaCheckin('user-I', 'sankalpa-1'), false);
    assert.equal(await hasFailedSankalpaCheckin('user-J', 'sankalpa-1'), true);
  });

  it('clearAllSankalpaOutboxes (logout purge) wipes every identity', async () => {
    await queueSankalpaCheckin('user-K', 'sankalpa-1', async () => jsonResponse(500), noDelay);
    await clearAllSankalpaOutboxes();
    assert.equal(await hasFailedSankalpaCheckin('user-K', 'sankalpa-1'), false);
  });

  it('concurrent queue calls for different users do not race on each other\'s state', async () => {
    // Regression check for the same class of bug found in lib/telemetry.ts:
    // fire-and-forget writes to different identities must not interleave
    // and corrupt one another via a shared in-memory write chain keyed
    // incorrectly.
    await Promise.all([
      queueSankalpaCheckin('user-L', 'sankalpa-1', async () => jsonResponse(200, { success: true }), noDelay),
      queueSankalpaCheckin('user-M', 'sankalpa-1', async () => jsonResponse(500), noDelay),
    ]);
    assert.equal(await hasFailedSankalpaCheckin('user-L', 'sankalpa-1'), false);
    assert.equal(await hasFailedSankalpaCheckin('user-M', 'sankalpa-1'), true);
  });
});
