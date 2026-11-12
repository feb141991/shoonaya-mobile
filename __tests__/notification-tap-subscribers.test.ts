import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  enqueueNotificationTap,
  getPendingNotificationTap,
  resetNotificationTapState,
  subscribePendingNotificationTap,
} from '../lib/notificationTap';

// Origin: 2026-11-12. Metro logged an error raised by a subscriber inside notify(), reached from the system-link handler
// (redirectSystemPath -> holdSystemLinkIntent -> enqueueNotificationTap), with a code frame and no message. It could not be
// reproduced with plain link opens. A subscriber that throws must not drop the tap, stop the other subscribers, or hide
// the reason.

describe('a throwing subscriber cannot drop a tap or a link', () => {
  const errors: unknown[][] = [];
  const originalError = console.error;
  const unsubscribers: Array<() => void> = [];

  beforeEach(() => {
    resetNotificationTapState();
    errors.length = 0;
    console.error = (...args: unknown[]) => { errors.push(args); };
  });
  afterEach(() => {
    console.error = originalError;
    for (const off of unsubscribers.splice(0)) off();
    resetNotificationTapState();
  });

  it('holds the tap, tells the other subscribers and does not throw', () => {
    let reached = 0;
    unsubscribers.push(subscribePendingNotificationTap(() => { throw new Error('boom'); }));
    unsubscribers.push(subscribePendingNotificationTap(() => { reached += 1; }));

    let accepted: boolean | undefined;
    assert.doesNotThrow(() => { accepted = enqueueNotificationTap('system-link:test:1', { url: '/home' }); });

    assert.equal(accepted, true, 'the tap is accepted');
    assert.equal(reached, 1, 'a later subscriber is still told');
    assert.equal(getPendingNotificationTap()?.key, 'system-link:test:1', 'the destination is held for delivery');
  });

  it('logs the reason, once per failure, without the tap contents', () => {
    unsubscribers.push(subscribePendingNotificationTap(() => { throw new TypeError('bad state'); }));
    enqueueNotificationTap('system-link:test:2', { url: '/home', notificationKey: 'secret-key-123' } as never);

    assert.equal(errors.length, 1);
    const text = errors[0].map(String).join(' ');
    assert.match(text, /TypeError: bad state/);
    assert.doesNotMatch(text, /secret-key-123|system-link:test:2/);
  });

  it('keeps working for the next tap after a failure', () => {
    let calls = 0;
    unsubscribers.push(subscribePendingNotificationTap(() => { calls += 1; if (calls === 1) throw new Error('first only'); }));
    enqueueNotificationTap('system-link:test:3', { url: '/home' });
    enqueueNotificationTap('system-link:test:4', { url: '/mandali' });
    assert.equal(calls, 2);
    assert.equal(getPendingNotificationTap()?.key, 'system-link:test:4');
  });
});
