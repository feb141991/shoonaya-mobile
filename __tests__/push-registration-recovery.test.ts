import assert from 'node:assert/strict';
import test from 'node:test';
import { setAppIdentity } from '../lib/appIdentity';
import { PUSH_REGISTRATION_LEASE_MS, PushRegistrationCoordinator } from '../lib/pushRegistrationCoordinator';
import { loadPushRegistration } from './helpers/pushRegistrationHarness';

const registrations = (h: ReturnType<typeof loadPushRegistration>) => h.requests.filter((r) => r.method === 'POST' && r.body.token);

test('server pruning is repaired on foreground after the acknowledgement lease expires', async () => {
  const h = loadPushRegistration({ platform: 'android' });
  const stop = h.api.startPushRegistrationRecovery();
  await h.api.registerPushToken('owner');
  h.server.clear();
  await h.state('background');
  await h.advance(PUSH_REGISTRATION_LEASE_MS);
  await h.state('inactive'); await h.state('active');
  assert.equal(registrations(h).length, 2);
  assert.equal(h.server.size, 1);
  assert.equal(h.permissionPrompts(), 0);
  stop();
});

test('Control Center and a fresh background return do not cause redundant registrations', async () => {
  const h = loadPushRegistration(); const stop = h.api.startPushRegistrationRecovery();
  await h.api.registerPushToken('owner');
  await h.state('inactive'); await h.state('active');
  await h.state('background'); await h.state('active');
  assert.equal(registrations(h).length, 1); stop();
});

test('active heartbeat repairs pruning without navigation and stops in background', async () => {
  const h = loadPushRegistration(); const stop = h.api.startPushRegistrationRecovery();
  await h.api.registerPushToken('owner'); h.server.clear();
  await h.advance(PUSH_REGISTRATION_LEASE_MS);
  assert.equal(h.server.size, 1); assert.equal(registrations(h).length, 2);
  await h.state('background'); await h.advance(PUSH_REGISTRATION_LEASE_MS * 2);
  assert.equal(registrations(h).length, 2); stop();
});

test('Settings forces reconciliation within lease, and permission re-grant invalidates acknowledgement', async () => {
  const h = loadPushRegistration(); await h.api.registerPushToken('owner'); h.server.clear();
  await h.api.registerPushToken('owner', { force: true, reason: 'settings' });
  assert.equal(h.server.size, 1);
  h.setGranted(false); await h.api.registerPushToken('owner');
  assert.equal(h.api.getPushRegistrationStatus().status, 'permission_denied');
  h.setGranted(true); await h.api.registerPushToken('owner');
  assert.equal(registrations(h).length, 3);
  assert.equal(h.permissionPrompts(), 0);
});

test('OS Settings return bypasses lease even through inactive rather than background', async () => {
  const h = loadPushRegistration(); const stop = h.api.startPushRegistrationRecovery();
  await h.api.registerPushToken('owner'); h.server.clear();
  await h.api.openNotificationSettings(); await h.state('inactive'); await h.state('active');
  assert.equal(h.server.size, 1); stop();
});

test('native rotation passes SDK token through and does not recursively acquire it', async () => {
  const h = loadPushRegistration({ platform: 'android' }); const stop = h.api.startPushRegistrationRecovery();
  await h.api.registerPushToken('owner');
  assert.equal(h.tokenOptions.length, 1);
  await h.rotate('rotated-native');
  assert.equal(h.tokenOptions.length, 2);
  assert.equal(registrations(h).length, 2);
  assert.equal(registrations(h)[1].body.token, 'ExponentPushToken[rotated-native]'); stop();
});

test('parallel callers share one SDK acquisition and one backend acknowledgement', async () => {
  const h = loadPushRegistration();
  await Promise.all([h.api.registerPushToken('owner'), h.api.registerPushToken('owner', { force: true, reason: 'settings' }), h.api.registerPushToken('owner')]);
  assert.equal(registrations(h).length, 1); assert.equal(h.tokenOptions.length, 1);
});

