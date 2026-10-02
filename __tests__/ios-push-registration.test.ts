import assert from 'node:assert/strict';
import test from 'node:test';
import { loadPushRegistration as load } from './helpers/pushRegistrationHarness';

test('physical iOS registration requests and saves a token without Constants.isDevice', async () => {
  const { api, requests, tokenOptions } = load();
  await api.registerPushToken('owner');
  assert.equal(tokenOptions.length, 1);
  assert.equal(JSON.stringify(tokenOptions[0]), JSON.stringify({ projectId: 'aceb15a9-aa70-4db9-b785-961309a12e3f' }));
  assert.equal(requests[0].body.token, 'ExponentPushToken[test-device]');
  assert.equal(requests[0].body.platform, 'ios');
  await api.registerPushToken('owner');
  assert.equal(requests.length, 1, 'already registered token is not posted twice');
});

test('denied permission stays denied even in development and does not request a token', async () => {
  const { api, requests, tokenOptions } = load({ granted: false, dev: true });
  assert.equal(await api.checkNotificationPermission(), false);
  assert.equal(await api.requestNotificationPermission(), false);
  await api.registerPushToken('owner');
  assert.equal(tokenOptions.length, 0);
  assert.equal(requests[0].body.failureStage, 'check_permission');
});

test('APNs errors are recorded rather than silently skipped or thrown', async () => {
  const { api, requests } = load({ tokenError: true });
  await api.registerPushToken('owner');
  assert.equal(requests[0].body.failureStage, 'fetch_expo_push_token');
  assert.match(String(requests[0].body.failureReason), /APNs registration failed/);
});
