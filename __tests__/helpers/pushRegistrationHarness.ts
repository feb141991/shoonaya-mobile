import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { captureAppIdentity, getAppIdentity, setAppIdentity } from '../../lib/appIdentity';
import { PushRegistrationCoordinator, PUSH_REGISTRATION_HEARTBEAT_MS, type PushRegistrationOptions, type PushRegistrationResult } from '../../lib/pushRegistrationCoordinator';
import { normalizeNotificationPermissionState } from '../../lib/notificationPermissionState';

/** Executes the actual native module with SDK/transport adapters; never sends a push. */
export function loadPushRegistration(options: {
  platform?: 'ios' | 'android'; granted?: boolean; tokenError?: boolean; dev?: boolean;
  storage?: Map<string, string>; post?: () => Promise<void>;
} = {}) {
  setAppIdentity({ kind: 'unauthenticated' });
  setAppIdentity({ kind: 'authenticated', userId: 'owner' });
  let now = 1_800_000_000_000;
  let granted = options.granted ?? true;
  let failingPosts = 0;
  let signOutError: Error | null = null;
  let nativeToken = 'native-initial';
  let versionNumber = 0;
  const storage = options.storage ?? new Map<string, string>();
  const server = new Map<string, { owner: string; version: string }>();
  const requests: Array<{ path: string; method: string; owner: string; body: Record<string, unknown> }> = [];
  const tokenOptions: unknown[] = [];
  const lifecycle = new Set<(state: string) => void>();
  const rotation = new Set<(token: { type: string; data: string }) => void>();
  let permissionPrompts = 0;
  let timerId = 0;
  const timers = new Map<number, { at: number; interval?: number; callback: () => void }>();
  const addTimer = (callback: () => void, delay: number, interval?: number) => {
    const id = ++timerId;
    timers.set(id, { at: now + delay, interval, callback });
    return id;
  };
  const auth = {
    getSession: async () => {
      const identity = getAppIdentity();
      return { data: { session: identity.kind === 'authenticated' ? {
        user: { id: identity.userId }, access_token: `mock-credential-${identity.userId}`,
      } : null }, error: null };
    },
    signOut: async () => {
      if (signOutError) throw signOutError;
      setAppIdentity({ kind: 'unauthenticated' });
      return { error: null };
    },
  };
  const response = (body: Record<string, unknown>, status = 200) => ({ ok: status < 400, status, json: async () => body });
  const apiFetch = async (path: string, init: { method?: string; expectedUserId: string; body?: string }) => {
    const body = JSON.parse(init.body ?? '{}') as Record<string, unknown>;
    const method = init.method ?? 'GET';
    requests.push({ path, method, owner: init.expectedUserId, body });
    if (!body.token) return response({ acknowledged: true });
    if (method === 'DELETE') {
      const row = server.get(String(body.token));
      const matches = row?.owner === init.expectedUserId && (!body.bindingVersion || row.version === body.bindingVersion);
      if (matches) server.delete(String(body.token));
      return response({ removed: matches });
    }
    if (failingPosts-- > 0) return response({}, 503);
    await options.post?.();
    const version = `00000000-0000-4000-8000-${String(++versionNumber).padStart(12, '0')}`;
    server.set(String(body.token), { owner: init.expectedUserId, version });
    return response({ registered: true, bindingVersion: version });
  };
  const dependencies: Record<string, unknown> = {
    'react-native': {
      Platform: { OS: options.platform ?? 'ios' }, Linking: { openSettings: async () => {} },
      AppState: { currentState: 'active', addEventListener: (_: string, listener: (state: string) => void) => {
        lifecycle.add(listener); return { remove: () => lifecycle.delete(listener) };
      } },
    },
    'expo-secure-store': {
      getItemAsync: async (key: string) => storage.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => { storage.set(key, value); },
      deleteItemAsync: async (key: string) => { storage.delete(key); },
    },
    'expo-constants': { appOwnership: null, expoConfig: { extra: { eas: { projectId: 'aceb15a9-aa70-4db9-b785-961309a12e3f' } } } },
    'expo-notifications': {
      AndroidImportance: { DEFAULT: 3 }, setNotificationHandler: () => {},
      setNotificationChannelAsync: async () => {},
      getPermissionsAsync: async () => ({ granted, status: granted ? 'granted' : 'denied', canAskAgain: false }),
      requestPermissionsAsync: async () => { permissionPrompts++; return { granted, status: granted ? 'granted' : 'denied', canAskAgain: false }; },
      getExpoPushTokenAsync: async (value: { devicePushToken?: { data: string } }) => {
        tokenOptions.push(value);
        if (options.tokenError) throw new Error('APNs registration failed');
        // Expo may emit a native token during acquisition. This must not recurse.
        rotation.forEach((listener) => listener({ type: options.platform ?? 'ios', data: value.devicePushToken?.data ?? nativeToken }));
        return { data: `ExponentPushToken[${value.devicePushToken?.data ?? 'test-device'}]` };
      },
      addPushTokenListener: (listener: (token: { type: string; data: string }) => void) => {
        rotation.add(listener); return { remove: () => rotation.delete(listener) };
      },
    },
    '@/lib/api': { apiFetch }, '@/lib/constants': { API_BASE: 'https://example.test' },
    '@/lib/supabase': { supabase: { auth } }, '@/lib/routes': {},
    '@/lib/appIdentity': { captureAppIdentity, getAppIdentity },
    '@/lib/pushRegistrationCoordinator': { PushRegistrationCoordinator, PUSH_REGISTRATION_HEARTBEAT_MS, PUSH_REGISTRATION_LEASE_MS: 900_000, PUSH_RECOVERY_DELAYS_MS: [2_000, 10_000, 60_000] },
    '@/lib/notificationPermissionState': { normalizeNotificationPermissionState },
    'expo-crypto': { randomUUID: () => 'a1b2c3d4-e5f6-4789-8123-456789abcdef' },
    '@/lib/apiDiagnosticPolicy': {
      classifyApiDiagnostic: () => null,
      normalizeApiEndpoint: (path: string) => path.split(/[?#]/, 1)[0],
    },
    '@/lib/telemetry': { recordApiRequestDiagnostic: () => {} },
  };
  const source = readFileSync(new URL('../../lib/notifications.ts', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports: Record<string, unknown> = {};
  class Clock extends Date { static now() { return now; } }
  vm.runInNewContext(js, {
    exports, require: (id: string) => { if (!(id in dependencies)) throw new Error(`Unexpected import ${id}`); return dependencies[id]; },
    console, Date: Clock, Error, AbortController, process: { env: {} }, __DEV__: options.dev ?? false,
    setTimeout: (fn: () => void, ms: number) => addTimer(fn, ms), clearTimeout: (id: number) => timers.delete(id),
    setInterval: (fn: () => void, ms: number) => addTimer(fn, ms, ms), clearInterval: (id: number) => timers.delete(id),
    fetch: async (_: string, init: { headers: { Authorization: string }; body: string }) => {
      const owner = init.headers.Authorization.replace('Bearer mock-credential-', '');
      return apiFetch('/api/notifications/register-token', { method: 'DELETE', expectedUserId: owner, body: init.body });
    },
  });
  const settle = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
  return {
    api: exports as {
      registerPushToken: (id: string, options?: PushRegistrationOptions) => Promise<PushRegistrationResult>;
      unregisterPushToken: (options?: { beforeSignOut?: boolean }) => Promise<void>;
      signOutWithPushCleanup: () => Promise<unknown>;
      startPushRegistrationRecovery: () => () => void;
      getPushRegistrationStatus: () => { status: string; userId: string | null };
      openNotificationSettings: () => Promise<void>;
      checkNotificationPermission: () => Promise<boolean>;
      requestNotificationPermission: () => Promise<boolean>;
    }, requests, server, storage, tokenOptions, settle,
    permissionPrompts: () => permissionPrompts,
    setGranted: (value: boolean) => { granted = value; },
    failPosts: (count: number) => { failingPosts = count; },
    failSignOut: (error: Error) => { signOutError = error; },
    state: async (state: string) => { lifecycle.forEach((listener) => listener(state)); await settle(); },
    rotate: async (value: string) => { nativeToken = value; rotation.forEach((listener) => listener({ type: options.platform ?? 'ios', data: value })); await settle(); },
    advance: async (ms: number) => {
      const target = now + ms;
      while (true) {
        const next = [...timers.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        const [id, timer] = next; now = timer.at;
        if (timer.interval) timer.at += timer.interval; else timers.delete(id);
        timer.callback(); await settle();
      }
      now = target; await settle();
    },
  };
}
