import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import {
  canDeliverNotificationTap,
  deliverPendingNotificationTap,
  DEFAULT_TAP_ACTION,
  enqueueNotificationTap,
  getPendingNotificationTap,
  NOTIFICATION_TAP_HOLD_MS,
  observeNotificationResponses,
  resetNotificationTapState,
  routeForNotificationTap,
  subscribePendingNotificationTap,
  takePendingNotificationTap,
  type ResponseSource,
  type TapResponse,
} from '../lib/notificationTap';

beforeEach(() => resetNotificationTapState());

function response(identifier: string, data: Record<string, unknown>, overrides: Partial<TapResponse> = {}): TapResponse {
  return {
    actionIdentifier: DEFAULT_TAP_ACTION,
    notification: { date: 1_700_000_000, request: { identifier, content: { data } } },
    ...overrides,
  };
}

/** A stand-in for expo-notifications: a stored launching tap, plus the listeners registered after launch. */
function fakeSource(launching: TapResponse | null = null) {
  let last = launching;
  const listeners = new Set<(r: TapResponse) => void>();
  let clears = 0;
  const source: ResponseSource = {
    getLastNotificationResponse: () => last,
    clearLastNotificationResponse: () => { last = null; clears += 1; },
    addNotificationResponseReceivedListener: (listener) => {
      listeners.add(listener);
      return { remove: () => { listeners.delete(listener); } };
    },
  };
  return { source, tap: (r: TapResponse) => { last = r; listeners.forEach((l) => l(r)); }, listenerCount: () => listeners.size, clears: () => clears };
}

// ── Where a tap goes ─────────────────────────────────────────────────────────

test('the destination the backend sent wins over the notification type', () => {
  assert.equal(routeForNotificationTap({ type: 'tithi', url: 'https://www.shoonaya.com/japa' }), '/japa');
  assert.equal(routeForNotificationTap({ type: 'general', url: '/shloka' }), '/shloka');
});

test('a payload with no usable url falls back to its type, then to the inbox', () => {
  assert.equal(routeForNotificationTap({ type: 'tithi' }), '/panchang');
  assert.equal(routeForNotificationTap({ type: 'connection_request' }), '/mandali');
  assert.equal(routeForNotificationTap({ type: 'something-new' }), '/notifications');
  assert.equal(routeForNotificationTap({}), '/notifications');
  assert.equal(routeForNotificationTap(null), '/notifications');
  assert.equal(routeForNotificationTap(undefined), '/notifications');
});

test('a url that is not a string is ignored, not trusted', () => {
  assert.equal(routeForNotificationTap({ type: 'japa', url: 42 }), '/japa');
  assert.equal(routeForNotificationTap({ type: 'japa', url: { path: '/quiz' } }), '/japa');
  assert.equal(routeForNotificationTap({ url: ['/quiz'] }), '/notifications');
  assert.equal(routeForNotificationTap({ url: '' }), '/notifications');
});

// ── Holding a tap ────────────────────────────────────────────────────────────

test('a held tap is delivered once', () => {
  assert.equal(enqueueNotificationTap('a', { url: '/quiz' }), true);
  assert.equal(getPendingNotificationTap()?.href, '/quiz');
  assert.equal(takePendingNotificationTap(), '/quiz');
  assert.equal(takePendingNotificationTap(), null);
});

test('the same response is accepted only once, even after it was delivered', () => {
  assert.equal(enqueueNotificationTap('a', { url: '/quiz' }), true);
  takePendingNotificationTap();
  assert.equal(enqueueNotificationTap('a', { url: '/quiz' }), false);
  assert.equal(takePendingNotificationTap(), null);
});

test('a newer tap replaces one that was never delivered', () => {
  enqueueNotificationTap('a', { url: '/quiz' });
  enqueueNotificationTap('b', { url: '/japa' });
  assert.equal(takePendingNotificationTap(), '/japa');
});

test('a tap that waited longer than the hold time is dropped, not delivered late', () => {
  enqueueNotificationTap('a', { url: '/quiz' }, 1_000);
  assert.equal(takePendingNotificationTap(1_000 + NOTIFICATION_TAP_HOLD_MS + 1), null);
  assert.equal(getPendingNotificationTap(), null);
  enqueueNotificationTap('b', { url: '/quiz' }, 1_000);
  assert.equal(takePendingNotificationTap(1_000 + NOTIFICATION_TAP_HOLD_MS), '/quiz');
});

