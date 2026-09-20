import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captureAppIdentity, setAppIdentity } from '../lib/appIdentity';
import { LoadGenerationGuard } from '../lib/routeOpenAttribution';

test('an operation retains its original owner and expires on switching or signing out', () => {
  setAppIdentity({ kind: 'authenticated', userId: 'a' });
  const operation = captureAppIdentity();
  assert.equal(operation.isCurrent(), true);
  setAppIdentity({ kind: 'authenticated', userId: 'b' });
  assert.deepEqual(operation.identity, { kind: 'authenticated', userId: 'a' });
  assert.equal(operation.isCurrent(), false);
  const b = captureAppIdentity();
  setAppIdentity({ kind: 'guest' });
  assert.equal(b.isCurrent(), false);
});

test('returning to the same account cannot revive an earlier operation', () => {
  const a = { kind: 'authenticated', userId: 'a' } as const;
  setAppIdentity(a);
  const old = captureAppIdentity();
  setAppIdentity({ kind: 'unauthenticated' });
  setAppIdentity(a);
  assert.equal(old.isCurrent(), false);
  assert.equal(captureAppIdentity().isCurrent(), true);
});

test('same-account identity publication leaves current work valid', () => {
  setAppIdentity({ kind: 'authenticated', userId: 'a' });
  const operation = captureAppIdentity();
  setAppIdentity({ kind: 'authenticated', userId: 'a' });
  assert.equal(operation.isCurrent(), true);
});

test('load guards reject both superseded requests and account changes', () => {
  setAppIdentity({ kind: 'authenticated', userId: 'a' });
  const guard = new LoadGenerationGuard();
  const lease = captureAppIdentity();
  const first = guard.start();
  const second = guard.start();
  const current = (token: number) => lease.isCurrent() && guard.isCurrent(token);
  assert.equal(current(first), false);
  assert.equal(current(second), true);
  guard.cancel();
  assert.equal(current(second), false);
  const third = guard.start();
  setAppIdentity({ kind: 'guest' });
  assert.equal(current(third), false);
});
