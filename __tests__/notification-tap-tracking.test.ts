import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test, { beforeEach } from 'node:test';

import type { AppIdentity } from '../lib/appIdentity';
import {
  DEFAULT_TAP_ACTION,
  deliverPendingNotificationTap,
  enqueueNotificationTap,
  getPendingNotificationTap,
  NOTIFICATION_TAP_HOLD_MS,
  observeNotificationResponses,
  resetNotificationTapState,
  type PendingNotificationTap,
  type ResponseSource,
  type TapResponse,
} from '../lib/notificationTap';
import {
  buildQueuedTap,
  classifyTapAnswer,
  clearTapQueue,
  consentAllowsTap,
  createSerialRunner,
  deterministicEventId,
  enqueueTap,
  flushTapQueue,
  parseTapQueue,
  serializeTapQueue,
  TAP_FLUSH_BATCH,
  TAP_QUEUE_LIMIT,
  TAP_QUEUE_MAX_AGE_MS,
  type QueuedTap,
  type TapConsent,
  type TapQueueDeps,
} from '../lib/notificationTapQueue';

const ROOT = join(__dirname, '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

const NOW = Date.parse('2026-11-12T06:00:00.000Z');
const userA: AppIdentity = { kind: 'authenticated', userId: 'user-a' };
const userB: AppIdentity = { kind: 'authenticated', userId: 'user-b' };

beforeEach(() => resetNotificationTapState());

function pendingTap(overrides: Partial<PendingNotificationTap> = {}): PendingNotificationTap {
  return {
    href: '/quiz' as PendingNotificationTap['href'],
    key: 'response-1:1700000000',
    receivedAt: NOW,
    notificationKey: 'quiz:daily-2026-11-12:available:2026-11-12:default',
    notificationType: 'quiz',
    launchState: 'running',
    ...overrides,
  };
}

type Post = { userId: string; body: Record<string, unknown> };

/** A device: one queue in "storage", a controllable identity and consent, and a recording network. */
function makeDevice(options: { identity?: AppIdentity; consent?: TapConsent; answer?: (post: Post, n: number) => { status: number; body?: unknown } | Error } = {}) {
  const state = {
    identity: options.identity ?? userA,
    consent: options.consent ?? { analytics: true, practice: true },
    stored: new Map<string, string>(),
    posts: [] as Post[],
    writes: 0,
    now: NOW,
  };
  const storeKey = (identity: AppIdentity) => (identity.kind === 'authenticated' ? `user:${identity.userId}` : identity.kind);
  const deps: TapQueueDeps = {
    now: () => state.now,
    getIdentity: () => state.identity,
    consent: () => state.consent,
    readQueue: async (identity) => state.stored.get(storeKey(identity)) ?? null,
    writeQueue: async (identity, value) => {
      // Mirrors writeUserScoped: a write for an identity that is no longer current is skipped.
      const current = state.identity;
      const same = identity.kind === current.kind && (identity.kind !== 'authenticated' || (current.kind === 'authenticated' && identity.userId === current.userId));
      if (!same) return;
      state.writes += 1;
      state.stored.set(storeKey(identity), value);
    },
    post: async (userId, body) => {
      state.posts.push({ userId, body });
      const answer = (options.answer ?? (() => ({ status: 202, body: { accepted: 1, consentRequired: false, religiousConsentRequired: false, unmatched: false } })))({ userId, body }, state.posts.length);
      if (answer instanceof Error) throw answer;
      return { status: answer.status, json: async () => answer.body ?? {} };
    },
    appVersion: '1.4.0',
    platform: 'ios',
  };
  const queue = (identity: AppIdentity = state.identity) => parseTapQueue(state.stored.get(storeKey(identity)) ?? null, state.now);
  return { state, deps, queue };
}

function queuedTap(i: number, overrides: Partial<QueuedTap> = {}): QueuedTap {
  return { id: deterministicEventId(`tap-${i}`), key: `quiz:key-${i}`, tappedAt: new Date(NOW - i * 1000).toISOString(), launchState: 'running', ...overrides };
}

// ── The tap carries which notification it was, and how the app was reached ────────────────────

test('a tap remembers the backend\'s notification key and type from the push payload', () => {
  enqueueNotificationTap('r1', { notificationKey: 'quiz:abc', type: 'quiz', url: '/quiz' }, NOW);
  const held = getPendingNotificationTap()!;
  assert.equal(held.notificationKey, 'quiz:abc');
  assert.equal(held.notificationType, 'quiz');
  assert.equal(held.launchState, 'running');
});

test('a push without a usable key is held for navigation but carries no key', () => {
  for (const data of [{}, { notificationKey: '' }, { notificationKey: 42 }, { notificationKey: 'k'.repeat(201) }, { notificationKey: { a: 1 } }, null, undefined]) {
    resetNotificationTapState();
    enqueueNotificationTap('r', data as Record<string, unknown> | null | undefined, NOW);
    assert.equal(getPendingNotificationTap()!.notificationKey, null, JSON.stringify(data));
  }
});

test('a malformed type is dropped, not trusted', () => {
  for (const type of ['Quiz', 'qu iz', '', 'x'.repeat(65), 7, null]) {
    resetNotificationTapState();
    enqueueNotificationTap('r', { notificationKey: 'k', type }, NOW);
    assert.equal(getPendingNotificationTap()!.notificationType, null, String(type));
  }
});

test('an OS link is not a notification tap: it has no key', () => {
  enqueueNotificationTap('system-link:1:1', { url: '/shloka' }, NOW);
  assert.equal(getPendingNotificationTap()!.notificationKey, null);
});

function response(identifier: string, data: Record<string, unknown>): TapResponse {
  return { actionIdentifier: DEFAULT_TAP_ACTION, notification: { date: 1_700_000_000, request: { identifier, content: { data } } } };
}
function fakeSource(launching: TapResponse | null) {
  let last = launching;
  const listeners = new Set<(r: TapResponse) => void>();
  const source: ResponseSource = {
    getLastNotificationResponse: () => last,
    clearLastNotificationResponse: () => { last = null; },
    addNotificationResponseReceivedListener: (listener) => { listeners.add(listener); return { remove: () => { listeners.delete(listener); } }; },
  };
  return { source, tap: (r: TapResponse) => { last = r; listeners.forEach((l) => l(r)); } };
}

test('the tap that launched the app is "cold_start"; a tap while it runs is "running"', () => {
  const launch = fakeSource(response('launch', { notificationKey: 'k-launch' }));
  const stop = observeNotificationResponses(launch.source);
  assert.equal(getPendingNotificationTap()!.launchState, 'cold_start');
  assert.equal(getPendingNotificationTap()!.notificationKey, 'k-launch');
  stop();

  resetNotificationTapState();
  const running = fakeSource(null);
  const stop2 = observeNotificationResponses(running.source);
  running.tap(response('later', { notificationKey: 'k-later' }));
  assert.equal(getPendingNotificationTap()!.launchState, 'running');
  stop2();
});

// ── A tap is counted only when it is delivered ───────────────────────────────────────────────

test('onDelivered runs after a successful navigation, with the tap', () => {
  enqueueNotificationTap('r1', { notificationKey: 'k1', url: '/quiz' }, NOW);
  const order: string[] = [];
  let seen: PendingNotificationTap | null = null;
  deliverPendingNotificationTap(() => order.push('navigate'), NOW, (tap) => { order.push('observe'); seen = tap; });
  assert.deepEqual(order, ['navigate', 'observe']);
  assert.equal((seen as PendingNotificationTap | null)?.notificationKey, 'k1');
});

test('a tap that went stale while held is not counted', () => {
  enqueueNotificationTap('r1', { notificationKey: 'k1' }, NOW);
  let observed = 0;
  deliverPendingNotificationTap(() => undefined, NOW + NOTIFICATION_TAP_HOLD_MS + 1, () => { observed += 1; });
  assert.equal(observed, 0);
});

test('a failed navigation is not counted and the tap stays held for retry', () => {
  enqueueNotificationTap('r1', { notificationKey: 'k1' }, NOW);
  let observed = 0;
  assert.throws(() => deliverPendingNotificationTap(() => { throw new Error('router not ready'); }, NOW, () => { observed += 1; }));
  assert.equal(observed, 0);
  assert.ok(getPendingNotificationTap(), 'still held');
});

test('a throwing observer can never break navigation or leave the tap held', () => {
  enqueueNotificationTap('r1', { notificationKey: 'k1' }, NOW);
  let navigated = 0;
  const delivered = deliverPendingNotificationTap(() => { navigated += 1; }, NOW, () => { throw new Error('measurement failed'); });
  assert.equal(delivered, true);
  assert.equal(navigated, 1);
  assert.equal(getPendingNotificationTap(), null, 'consumed');
});

// ── Event ids, validation and storage shape ──────────────────────────────────────────────────

test('the event id is a stable UUID: the same response gives the same id, different responses differ', () => {
  const a = deterministicEventId('response-1:1700000000');
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(deterministicEventId('response-1:1700000000'), a);
  assert.notEqual(deterministicEventId('response-2:1700000000'), a);
  assert.notEqual(deterministicEventId('response-1:1700000001'), a);
  const ids = new Set(Array.from({ length: 500 }, (_, i) => deterministicEventId(`r-${i}:1700000000`)));
  assert.equal(ids.size, 500, 'no collisions across 500 responses');
  assert.equal(deterministicEventId('pinned'), deterministicEventId('pinned'));
});

test('buildQueuedTap refuses what the server would refuse', () => {
  assert.equal(buildQueuedTap(pendingTap({ notificationKey: null })), null);
  assert.equal(buildQueuedTap(pendingTap({ notificationKey: 'k'.repeat(201) })), null);
  assert.equal(buildQueuedTap(pendingTap({ receivedAt: Number.NaN })), null);
  assert.equal(buildQueuedTap(pendingTap({ launchState: 'foreground' as never })), null);
  const ok = buildQueuedTap(pendingTap())!;
  assert.deepEqual(Object.keys(ok).sort(), ['id', 'key', 'launchState', 'tappedAt']);
  assert.equal(ok.tappedAt, '2026-11-12T06:00:00.000Z');
});

test('parseTapQueue keeps only exactly the current shape, drops the old, de-duplicates and bounds', () => {
  assert.deepEqual(parseTapQueue(null, NOW), []);
  assert.deepEqual(parseTapQueue('not json', NOW), []);
  assert.deepEqual(parseTapQueue('"a string"', NOW), []);
  assert.deepEqual(parseTapQueue(JSON.stringify({ v: 2, taps: [queuedTap(1)] }), NOW), [], 'a future version is not guessed at');
  assert.deepEqual(parseTapQueue(JSON.stringify({ v: 1, taps: 'x' }), NOW), []);
  const good = queuedTap(1);
  const raw = JSON.stringify({ v: 1, taps: [
    good, good,                                                       // duplicate
    { ...queuedTap(2), id: 'not-a-uuid' },
    { ...queuedTap(3), key: '' },
    { ...queuedTap(4), launchState: 'foreground' },
    { ...queuedTap(5), tappedAt: 'yesterday' },
    { ...queuedTap(6), tappedAt: new Date(NOW - TAP_QUEUE_MAX_AGE_MS - 1).toISOString() }, // too old
    null, 7, 'x',
  ] });
  assert.deepEqual(parseTapQueue(raw, NOW), [good]);
  const many = Array.from({ length: TAP_QUEUE_LIMIT + 5 }, (_, i) => queuedTap(i + 100));
  const kept = parseTapQueue(serializeTapQueue(many), NOW);
  assert.equal(kept.length, TAP_QUEUE_LIMIT);
  assert.equal(kept[kept.length - 1].id, many[many.length - 1].id, 'the newest are kept');
});

test('the queue is bounded on the way in and on the way out, each independently', () => {
  const many = Array.from({ length: TAP_QUEUE_LIMIT + 5 }, (_, i) => queuedTap(i + 200));
  // reading a file somebody else wrote (or an older build wrote) with too many taps
  const rawTooLong = JSON.stringify({ v: 1, taps: many });
  const parsed = parseTapQueue(rawTooLong, NOW);
  assert.equal(parsed.length, TAP_QUEUE_LIMIT);
  assert.equal(parsed[parsed.length - 1].id, many[many.length - 1].id);
  // writing: whatever is passed in, at most the limit reaches storage
  const written = JSON.parse(serializeTapQueue(many)) as { taps: unknown[] };
  assert.equal(written.taps.length, TAP_QUEUE_LIMIT);
});

test('an extra field in storage is not carried forward (no message text can ride along)', () => {
  const raw = JSON.stringify({ v: 1, taps: [{ ...queuedTap(1), title: 'Your quiz is ready', body: 'secret', url: '/quiz' }] });
  const parsed = parseTapQueue(raw, NOW);
  assert.deepEqual(Object.keys(parsed[0]).sort(), ['id', 'key', 'launchState', 'tappedAt']);
  assert.doesNotMatch(serializeTapQueue(parsed), /title|body|secret|url/);
});

// ── What this device allows ──────────────────────────────────────────────────────────────────

test('consent: nothing without analytics; practice types also need the practice setting; unknown types fail closed', () => {
  const off: TapConsent = { analytics: false, practice: true };
  const analyticsOnly: TapConsent = { analytics: true, practice: false };
  const both: TapConsent = { analytics: true, practice: true };
  assert.equal(consentAllowsTap(off, 'quiz'), 'consent_off');
  assert.equal(consentAllowsTap(off, 'post_reaction'), 'consent_off');
  assert.equal(consentAllowsTap(analyticsOnly, 'quiz'), 'practice_consent_off');
  assert.equal(consentAllowsTap(analyticsOnly, null), 'practice_consent_off', 'a missing type is treated as practice');
  assert.equal(consentAllowsTap(analyticsOnly, 'something_new'), 'practice_consent_off', 'an unknown type is treated as practice');
  assert.equal(consentAllowsTap(analyticsOnly, 'post_reaction'), 'ok', 'a social notification needs only analytics');
  assert.equal(consentAllowsTap(analyticsOnly, 'mandali_comment'), 'ok');
  assert.equal(consentAllowsTap(both, 'quiz'), 'ok');
});

// ── Queueing ─────────────────────────────────────────────────────────────────────────────────

test('enqueueTap queues a tap for the signed-in account, once', async () => {
  const device = makeDevice();
  assert.equal(await enqueueTap(device.deps, pendingTap()), 'queued');
  assert.equal(device.queue().length, 1);
  assert.equal(await enqueueTap(device.deps, pendingTap()), 'duplicate');
  assert.equal(device.queue().length, 1, 'the same response is never queued twice');
});

test('enqueueTap queues nothing when nobody is signed in', async () => {
  for (const identity of [{ kind: 'loading' }, { kind: 'guest' }, { kind: 'unauthenticated' }] as AppIdentity[]) {
    const device = makeDevice({ identity });
    assert.equal(await enqueueTap(device.deps, pendingTap()), 'not_signed_in', identity.kind);
    assert.equal(device.state.stored.size, 0);
  }
});

test('enqueueTap queues nothing for a push with no key, or without this device\'s consent', async () => {
  const noKey = makeDevice();
  assert.equal(await enqueueTap(noKey.deps, pendingTap({ notificationKey: null })), 'no_key');
  const off = makeDevice({ consent: { analytics: false, practice: true } });
  assert.equal(await enqueueTap(off.deps, pendingTap()), 'consent_off');
  const noPractice = makeDevice({ consent: { analytics: true, practice: false } });
  assert.equal(await enqueueTap(noPractice.deps, pendingTap({ notificationType: 'quiz' })), 'practice_consent_off');
  assert.equal(await enqueueTap(noPractice.deps, pendingTap({ notificationType: null })), 'practice_consent_off');
  assert.equal(await enqueueTap(noPractice.deps, pendingTap({ key: 'r2', notificationType: 'post_reaction' })), 'queued');
  for (const device of [noKey, off]) assert.equal(device.state.stored.size, 0, 'nothing was written');
});

test('a tap is never filed under an account that signed in while storage was being read', async () => {
  const device = makeDevice();
  const read = device.deps.readQueue;
  device.deps.readQueue = async (identity) => { const value = await read(identity); device.state.identity = userB; return value; };
  assert.equal(await enqueueTap(device.deps, pendingTap()), 'not_signed_in');
  assert.equal(device.state.stored.size, 0);
});

test('queues are per account: B never sees A\'s taps', async () => {
  const device = makeDevice();
  await enqueueTap(device.deps, pendingTap());
  device.state.identity = userB;
  assert.deepEqual(device.queue(userB), []);
  assert.equal(await enqueueTap(device.deps, pendingTap({ key: 'r-b', notificationKey: 'quiz:b' })), 'queued');
  assert.equal(device.queue(userA).length, 1);
  assert.equal(device.queue(userB).length, 1);
});

// ── Server answers ───────────────────────────────────────────────────────────────────────────

test('classifyTapAnswer: what each answer means for one tap', () => {
  assert.equal(classifyTapAnswer(202, { accepted: 1 }), 'ack');
  assert.equal(classifyTapAnswer(202, { accepted: 0, unmatched: true }), 'ack');
  assert.equal(classifyTapAnswer(202, { accepted: 0, religiousConsentRequired: true }), 'ack');
  assert.equal(classifyTapAnswer(202, { accepted: 0, consentRequired: true }), 'consent_off');
  assert.equal(classifyTapAnswer(202, null), 'ack', 'an unreadable body on a 202 is still the server saying it is handled');
  assert.equal(classifyTapAnswer(200, {}), 'ack');
  assert.equal(classifyTapAnswer(400, {}), 'drop');
  for (const status of [401, 403, 404, 408, 413, 429, 500, 502, 503]) assert.equal(classifyTapAnswer(status, {}), 'stop', String(status));
});

// ── Uploading ────────────────────────────────────────────────────────────────────────────────

async function seed(device: ReturnType<typeof makeDevice>, count: number) {
  const taps = Array.from({ length: count }, (_, i) => queuedTap(i + 1));
  device.state.stored.set('user:user-a', serializeTapQueue(taps));
  return taps;
}

test('flush sends the oldest first, exactly the allowed fields, for the signed-in account, and empties the queue on acknowledgement', async () => {
  const device = makeDevice();
  const taps = await seed(device, 3);
  const result = await flushTapQueue(device.deps);
  assert.equal(result.acknowledged, 3);
  assert.equal(device.queue().length, 0);
  assert.deepEqual(device.state.posts.map((p) => p.body.clientEventId), taps.map((t) => t.id), 'in queue order');
  for (const post of device.state.posts) {
    assert.equal(post.userId, 'user-a');
    assert.deepEqual(Object.keys(post.body).sort(), ['appVersion', 'clientEventId', 'launchState', 'notificationKey', 'platform', 'tappedAt']);
    assert.equal(JSON.stringify(post.body).includes('user-a'), false, 'the account is never in the body');
  }
});

test('flush sends nothing when signed out, and nothing without consent, and keeps the queue in both cases', async () => {
  const signedOut = makeDevice({ identity: { kind: 'unauthenticated' } });
  assert.equal((await flushTapQueue(signedOut.deps)).stoppedBy, 'not_signed_in');
  assert.equal(signedOut.state.posts.length, 0);

  const noConsent = makeDevice({ consent: { analytics: false, practice: false } });
  await seed(noConsent, 2);
  const result = await flushTapQueue(noConsent.deps);
  assert.equal(result.stoppedBy, 'consent_missing');
  assert.equal(noConsent.state.posts.length, 0, 'no request without consent');
  assert.equal(noConsent.queue().length, 2, 'kept, not discarded: the flags may simply not be read yet at start-up');
});

test('without consent, flush does not even read the stored queue', async () => {
  const device = makeDevice({ consent: { analytics: false, practice: false } });
  await seed(device, 2);
  let reads = 0;
  const read = device.deps.readQueue;
  device.deps.readQueue = async (identity) => { reads += 1; return read(identity); };
  await flushTapQueue(device.deps);
  assert.equal(reads, 0, 'storage is not touched while measurement is off');
  assert.equal(device.state.posts.length, 0);
});

test('flush removes a tap the server judged unmatched, religious-consent-missing or invalid, and keeps the rest', async () => {
  const device = makeDevice({ answer: (_post, n) => (
    n === 1 ? { status: 202, body: { accepted: 0, unmatched: true } }
    : n === 2 ? { status: 202, body: { accepted: 0, religiousConsentRequired: true } }
    : n === 3 ? { status: 400, body: { error: 'Invalid tap payload' } }
    : { status: 202, body: { accepted: 1 } }) });
  await seed(device, 4);
  const result = await flushTapQueue(device.deps);
  assert.equal(result.acknowledged, 3);
  assert.equal(result.dropped, 1);
  assert.equal(device.queue().length, 0);
});

test('flush empties the queue when the server says consent is off', async () => {
  const device = makeDevice({ answer: () => ({ status: 202, body: { accepted: 0, consentRequired: true } }) });
  await seed(device, 5);
  const result = await flushTapQueue(device.deps);
  assert.equal(result.stoppedBy, 'consent_off');
  assert.equal(device.state.posts.length, 1, 'it stops asking after the first answer');
  assert.equal(device.queue().length, 0);
});

test('flush keeps everything, and stops, on a refused sign-in, a missing route, a rate limit or a server error', async () => {
  for (const status of [401, 403, 404, 429, 500, 503]) {
    const device = makeDevice({ answer: () => ({ status }) });
    await seed(device, 3);
    const result = await flushTapQueue(device.deps);
    assert.equal(result.stoppedBy, 'server', String(status));
    assert.equal(device.state.posts.length, 1, `${status}: no hammering`);
    assert.equal(device.queue().length, 3, `${status}: nothing lost`);
  }
});

test('flush keeps everything when the network fails', async () => {
  const device = makeDevice({ answer: () => new Error('Network request failed') });
  await seed(device, 3);
  const result = await flushTapQueue(device.deps);
  assert.equal(result.stoppedBy, 'network');
  assert.equal(device.queue().length, 3);
});

test('a flush that fails part-way removes exactly the acknowledged taps', async () => {
  const device = makeDevice({ answer: (_post, n) => (n <= 2 ? { status: 202, body: { accepted: 1 } } : { status: 503 }) });
  const taps = await seed(device, 5);
  await flushTapQueue(device.deps);
  assert.deepEqual(device.queue().map((t) => t.id), taps.slice(2).map((t) => t.id));
});

test('flush sends at most one batch', async () => {
  const device = makeDevice();
  await seed(device, TAP_QUEUE_LIMIT);
  const result = await flushTapQueue(device.deps);
  assert.equal(device.state.posts.length, TAP_FLUSH_BATCH);
  assert.equal(result.remaining, TAP_QUEUE_LIMIT - TAP_FLUSH_BATCH);
});

test('an account switch mid-flush stops it and writes nothing for the new account', async () => {
  const device = makeDevice({ answer: (_post, n) => { if (n === 1) device.state.identity = userB; return { status: 202, body: { accepted: 1 } }; } });
  await seed(device, 3);
  const result = await flushTapQueue(device.deps);
  assert.equal(result.stoppedBy, 'identity_changed');
  assert.equal(device.state.posts.length, 1, 'no further request for the old account');
  assert.deepEqual(device.queue(userB), [], 'the new account has nothing');
  assert.equal(device.state.stored.has('user:user-b'), false, 'and nothing was written for it');
});

test('consent withdrawn mid-flush stops the uploads', async () => {
  const device = makeDevice({ answer: (_post, n) => { if (n === 1) device.state.consent = { analytics: false, practice: false }; return { status: 202, body: { accepted: 1 } }; } });
  await seed(device, 4);
  const result = await flushTapQueue(device.deps);
  assert.equal(result.stoppedBy, 'consent_missing');
  assert.equal(device.state.posts.length, 1);
});

test('a tap queued during an upload is not lost when the flush writes back', async () => {
  const device = makeDevice();
  await seed(device, 2);
  const post = device.deps.post;
  device.deps.post = async (userId, body) => {
    if (device.state.posts.length === 0) await enqueueTap(device.deps, pendingTap({ key: 'late', notificationKey: 'quiz:late' }));
    return post(userId, body);
  };
  await flushTapQueue(device.deps);
  assert.deepEqual(device.queue().map((t) => t.key), ['quiz:late']);
});

test('clearTapQueue empties the queue of the signed-in account only', async () => {
  const device = makeDevice();
  await seed(device, 3);
  await clearTapQueue(device.deps, 'someone-else');
  assert.equal(device.queue().length, 3, 'another account\'s id does nothing');
  await clearTapQueue(device.deps, 'user-a');
  assert.equal(device.queue().length, 0);
  device.state.identity = { kind: 'unauthenticated' };
  await clearTapQueue(device.deps, 'user-a');
});

test('the serial runner runs operations one at a time, in order, and one failure does not stop the next', async () => {
  const runner = createSerialRunner();
  const log: string[] = [];
  const slow = runner.run(async () => { log.push('a:start'); await new Promise((r) => setTimeout(r, 15)); log.push('a:end'); return 'a'; });
  const failing = runner.run(async () => { log.push('b'); throw new Error('boom'); });
  const last = runner.run(async () => { log.push('c'); return 'c'; });
  assert.equal(await slow, 'a');
  await assert.rejects(failing, /boom/);
  assert.equal(await last, 'c');
  assert.deepEqual(log, ['a:start', 'a:end', 'b', 'c']);
});

// ── Wiring guards (source) ───────────────────────────────────────────────────────────────────

test('the queue module is pure: no React Native, no network, no storage of its own', () => {
  const source = read('lib/notificationTapQueue.ts');
  assert.doesNotMatch(source, /from 'react-native'|from "react-native"/);
  assert.doesNotMatch(source, /AsyncStorage|apiFetch|fetch\(/);
});

test('the root layout counts a delivered tap and retries the queue with the other stable-foreground uploads', () => {
  const layout = read('app/_layout.tsx');
  assert.match(layout, /deliverPendingNotificationTap\(\(href\) => router\.push\(href\), Date\.now\(\), recordDeliveredNotificationTap\)/);
  // retried in the settled, foreground flush (AGENTS section 16), not at the background edge
  const settled = layout.slice(layout.indexOf('const scheduleFlush'), layout.indexOf('if (startupRouteReady && AppState.currentState === \'active\') scheduleFlush();'));
  assert.match(settled, /void flushNotificationTaps\(\)/);
  assert.match(layout, /initializeNotificationTapConsent\(userId\)\]\)\.then\(\(\) => \{[\s\S]{0,200}flushNotificationTaps\(\)/);
});

test('withdrawing "Help improve reminders" empties the queue; product usage and practice settings are unrelated to it', () => {
  const runtime = read('lib/productAnalyticsRuntime.ts');
  assert.doesNotMatch(runtime, /clearNotificationTapQueue/, 'taps no longer depend on the product-usage or practice switches');
  const tracking = read('lib/notificationTapTracking.ts');
  const revoke = tracking.slice(tracking.indexOf('export async function revokeNotificationTapConsent'));
  assert.match(revoke, /closeNotificationTapConsent\(userId\)/);
  assert.match(revoke, /clearNotificationTapQueue\(userId\)/);
});

test('the queue is user-scoped, so sign-out and account switches purge it', () => {
  assert.match(read('lib/userScopedStorage.ts'), /notificationTapQueue: 'notification_tap_queue_v1'/);
  const runtime = read('lib/notificationTapTracking.ts');
  assert.match(runtime, /readUserScoped\(identity, USER_SCOPED_NAMES\.notificationTapQueue\)/);
  assert.match(runtime, /writeUserScoped\(identity, USER_SCOPED_NAMES\.notificationTapQueue, value\)/);
  assert.doesNotMatch(runtime, /AsyncStorage/, 'never under a fixed AsyncStorage key');
});

test('the runtime reads consent from the dedicated tap consent, uploads to one route as the signed-in account, and never at the background edge', () => {
  const runtime = read('lib/notificationTapTracking.ts');
  assert.match(runtime, /analytics: isNotificationTapConsentEnabled\(\)/);
  assert.doesNotMatch(runtime, /isNativeAnalyticsEnabled|isNativePracticeAnalyticsEnabled/, 'not the product-usage gate');
  assert.match(runtime, /apiFetch\(TAP_UPLOAD_PATH,[\s\S]{0,120}expectedUserId: userId/);
  assert.match(runtime, /AppState\.currentState !== 'active'/);
  assert.equal(read('lib/notificationTapQueue.ts').includes("'/api/native/notification-taps'"), true);
});
