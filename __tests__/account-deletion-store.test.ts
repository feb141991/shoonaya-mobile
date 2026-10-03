import assert from 'node:assert/strict';
import test from 'node:test';
import { createAccountDeletionStore, daysUntil } from '../lib/accountDeletionStore';

const NOW = Date.parse('2026-10-03T00:00:00Z');
const PURGE = '2026-10-18T00:00:00Z';

function harness() {
  let identity: { kind: string; userId?: string } = { kind: 'authenticated', userId: 'user-a' };
  let revision = 0;
  const calls: Array<{ path: string; method: string; expectedUserId: string }> = [];
  const reregistered: string[] = [];
  const responses: Record<string, { ok: boolean; status: number; body: unknown } | Error> = {};
  const store = createAccountDeletionStore({
    captureIdentity: () => { const r = revision; return { identity, isCurrent: () => r === revision }; },
    request: async (path, init) => {
      calls.push({ path, method: init.method ?? 'GET', expectedUserId: init.expectedUserId });
      const next = responses[path];
      if (next instanceof Error) throw next;
      if (!next) throw new Error(`unexpected ${path}`);
      return { ok: next.ok, status: next.status, json: async () => next.body };
    },
    reregisterPush: (userId) => { reregistered.push(userId); },
    now: () => NOW,
  });
  return {
    store, calls, reregistered, responses,
    switchTo: (userId: string | null) => {
      revision += 1;
      identity = userId ? { kind: 'authenticated', userId } : { kind: 'unauthenticated' };
    },
  };
}

const deleting = { success: true, isDeleting: true, deletionRequestedAt: '2026-09-18T00:00:00Z', purgeAfter: PURGE, daysRemaining: 15 };

test('refresh publishes the current account status and notifies subscribers once', async () => {
  const h = harness();
  let notified = 0;
  h.store.subscribe(() => { notified += 1; });
  h.responses['/api/user/delete/status'] = { ok: true, status: 200, body: deleting };
  const status = await h.store.refresh('user-a');
  assert.deepEqual(status, { userId: 'user-a', isDeleting: true, deletionRequestedAt: '2026-09-18T00:00:00Z', purgeAfter: PURGE, daysRemaining: 15 });
  assert.equal(notified, 1);
  assert.deepEqual(h.calls, [{ path: '/api/user/delete/status', method: 'GET', expectedUserId: 'user-a' }]);
});

test('statusFor never returns one account’s state to another', async () => {
  const h = harness();
  h.responses['/api/user/delete/status'] = { ok: true, status: 200, body: deleting };
  await h.store.refresh('user-a');
  assert.equal(h.store.statusFor('user-b'), null);
  assert.equal(h.store.statusFor(null), null);
  assert.equal(h.store.statusFor('user-a')?.isDeleting, true);
});

test('a status response that lands after an account switch is discarded', async () => {
  const h = harness();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  h.responses['/api/user/delete/status'] = { ok: true, status: 200, body: deleting };
  const store = createAccountDeletionStore({
    captureIdentity: (() => { let rev = 0; return () => { const r = rev; return { identity: { kind: 'authenticated', userId: 'user-a' }, isCurrent: () => r === rev && !switched }; }; })(),
    request: async () => { await gate; return { ok: true, status: 200, json: async () => deleting }; },
    reregisterPush: () => {}, now: () => NOW,
  });
  let switched = false;
  const pending = store.refresh('user-a');
  switched = true; release();
  assert.equal(await pending, null);
  assert.equal(store.getSnapshot(), null);
});

test('cancel resolves only on a confirmed 2xx success, then clears state and re-registers push exactly once', async () => {
  const h = harness();
  h.responses['/api/user/delete/status'] = { ok: true, status: 200, body: deleting };
  await h.store.refresh('user-a');
  h.responses['/api/user/delete/cancel'] = { ok: true, status: 200, body: { success: true, isDeleting: false } };
  await h.store.cancel('user-a');
  assert.equal(h.store.statusFor('user-a')?.isDeleting, false);
  assert.deepEqual(h.reregistered, ['user-a']);
  assert.deepEqual(h.calls.at(-1), { path: '/api/user/delete/cancel', method: 'POST', expectedUserId: 'user-a' });
});

test('a failed cancel throws, keeps the deleting state and does not re-register push', async () => {
  for (const failure of [
    { ok: false, status: 500, body: { success: false, error: 'db down' } },
    { ok: false, status: 502, body: { success: true } },
    { ok: true, status: 200, body: { success: false } },
    { ok: true, status: 200, body: null },
  ]) {
    const h = harness();
    h.responses['/api/user/delete/status'] = { ok: true, status: 200, body: deleting };
    await h.store.refresh('user-a');
    h.responses['/api/user/delete/cancel'] = failure;
    await assert.rejects(h.store.cancel('user-a'));
    assert.equal(h.store.statusFor('user-a')?.isDeleting, true);
    assert.deepEqual(h.reregistered, []);
  }
});

test('cancel refuses to act for an account that is no longer signed in', async () => {
  const h = harness();
  h.switchTo('user-b');
  await assert.rejects(h.store.cancel('user-a'));
  assert.equal(h.calls.length, 0);
});

test('markScheduled publishes the confirmed request and computes days remaining', () => {
  const h = harness();
  h.store.markScheduled('user-a', '2026-10-03T00:00:00Z', PURGE);
  assert.deepEqual(h.store.statusFor('user-a'), {
    userId: 'user-a', isDeleting: true, deletionRequestedAt: '2026-10-03T00:00:00Z', purgeAfter: PURGE, daysRemaining: 15,
  });
});

test('daysUntil clamps past dates to 0 and rejects missing or invalid dates', () => {
  assert.equal(daysUntil(PURGE, NOW), 15);
  assert.equal(daysUntil('2026-09-01T00:00:00Z', NOW), 0);
  assert.equal(daysUntil(null, NOW), null);
  assert.equal(daysUntil('not a date', NOW), null);
});