test('subscribers are told when a tap is held and when it is taken', () => {
  let calls = 0;
  const unsubscribe = subscribePendingNotificationTap(() => { calls += 1; });
  enqueueNotificationTap('a', { url: '/quiz' });
  takePendingNotificationTap();
  assert.equal(calls, 2);
  unsubscribe();
  enqueueNotificationTap('b', { url: '/quiz' });
  assert.equal(calls, 2);
});

// ── When it is safe to deliver ───────────────────────────────────────────────

const ready = { appInteractive: true, identityKind: 'authenticated' as const, profileResolutionFailed: false, rootSegment: '(tabs)' as string | undefined };

test('a tap is delivered only to a signed-in person on a settled screen', () => {
  assert.equal(canDeliverNotificationTap(ready), true);
  assert.equal(canDeliverNotificationTap({ ...ready, rootSegment: 'settings' }), true);

  assert.equal(canDeliverNotificationTap({ ...ready, appInteractive: false }), false, 'startup scene still showing');
  assert.equal(canDeliverNotificationTap({ ...ready, identityKind: 'loading' }), false, 'session not restored yet');
  assert.equal(canDeliverNotificationTap({ ...ready, identityKind: 'unauthenticated' }), false, 'signed out: hold it');
  assert.equal(canDeliverNotificationTap({ ...ready, identityKind: 'guest' }), false);
  assert.equal(canDeliverNotificationTap({ ...ready, profileResolutionFailed: true }), false, 'recovery screen is up');
  assert.equal(canDeliverNotificationTap({ ...ready, rootSegment: undefined }), false, 'index has not redirected yet');
  assert.equal(canDeliverNotificationTap({ ...ready, rootSegment: '(auth)' }), false, 'sign-in or onboarding');
  assert.equal(canDeliverNotificationTap({ ...ready, rootSegment: 'auth' }), false);
  assert.equal(canDeliverNotificationTap({ ...ready, rootSegment: 'sanctuary-preparing' }), false);
});

// ── Reading taps from expo-notifications ────────────────────────────────────

test('the tap that launched the app is collected even though no listener existed when it happened', () => {
  const { source, clears } = fakeSource(response('n1', { url: '/shloka' }));
  observeNotificationResponses(source);
  assert.equal(takePendingNotificationTap(), '/shloka');
  assert.equal(clears(), 1, 'the launching response is cleared so it cannot be replayed');
});

test('a tap while the app is running is collected', () => {
  const { source, tap } = fakeSource();
  observeNotificationResponses(source);
  assert.equal(getPendingNotificationTap(), null);
  tap(response('n2', { url: '/japa' }));
  assert.equal(takePendingNotificationTap(), '/japa');
});

test('a response seen by both the launch read and the listener opens one screen', () => {
  const r = response('n3', { url: '/quiz' });
  const { source, tap } = fakeSource(r);
  observeNotificationResponses(source);
  tap(r);
  assert.equal(takePendingNotificationTap(), '/quiz');
  assert.equal(takePendingNotificationTap(), null);
});

test('observing twice (a re-render) does not replay an earlier tap', () => {
  const r = response('n4', { url: '/quiz' });
  const first = fakeSource(r);
  const stop = observeNotificationResponses(first.source);
  assert.equal(takePendingNotificationTap(), '/quiz');
  stop();
  assert.equal(first.listenerCount(), 0, 'stopping removes the listener');
  const second = fakeSource(r);
  observeNotificationResponses(second.source);
  assert.equal(takePendingNotificationTap(), null);
});

test('only a tap on the notification itself navigates', () => {
  const { source, tap } = fakeSource();
  observeNotificationResponses(source);
  tap(response('n5', { url: '/quiz' }, { actionIdentifier: 'com.apple.UNNotificationDismissActionIdentifier' }));
  assert.equal(getPendingNotificationTap(), null);
});

