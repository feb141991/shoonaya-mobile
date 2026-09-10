import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { normalizeNotificationPermissionState } from '../lib/notificationPermissionState';

function load(options: { granted?: boolean; tokenError?: boolean; dev?: boolean } = {}) {
  const requests: Array<{ path: string; body: Record<string, unknown> }> = [];
  const tokenOptions: unknown[] = [];
  const granted = options.granted ?? true;
  const notificationModule = {
    setNotificationHandler: () => {},
    getPermissionsAsync: async () => ({ granted, status: granted ? 'granted' : 'denied', canAskAgain: false }),
    requestPermissionsAsync: async () => ({ granted, status: granted ? 'granted' : 'denied', canAskAgain: false }),
    getExpoPushTokenAsync: async (value: unknown) => {
      tokenOptions.push(value);
      if (options.tokenError) throw new Error('APNs registration failed');
      return { data: 'ExponentPushToken[test-device]' };
    },
  };
  const dependencies: Record<string, unknown> = {
    'react-native': { Platform: { OS: 'ios' }, Linking: {} },
    // Current expo-constants has no isDevice property.
    'expo-constants': { appOwnership: null, expoConfig: { extra: { eas: { projectId: 'aceb15a9-aa70-4db9-b785-961309a12e3f' } } } },
    'expo-notifications': notificationModule,
    '@/lib/api': { apiFetch: async (path: string, init: { body?: string }) => {
      requests.push({ path, body: JSON.parse(init.body ?? '{}') as Record<string, unknown> });
      return { ok: true };
    } },
    '@/lib/constants': { API_BASE: 'https://example.test' },
    '@/lib/supabase': { supabase: { auth: { getSession: async () => ({ data: { session: null } }) } } },
    '@/lib/routes': {},
    '@/lib/notificationPermissionState': { normalizeNotificationPermissionState },
  };
  const source = readFileSync(new URL('../lib/notifications.ts', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports: Record<string, unknown> = {};
  vm.runInNewContext(js, { exports, require: (id: string) => {
    if (!(id in dependencies)) throw new Error(`Unexpected import ${id}`);
    return dependencies[id];
  }, console, process: { env: {} }, __DEV__: options.dev ?? false });
  return { api: exports as {
    registerPushToken: (id: string) => Promise<void>;
    checkNotificationPermission: () => Promise<boolean>;
    requestNotificationPermission: () => Promise<boolean>;
  }, requests, tokenOptions };
}

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