test('transient failures retry within a bounded budget and do not poison the lease', async () => {
  const h = loadPushRegistration(); const stop = h.api.startPushRegistrationRecovery();
  h.failPosts(4); await h.api.registerPushToken('owner'); await h.advance(80_000);
  assert.equal(registrations(h).length, 4);
  assert.equal(h.api.getPushRegistrationStatus().status, 'failed');
  await h.state('background'); await h.state('active');
  assert.equal(registrations(h).length, 5); assert.equal(h.server.size, 1); stop();
});

test('logout removes acknowledged binding before destroying credentials and cold cleanup uses encrypted evidence', async () => {
  const h = loadPushRegistration(); await h.api.registerPushToken('owner'); await h.settle();
  assert.equal(h.storage.size, 1);
  const persisted = [...h.storage.values()][0]; assert.doesNotMatch(persisted, /credential|access_token/);
  await h.api.signOutWithPushCleanup(); assert.equal(h.server.size, 0); assert.equal(h.storage.size, 0);
  const cold = loadPushRegistration({ storage: new Map([['shoonaya.push.cleanup_binding.v1', persisted]]) });
  await cold.api.unregisterPushToken({ beforeSignOut: true });
  assert.equal(cold.requests[0].method, 'DELETE');
  assert.equal(cold.requests[0].body.bindingVersion, JSON.parse(persisted).bindingVersion);
  assert.equal(cold.storage.size, 0);
});

test('disk cleanup record never suppresses authenticated cold-start reconciliation', async () => {
  const h = loadPushRegistration(); await h.api.registerPushToken('owner'); await h.settle();
  const cold = loadPushRegistration({ storage: h.storage }); await cold.api.registerPushToken('owner');
  assert.equal(registrations(cold).length, 1);
});

test('a failed sign-out resumes registrations rather than permanently blocking them', async () => {
  const h = loadPushRegistration(); await h.api.registerPushToken('owner');
  h.failSignOut(new Error('offline sign-out')); await assert.rejects(h.api.signOutWithPushCleanup(), /offline/);
  await h.settle(); assert.equal(h.server.size, 1); assert.equal(registrations(h).length, 2);
});

test('A to B to A cannot revive a stale registration and uses versioned stale cleanup', async () => {
  let revision = 1; let owner = 'A'; let finish: (() => void) | undefined;
  const posted: string[] = []; let discarded = 0;
  const coordinator = new PushRegistrationCoordinator({
    captureIdentity: () => { const captured = revision; return { identity: { kind: 'authenticated', userId: owner }, revision, isCurrent: () => revision === captured }; },
    now: () => 1, projectId: () => 'project', permission: async () => 'granted', token: async () => 'token',
    post: async (_, userId) => { posted.push(userId); if (posted.length === 1) await new Promise<void>((resolve) => { finish = resolve; }); return { bindingVersion: String(revision), discard: async () => { discarded++; } }; },
    failure: () => {},
  });
  const first = coordinator.register('A'); for (let i = 0; i < 5; i++) await Promise.resolve();
  owner = 'B'; revision++; const middle = coordinator.register('B');
  owner = 'A'; revision++; const last = coordinator.register('A');
  finish?.(); const results = await Promise.all([first, middle, last]);
  assert.deepEqual(results.map((r) => r.status), ['superseded', 'superseded', 'registered']);
  assert.deepEqual(posted, ['A', 'A']); assert.equal(discarded, 1);
  assert.equal(coordinator.getBinding()?.revision, 3);
});

test('logout waits for an in-flight registration before deleting its binding', async () => {
  let finish: (() => void) | undefined;
  const h = loadPushRegistration({ post: () => new Promise<void>((resolve) => { finish = resolve; }) });
  const registration = h.api.registerPushToken('owner'); await h.settle();
  const cleanup = h.api.unregisterPushToken({ beforeSignOut: true }); await h.settle();
  finish?.(); await Promise.all([registration, cleanup]);
  assert.equal(h.server.size, 0);
  assert.deepEqual(h.requests.filter((r) => r.body.token).map((r) => r.method), ['POST', 'DELETE']);
  assert.equal((await h.api.registerPushToken('owner')).status, 'superseded');
  setAppIdentity({ kind: 'unauthenticated' });
});