test('a failure reading the launching tap does not stop live taps', () => {
  const { source, tap } = fakeSource();
  const broken: ResponseSource = { ...source, getLastNotificationResponse: () => { throw new Error('native module unavailable'); } };
  observeNotificationResponses(broken);
  tap(response('n6', { url: '/japa' }));
  assert.equal(takePendingNotificationTap(), '/japa');
});

test('a tap with no data still opens the inbox', () => {
  const { source } = fakeSource({ actionIdentifier: DEFAULT_TAP_ACTION, notification: { date: 1, request: { identifier: 'n7', content: {} } } });
  observeNotificationResponses(source);
  assert.equal(takePendingNotificationTap(), '/notifications');
});

test('live responses are acknowledged only after navigation and are not replayed on observer restart', () => {
  const fake = fakeSource();
  const stop = observeNotificationResponses(fake.source);
  fake.tap(response('live', { url: '/my-progress' }));
  assert.equal(fake.clears(), 0);
  let delivered = '';
  deliverPendingNotificationTap((href) => {
    assert.equal(fake.clears(), 0);
    delivered = String(href);
  });
  assert.equal(delivered, '/my-progress');
  assert.equal(fake.clears(), 1);
  stop();
  resetNotificationTapState();
  observeNotificationResponses(fake.source);
  assert.equal(getPendingNotificationTap(), null);
});

test('failed navigation preserves the response and intent for a successful retry', () => {
  const fake = fakeSource(response('retry', { url: '/quiz' }));
  observeNotificationResponses(fake.source);
  assert.equal(fake.clears(), 0);
  assert.throws(() => deliverPendingNotificationTap(() => { throw new Error('not mounted'); }));
  assert.equal(fake.clears(), 0);
  assert.equal(getPendingNotificationTap()?.href, '/quiz');
  deliverPendingNotificationTap(() => {});
  assert.equal(fake.clears(), 1);
});

test('profile revalidation holds taps until its possible onboarding redirect is resolved', () => {
  assert.equal(canDeliverNotificationTap({ ...ready, profileValidationPending: true }), false);
  assert.equal(canDeliverNotificationTap({ ...ready, profileValidationPending: false }), true);
});

test('untrusted URL hosts and schemes cannot be interpreted as internal screens', () => {
  for (const url of ['https://evil.example/japa', 'javascript:/japa', '//evil.example/japa']) {
    assert.equal(routeForNotificationTap({ type: 'japa', url }), '/notifications');
  }
});

test('both launch and live responses wait through login, then route exactly once', () => {
  const fake = fakeSource(response('held-login', { url: '/home?focus=weekly-summary' }));
  observeNotificationResponses(fake.source);
  assert.equal(fake.clears(), 0);
  assert.equal(canDeliverNotificationTap({ ...ready, identityKind: 'unauthenticated' }), false);
  assert.equal(canDeliverNotificationTap({ ...ready, rootSegment: '(auth)' }), false);
  assert.equal(getPendingNotificationTap()?.href, '/my-progress');
  assert.equal(canDeliverNotificationTap(ready), true);
  let count = 0;
  deliverPendingNotificationTap(() => { count++; });
  fake.tap(response('held-login', { url: '/home?focus=weekly-summary' }));
  deliverPendingNotificationTap(() => { count++; });
  assert.equal(count, 1);
});

test('every Mandali notification type the backend writes opens the Mandali tab when its url is missing (types read from production 2026-10-30)', () => {
  // trg_notify_mandali_comment writes mandali_comment; there is no mandali_mention type.
  for (const type of ['connection_request', 'connection_accepted', 'connection_rejected', 'connection_cancelled',
    'post_reaction', 'comment_reaction', 'mandali_comment', 'user_blocked', 'content_reported']) {
    assert.equal(routeForNotificationTap({ type }), '/mandali', type);
  }
  assert.equal(routeForNotificationTap({ type: 'mandali_mention' }), '/notifications', 'an invented type must not look supported');
});

test('a comment notification opens its comment inside its post, from the push url as from the inbox', () => {
  const url = '/mandali?postId=11111111-1111-4111-8111-111111111111&commentId=22222222-2222-4222-8222-222222222222';
  assert.equal(String(routeForNotificationTap({ type: 'mandali_comment', url })), url);
  assert.equal(String(routeForNotificationTap({ type: 'mandali_comment', url: `https://www.shoonaya.com${url}` })), url);
});
