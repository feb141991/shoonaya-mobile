import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { SettingsWriteCoordinator, confirmedSettingsConsent, settingsRetryDelay } from '../lib/settingsWriteCoordinator';
import type { PendingSettingsWrite } from '../lib/settingsCache';

const write = (id: string, fields: PendingSettingsWrite['fields'] = {}): PendingSettingsWrite => ({
  id, fields, attempts: 0, createdAt: 1, nextAttemptAt: 1, status: 'pending',
});
function latch() {
  let release = () => {};
  const promise = new Promise<void>((resolve) => { release = resolve; });
  return { promise, release };
}
function setup() {
  const queue = new SettingsWriteCoordinator();
  queue.bind('user-a', () => true);
  return queue;
}

test('new intent is persisted during an older send; late acknowledgment cannot erase it', async () => {
  const queue = setup();
  const first = write('first', { japa_reminder_enabled: true });
  const last = write('last', { japa_reminder_enabled: false });
  const started = latch(); const response = latch();
  const sent: string[] = []; let durable: PendingSettingsWrite | null = null;
  queue.setPending(first);
  const oldSend = queue.send(first, async (current) => {
    sent.push('first'); started.release(); await response.promise;
    if (current()) { queue.setPending(null); durable = null; }
  });
  await started.promise;
  queue.setPending(last);
  await queue.store(last, async () => { durable = last; });
  assert.equal(durable, last, 'durability must not wait for transport');
  const newSend = queue.send(last, async (current) => {
    sent.push('last'); assert.ok(current()); assert.equal(queue.getPending(), last);
  });
  response.release(); await oldSend; await newSend;
  assert.deepEqual(sent, ['first', 'last']);
  assert.equal(queue.getPending(), last);
  assert.equal(durable, last);
});

test('account switch invalidates active callbacks and queued sends, including A -> B -> A', async () => {
  const queue = new SettingsWriteCoordinator(); let revision = 0;
  queue.bind('a', () => revision === 0);
  const first = write('first'); queue.setPending(first);
  const started = latch(); const response = latch(); let applied = false;
  const send = queue.send(first, async (current) => {
    started.release(); await response.promise; applied = current();
  });
  await started.promise;
  const queued = queue.send(first, async () => { throw new Error('old queued send ran'); });
  revision++; queue.bind('b', () => revision === 1);
  revision++; queue.bind('a', () => revision === 2);
  queue.setPending(write('new-a'));
  response.release(); await send; await queued;
  assert.equal(applied, false);
});

test('unmount cancels queued work before it sends or persists', async () => {
  const queue = setup(); const op = write('op'); queue.setPending(op);
  const send = queue.send(op, async () => { throw new Error('send after unmount'); });
  const store = queue.store(op, async () => { throw new Error('store after unmount'); });
  queue.cancel(); await send; await store;
});

test('superseded retry attempts do not run again after the active attempt advances', async () => {
  const queue = setup(); const op = write('op'); queue.setPending(op);
  const first = queue.send(op, async () => { queue.setPending({ ...op, attempts: 1 }); });
  const duplicate = queue.send(op, async () => { throw new Error('duplicate old attempt'); });
  await first; await duplicate;
});

test('stale storage reads cannot clear a newer queued operation', async () => {
  const queue = setup(); const first = write('first'); queue.setPending(first);
  const started = latch(); const response = latch(); let cleared = false;
  const store = queue.store(first, async (current) => {
    started.release(); await response.promise; if (current()) cleared = true;
  });
  await started.promise; queue.setPending(write('last'));
  response.release(); await store; assert.equal(cleared, false);
});

test('a mutation revision invalidates reads started before its acknowledgment', () => {
  const queue = setup(); const revision = queue.getRevision();
  queue.setPending(write('op')); queue.setPending(null);
  assert.notEqual(queue.getRevision(), revision);
});

test('pending/failed opt-outs beat stale server grants; pending grants never enable analytics', () => {
  for (const status of ['pending', 'failed'] as const) {
    assert.deepEqual(confirmedSettingsConsent({ consent_product_analytics: true, consent_religious_data: true }, {
      ...write('revoke', { consent_product_analytics: false, consent_religious_data: false }), status,
    }), { product: false, practice: false });
  }
  assert.deepEqual(confirmedSettingsConsent({}, write('grant', {
    consent_product_analytics: true, consent_religious_data: true,
  })), { product: false, practice: false });
  assert.deepEqual(confirmedSettingsConsent({ consent_product_analytics: true, consent_religious_data: true }, null),
    { product: true, practice: true });
});

test('HTTP/network retry tables terminate, and Retry-After is respected within the budget', () => {
  for (const status of [undefined, 503, 429]) {
    assert.deepEqual([0, 1, 2, 3, 4, 20].map((n) => settingsRetryDelay(n, status)),
      [2000, 10000, 60000, 300000, null, null]);
  }
  assert.equal(settingsRetryDelay(0, 429, 90000), 90000);
  assert.equal(settingsRetryDelay(4, 429, 90000), null);
});

test('screen wires the tested coordinator into owner-bound sends and acknowledgment handling', () => {
  const screen = readFileSync('app/settings/detail-screen.tsx', 'utf8');
  assert.match(screen, /writeCoordinator\.send\(write/);
  assert.match(screen, /expectedUserId: identity\.userId/);
  assert.match(screen, /settingsRetryDelay\(write\.attempts, response\.status/);
  assert.match(screen, /confirmedSettingsConsent\(remote, writeCoordinator\.getPending\(\)\)/);
  assert.match(screen, /attempts: 0, status: 'pending'/);
  assert.doesNotMatch(screen, /nextBackoffMs\(write\.attempts\) \?\?/);
});
