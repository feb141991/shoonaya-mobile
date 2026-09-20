import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captureAppIdentity, setAppIdentity } from '../lib/appIdentity';
import { isTelemetryUploadThrottled, decideTelemetryUploadAfterSummary } from '../lib/telemetryUploadPolicy';

// Regression coverage for the account-switch identity race fixed in
// lib/telemetryUpload.ts (docs/PERFORMANCE_RESEARCH_AND_EXECUTION_PLAN.md
// finding F06): maybeUploadTelemetrySummary captures an identity lease
// before two awaits (AsyncStorage read, getTelemetrySummary), then must
// refuse to send under a different identity than the one it captured.
// These tests exercise the real captureAppIdentity()/setAppIdentity()
// pair rather than a hand-rolled fake, since that is the actual mechanism
// production code relies on.

test('account switch during the upload window blocks the send', () => {
  setAppIdentity({ kind: 'authenticated', userId: 'user-a' });
  const identity = { kind: 'authenticated' as const, userId: 'user-a' };
  const { isCurrent } = captureAppIdentity();

  // Simulates the async gap: another account signs in before the summary
  // fetch resolves.
  setAppIdentity({ kind: 'authenticated', userId: 'user-b' });

  const decision = decideTelemetryUploadAfterSummary(identity, isCurrent, 5);
  assert.deepEqual(decision, { action: 'skip', reason: 'identity-changed' });
});

test('sign-out during the upload window blocks the send', () => {
  setAppIdentity({ kind: 'authenticated', userId: 'user-a' });
  const identity = { kind: 'authenticated' as const, userId: 'user-a' };
  const { isCurrent } = captureAppIdentity();

  // Simulates the async gap: the user signs out before the summary fetch
  // resolves. Named separately from the account-switch case above even
  // though both currently share the isCurrent() mechanism -- they are
  // distinct real-world triggers and a future change that special-cases
  // one incorrectly should still be caught here.
  setAppIdentity({ kind: 'unauthenticated' });

  const decision = decideTelemetryUploadAfterSummary(identity, isCurrent, 5);
  assert.deepEqual(decision, { action: 'skip', reason: 'identity-changed' });
});

test('a guest session becoming authenticated during the upload window blocks the send', () => {
  setAppIdentity({ kind: 'guest' });
  const identity = { kind: 'guest' as const };
  const { isCurrent } = captureAppIdentity();

  // The reverse direction of the same race: a guest summary must not get
  // uploaded carrying a real user's Bearer token just because a sign-in
  // happened to land inside the async gap.
  setAppIdentity({ kind: 'authenticated', userId: 'user-a' });

  const decision = decideTelemetryUploadAfterSummary(identity, isCurrent, 5);
  assert.deepEqual(decision, { action: 'skip', reason: 'identity-changed' });
});

test('switching away and back to the same account still counts as changed (A to B to A)', () => {
  setAppIdentity({ kind: 'authenticated', userId: 'user-a' });
  const identity = { kind: 'authenticated' as const, userId: 'user-a' };
  const { isCurrent } = captureAppIdentity();

  setAppIdentity({ kind: 'authenticated', userId: 'user-b' });
  setAppIdentity({ kind: 'authenticated', userId: 'user-a' });

  // A naive "is the userId still the same" check would wrongly allow this
  // through -- captureAppIdentity's revision counter must not be fooled by
  // returning to the original value.
  const decision = decideTelemetryUploadAfterSummary(identity, isCurrent, 5);
  assert.deepEqual(decision, { action: 'skip', reason: 'identity-changed' });
});

test('an unchanged identity sends, with expectedUserId for authenticated and none for guest', () => {
  setAppIdentity({ kind: 'authenticated', userId: 'user-a' });
  const authIdentity = { kind: 'authenticated' as const, userId: 'user-a' };
  const authLease = captureAppIdentity();
  assert.deepEqual(
    decideTelemetryUploadAfterSummary(authIdentity, authLease.isCurrent, 5),
    { action: 'send', expectedUserId: 'user-a' }
  );

  setAppIdentity({ kind: 'guest' });
  const guestIdentity = { kind: 'guest' as const };
  const guestLease = captureAppIdentity();
  assert.deepEqual(
    decideTelemetryUploadAfterSummary(guestIdentity, guestLease.isCurrent, 5),
    { action: 'send' }
  );
});

test('an empty summary is skipped even when the identity is unchanged', () => {
  setAppIdentity({ kind: 'authenticated', userId: 'user-a' });
  const identity = { kind: 'authenticated' as const, userId: 'user-a' };
  const { isCurrent } = captureAppIdentity();

  const decision = decideTelemetryUploadAfterSummary(identity, isCurrent, 0);
  assert.deepEqual(decision, { action: 'skip', reason: 'empty' });
});

// Delayed-upload / throttle-timing coverage.

test('an upload attempted before the throttle window elapses is skipped', () => {
  const now = 1_000_000;
  const lastUpload = now - 30 * 60 * 1000; // 30 minutes ago
  assert.equal(isTelemetryUploadThrottled(lastUpload, now, 60 * 60 * 1000), true);
});

test('an upload attempted exactly at the throttle boundary proceeds', () => {
  const now = 1_000_000;
  const lastUpload = now - 60 * 60 * 1000; // exactly 1 hour ago
  assert.equal(isTelemetryUploadThrottled(lastUpload, now, 60 * 60 * 1000), false);
});

test('a delayed upload long after the throttle window still proceeds', () => {
  const now = 1_000_000;
  const lastUpload = now - 5 * 24 * 60 * 60 * 1000; // 5 days ago (e.g. device backgrounded for days)
  assert.equal(isTelemetryUploadThrottled(lastUpload, now, 60 * 60 * 1000), false);
});

test('no prior upload timestamp is never throttled', () => {
  assert.equal(isTelemetryUploadThrottled(null, Date.now(), 60 * 60 * 1000), false);
});

test('a corrupt stored timestamp fails safe (never blocks future uploads)', () => {
  assert.equal(isTelemetryUploadThrottled(NaN, Date.now(), 60 * 60 * 1000), false);
});
