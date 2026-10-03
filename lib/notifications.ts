import { AppState, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import type { NotificationPermissionsStatus } from 'expo-notifications';
import type { Href, useRouter } from 'expo-router';

import { apiFetch } from '@/lib/api';
import { API_BASE } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { classifyApiDiagnostic, normalizeApiEndpoint } from '@/lib/apiDiagnosticPolicy';
import { recordApiRequestDiagnostic } from '@/lib/telemetry';
import { captureAppIdentity, getAppIdentity } from '@/lib/appIdentity';
import {
  PushRegistrationCoordinator, PUSH_REGISTRATION_HEARTBEAT_MS, PUSH_REGISTRATION_LEASE_MS, PUSH_RECOVERY_DELAYS_MS,
  type NativePushToken, type PushBinding, type PushRegistrationOptions,
} from '@/lib/pushRegistrationCoordinator';
import { pathFromUrlLike, resolveNativeRoute } from '@/lib/routes';
import {
  normalizeNotificationPermissionState,
  type NotificationPermissionState,
} from '@/lib/notificationPermissionState';

/**
 * Push notifications — migrated off OneSignal to Expo's own push service
 * (expo-notifications + https://exp.host/--/api/v2/push/send). OneSignal
 * managed device↔user binding on its own servers via `external_id`; Expo
 * push has no such registry, so this device's token is registered against
 * our own backend instead (POST/DELETE /api/notifications/register-token,
 * backed by the `push_tokens` table — see web repo migration
 * 20260716124259_push_tokens.sql and src/lib/push-server.ts).
 *
 * Remote push requires a real dev/internal build, not Expo Go — the same
 * restriction OneSignal already had (`react-native-onesignal` needed a
 * native binary too), so this isn't a new limitation introduced by the
 * migration.
 */

const isExpoGo = Constants.appOwnership === 'expo';
type NotificationsModule = typeof import('expo-notifications');
let Notifications: NotificationsModule | null = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch {
    Notifications = null;
  }
}

// Real `data.type` values the web repo's push senders actually use —
// confirmed by a full-repo grep of src/lib/push-server.ts call sites
// (crons + /api/notifications/{test,milestone,admin/broadcast}). Kept in
// sync with the union that used to live here for OneSignal; the set of
// values sent server-side didn't change, only the transport did.
type NotificationType =
  | 'tithi'
  | 'festival'
  | 'streak'
  | 'nitya'
  | 'japa'
  | 'general'
  | 'test'
  | 'milestone'
  | 'brahma_muhurta'
  | 'sanskar_milestone'
  | 'guided-plan'
  | 'mandali_mention'
  | 'broadcast'
  | 'connection_request'
  | 'connection_accepted'
  | 'connection_rejected'
  | 'connection_cancelled'
  | 'user_blocked'
  | 'content_reported'
  | 'post_reaction'
  | 'mood'
  | 'mood_checkin';

type NotificationAdditionalData = {
  type?: NotificationType;
  url?: string;
  [key: string]: unknown;
};

type Router = ReturnType<typeof useRouter>;

// Single source of truth for how notifications present while the app is
// foregrounded. Deliberately the same shape as app/vrat.tsx's own local
// handler (that screen schedules its own local Ekadashi/Vrat reminders,
// unrelated to this remote-push path) — not consolidated into one call
// site since vrat.tsx's usage is self-contained and out of scope here, but
// worth knowing both exist so they're never edited to diverge silently.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Only emergency session-loss cleanup uses this credential. Explicit logout
// removes the binding with the current session BEFORE destroying credentials.
let cleanupCredential: { userId: string; accessToken: string } | null = null;
let notificationChannelReady: Promise<void> | null = null;
let systemSettingsOpened = false;
let foreground = true;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryRevision: number | null = null;
let retryCount = 0;
const diagnosticTimes = new Map<string, number>();
const CLEANUP_BINDING_KEY = 'shoonaya.push.cleanup_binding.v1';
const PUSH_FAILURE_QUEUE_KEY = 'shoonaya.push.failure_queue.v1';
const PUSH_FAILURE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
let cleanupStorageWork: Promise<void> = Promise.resolve();
let failureQueueWork: Promise<void> = Promise.resolve();

// Disk records are cleanup evidence only. Never hydrate a "fresh" lease from
// disk: every authenticated cold start must reconcile with the server.
function persistCleanupBinding(binding: PushBinding, isCurrent: () => boolean) {
  cleanupStorageWork = cleanupStorageWork.catch(() => {}).then(async () => {
    if (isCurrent()) await SecureStore.setItemAsync(CLEANUP_BINDING_KEY, JSON.stringify(binding));
  });
  void cleanupStorageWork.catch(() => {});
}

async function readCleanupBinding(userId: string | undefined): Promise<PushBinding | null> {
  if (!userId) return null;
  try {
    await cleanupStorageWork.catch(() => {});
    const raw = await SecureStore.getItemAsync(CLEANUP_BINDING_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const b = value as Record<string, unknown>;
    if (b.userId !== userId || b.projectId !== getExpoProjectId() || typeof b.token !== 'string'
      || !/^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(b.token)
      || (b.bindingVersion !== null && !validBindingVersion(b.bindingVersion))) return null;
    return { userId, projectId: getExpoProjectId(), token: b.token, bindingVersion: b.bindingVersion,
      revision: -1, acknowledgedAt: 0 };
  } catch { return null; }
}

async function clearCleanupBinding(userId: string) {
  cleanupStorageWork = cleanupStorageWork.catch(() => {}).then(async () => {
    const raw = await SecureStore.getItemAsync(CLEANUP_BINDING_KEY);
    if (raw) {
      const value: unknown = JSON.parse(raw);
      if (value && typeof value === 'object' && 'userId' in value && value.userId === userId) await SecureStore.deleteItemAsync(CLEANUP_BINDING_KEY);
    }
  });
  await cleanupStorageWork.catch(() => {});
}

function logPushWarning(label: string, error: unknown) {
  if (__DEV__) {
    console.warn(label, error);
  }
}

/**
 * Best-effort diagnostic beacon for a registerPushToken failure -- posted to
 * the same endpoint a successful registration uses, distinguished by having
 * `failureReason` instead of `token`. Fixes a real blind spot: this failure
 * class previously only reached __DEV__-gated console.warn, so a production
 * build could fail token registration on every single launch with zero
 * visibility anywhere -- confirmed happening for every iOS user until this
 * was added (push_tokens/push_token_events showed zero iOS rows, ever).
 * Never throws, never awaited by callers -- must not add latency or a new
 * failure mode to the already-failing path it's reporting on.
 */
function reportPushRegistrationFailure(userId: string, stage: string, error: unknown) {
  const lease = captureAppIdentity();
  if (lease.identity.kind !== 'authenticated' || lease.identity.userId !== userId) return;
  const message = sanitizePushFailure(error);
  const key = `${lease.revision}:${stage}:${message.slice(0, 200)}`;
  const last = diagnosticTimes.get(key);
  if (last != null && Date.now() >= last && Date.now() - last < 60 * 60 * 1000) return;
  if (diagnosticTimes.size >= 20) diagnosticTimes.clear();
  diagnosticTimes.set(key, Date.now());
  void apiFetch('/api/notifications/register-token', {
    method: 'POST',
    expectedUserId: userId,
    timeoutMs: 5_000,
    body: JSON.stringify({
      platform: Platform.OS,
      failureStage: stage,
      failureReason: message.slice(0, 200),
    }),
  }).then((response) => {
    if (!response.ok) enqueuePushFailure(userId, stage, message);
  }).catch(() => {
    enqueuePushFailure(userId, stage, message);
  });
}

function sanitizePushFailure(error: unknown): string {
  return (error instanceof Error ? error.message : String(error))
    .replace(/(?:Exponent|Expo)PushToken\[[^\]]*\]/g, '[push-token]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[credential]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .slice(0, 200);
}

type QueuedPushFailure = { userId: string; stage: string; reason: string; occurredAt: number };

function enqueuePushFailure(userId: string, stage: string, reason: string) {
  failureQueueWork = failureQueueWork.catch(() => {}).then(async () => {
    try {
      const raw = await SecureStore.getItemAsync(PUSH_FAILURE_QUEUE_KEY);
      const value: unknown = raw ? JSON.parse(raw) : [];
      const prior = Array.isArray(value) ? value.filter((item): item is QueuedPushFailure =>
        item && typeof item === 'object' && typeof item.userId === 'string' && typeof item.stage === 'string'
        && typeof item.reason === 'string' && typeof item.occurredAt === 'number'
        && item.occurredAt >= Date.now() - PUSH_FAILURE_RETENTION_MS) : [];
      const next = [...prior, { userId, stage, reason: sanitizePushFailure(reason), occurredAt: Date.now() }].slice(-10);
      await SecureStore.setItemAsync(PUSH_FAILURE_QUEUE_KEY, JSON.stringify(next));
    } catch { /* Local evidence is best-effort and must not block recovery. */ }
  });
  void failureQueueWork.catch(() => {});
}

async function flushPushFailures(userId: string) {
  failureQueueWork = failureQueueWork.catch(() => {}).then(async () => {
    try {
      const raw = await SecureStore.getItemAsync(PUSH_FAILURE_QUEUE_KEY);
      if (!raw) return;
      const value: unknown = JSON.parse(raw);
      if (!Array.isArray(value)) return;
      const queued = value.filter((item): item is QueuedPushFailure => item && typeof item === 'object'
        && item.userId === userId && typeof item.stage === 'string' && typeof item.reason === 'string'
        && typeof item.occurredAt === 'number');
      const retained = value.filter((item) => !item || typeof item !== 'object' || !('userId' in item) || item.userId !== userId);
      const lease = captureAppIdentity();
      if (lease.identity.kind !== 'authenticated' || lease.identity.userId !== userId) return;
      if (queued.length) {
        const response = await apiFetch('/api/notifications/register-token', {
          method: 'POST', expectedUserId: userId, timeoutMs: 5_000,
          body: JSON.stringify({ platform: Platform.OS, failureEvents: queued.map((event) => ({
            stage: event.stage,
            reason: `occurred_at:${new Date(event.occurredAt).toISOString()} | ${event.reason}`,
          })) }),
        });
        if (!lease.isCurrent() || !response.ok) return;
      }
      if (lease.isCurrent()) await SecureStore.setItemAsync(PUSH_FAILURE_QUEUE_KEY, JSON.stringify(retained));
    } catch { /* Keep bounded encrypted evidence for a later foreground pass. */ }
  });
  await failureQueueWork.catch(() => {});
}

/**
 * One-time setup: Android requires an explicit notification channel for
 * pushes to display correctly (OneSignal configured this invisibly).
 * Safe/no-op in Expo Go and on iOS.
 */
function ensureAndroidNotificationChannel(): Promise<void> {
  if (!Notifications || Platform.OS !== 'android') return Promise.resolve();
  if (!notificationChannelReady) {
    notificationChannelReady = Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    }).then(() => undefined).catch((error) => {
      notificationChannelReady = null;
      throw error;
    });
  }
  return notificationChannelReady;
}

export function initPushNotifications() {
  void ensureAndroidNotificationChannel().catch((error) => logPushWarning('Notification channel setup failed:', error));
}

const DEFAULT_EAS_PROJECT_ID = 'aceb15a9-aa70-4db9-b785-961309a12e3f';

function getExpoProjectId(): string {
  const fromExtra = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  const fromEasConfig = (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  return fromExtra ?? fromEasConfig ?? fromEnv ?? DEFAULT_EAS_PROJECT_ID;
}

function hasNotificationPermission(permission: NotificationPermissionsStatus) {
  return normalizeNotificationPermissionState(permission) === 'granted';
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (!Notifications) return 'unavailable';
  try {
    return normalizeNotificationPermissionState(await Notifications.getPermissionsAsync());
  } catch {
    return 'unavailable';
  }
}

export async function openNotificationSettings(): Promise<void> {
  systemSettingsOpened = true;
  await Linking.openSettings();
}

/**
 * OS-level permission prompt only — no token fetch/registration. Used by
 * the two call sites that want to trigger the prompt at a specific moment
 * in the UI (onboarding's "notifications" step, settings' notification
 * toggle) without needing a signed-in user id in hand at that exact point.
 * Actual token registration still happens separately via registerPushToken,
 * which app/_layout.tsx calls on authenticated sessions. Registration never
 * opens the OS prompt itself, so a user's explicit "Not now" remains intact.
 * Safe no-op if permission is already granted; iOS/Android both silently
 * no-op a re-prompt after a previous denial rather than re-showing the OS
 * dialog, so this never nags.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    // Android 13 does not show its POST_NOTIFICATIONS prompt until at least
    // one channel exists. Await it here rather than relying on the root
    // startup effect, which can race a contextual permission request.
    await ensureAndroidNotificationChannel();
    const existing = await Notifications.getPermissionsAsync();
    if (hasNotificationPermission(existing)) return true;
    const requested = await Notifications.requestPermissionsAsync();
    if (hasNotificationPermission(requested)) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Reads the current OS notification permission status without showing any prompt.
 */
export async function checkNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (hasNotificationPermission(existing)) return true;
    return false;
  } catch {
    return false;
  }
}

/** Bound SDK acquisition: offline native/provider work must not freeze recovery forever. */
async function withDeadline<T>(operation: Promise<T>, durationMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Push token acquisition timed out')), durationMs); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}

function validBindingVersion(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function deleteWithCredential(binding: Pick<PushBinding, 'token' | 'bindingVersion'>, accessToken: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  const startedAt = Date.now();
  let response: Response | null = null;
  const recordOutcome = (terminalError?: 'network_failure' | 'timeout' | 'client_failure') => {
    try {
      const durationMs = Math.max(0, Date.now() - startedAt);
      const outcome = classifyApiDiagnostic({
        statuses: response ? [response.status] : [],
        finalStatus: response?.status ?? null,
        durationMs,
        terminalError,
      });
      if (!outcome) return;
      const requestId = response?.headers.get('x-request-id') ?? null;
      const serverRequestId = requestId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)
        ? requestId
        : null;
      recordApiRequestDiagnostic({
        clientEventId: Crypto.randomUUID(),
        endpoint: normalizeApiEndpoint('/api/notifications/register-token'),
        method: 'DELETE',
        outcome,
        firstStatus: response?.status ?? null,
        finalStatus: response?.status ?? null,
        attemptCount: 1,
        durationMs: Math.min(durationMs, 180_000),
        serverRequestId,
        retryServerRequestId: null,
        timestamp: Date.now(),
      });
    } catch {
      // Cleanup outcome recording must never change the sign-out path.
    }
  };
  try {
    response = await fetch(`${API_BASE}/api/notifications/register-token`, {
      method: 'DELETE', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ token: binding.token, bindingVersion: binding.bindingVersion }),
    });
    recordOutcome();
    if (!response.ok) throw new Error(`Push cleanup rejected: ${response.status}`);
  } catch (error) {
    if (!response) {
      if (controller.signal.aborted) recordOutcome('timeout');
      else if (error instanceof TypeError) recordOutcome('network_failure');
      else recordOutcome('client_failure');
    }
    throw error;
  } finally { clearTimeout(timer); }
}

const pushRegistration = new PushRegistrationCoordinator({
  captureIdentity: captureAppIdentity,
  now: () => Date.now(),
  projectId: getExpoProjectId,
  permission: async () => {
    if (!Notifications) return 'unavailable';
    return withDeadline((async () => {
      await ensureAndroidNotificationChannel();
      return normalizeNotificationPermissionState(await Notifications.getPermissionsAsync());
    })(), 10_000);
  },
  token: async (projectId, devicePushToken) => {
    if (!Notifications) throw new Error('Native push module unavailable');
    const result = await withDeadline(Notifications.getExpoPushTokenAsync({
      projectId, ...(devicePushToken ? { devicePushToken } : {}),
    }), 10_000);
    return result.data;
  },
  post: async (token, userId, reason) => {
    const lease = captureAppIdentity();
    const { data: { session }, error } = await withDeadline(supabase.auth.getSession(), 8_000);
    if (error) throw error;
    if (!lease.isCurrent() || session?.user.id !== userId) throw Object.assign(new Error('Push registration owner changed'), { retryable: false });
    const accessToken = session.access_token;
    const response = await apiFetch('/api/notifications/register-token', {
      method: 'POST', expectedUserId: userId, timeoutMs: 8_000,
      body: JSON.stringify({ token, platform: Platform.OS, registrationReason: reason }),
    });
    if (response.status === 409) {
      const refusal: unknown = await response.json().catch(() => null);
      if (refusal && typeof refusal === 'object' && 'code' in refusal && refusal.code === 'ACCOUNT_DELETION_PENDING') {
        throw Object.assign(new Error('Push registration refused: account deletion pending'), { retryable: false, deletionPending: true });
      }
    }
    if (!response.ok) throw Object.assign(new Error(`Push registration rejected: ${response.status}`), {
      retryable: response.status >= 500 || response.status === 408 || response.status === 429,
    });
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('registered' in body) || body.registered !== true) {
      throw new Error('Invalid push registration acknowledgement');
    }
    const version = ('bindingVersion' in body ? body.bindingVersion : null) ?? null;
    if (version != null && !validBindingVersion(version)) throw new Error('Invalid push binding version');
    // Older backend acknowledgements remain compatible; their cleanup is not
    // version-safe. Do not use an unversioned stale response to remove a binding.
    if (lease.isCurrent()) cleanupCredential = { userId, accessToken };
    return {
      bindingVersion: version,
      ...(version ? { discard: () => deleteWithCredential({ token, bindingVersion: version }, accessToken) } : {}),
    };
  },
  failure: reportPushRegistrationFailure,
});

export const subscribePushRegistrationStatus = pushRegistration.subscribe;
export const getPushRegistrationStatus = pushRegistration.getSnapshot;

function clearPushRetry() {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
}

/** Success acknowledgements expire; token equality alone never suppresses recovery. */
export async function registerPushToken(userId: string, options: PushRegistrationOptions = {}) {
  const lease = captureAppIdentity();
  if (lease.identity.kind !== 'authenticated' || lease.identity.userId !== userId) return { status: 'superseded' as const };
  if (retryRevision !== lease.revision || options.reason === 'settings' || options.reason === 'foreground' || options.reason === 'rotation') {
    clearPushRetry(); retryRevision = lease.revision; retryCount = 0;
  }
  const result = await pushRegistration.register(userId, options);
  if (!lease.isCurrent()) return result;
  const acknowledged = pushRegistration.getBinding();
  if (result.status === 'registered' && acknowledged?.userId === userId) {
    persistCleanupBinding(acknowledged, lease.isCurrent);
    void flushPushFailures(userId);
  }
  if (result.status !== 'failed' || !result.retryable) { clearPushRetry(); retryCount = 0; }
  else if (foreground && !retryTimer && retryCount < PUSH_RECOVERY_DELAYS_MS.length) {
    const delay = PUSH_RECOVERY_DELAYS_MS[retryCount++] * (0.9 + Math.random() * 0.2);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (foreground && lease.isCurrent()) void registerPushToken(userId, { force: true, reason: 'retry' });
    }, delay);
  }
  return result;
}

/** Root-owned lifecycle; no additional auth listener and no permission prompts. */
export function startPushRegistrationRecovery(): () => void {
  let returnedFromBackground = AppState.currentState === 'background';
  foreground = AppState.currentState === 'active';
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let lastNativeToken: string | null = null;
  const reconcile = (options: PushRegistrationOptions) => {
    const identity = getAppIdentity();
    if (identity.kind === 'authenticated') void registerPushToken(identity.userId, options);
  };
  const startHeartbeat = () => {
    if (heartbeat) clearInterval(heartbeat);
    if (foreground) heartbeat = setInterval(() => reconcile({ reason: 'heartbeat' }), PUSH_REGISTRATION_HEARTBEAT_MS);
  };
  startHeartbeat();
  const appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'background') returnedFromBackground = true;
    foreground = state === 'active';
    if (!foreground) {
      clearPushRetry();
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = null;
      return;
    }
    startHeartbeat();
    if (systemSettingsOpened) {
      systemSettingsOpened = false;
      reconcile({ force: true, reason: 'permission' });
    } else if (returnedFromBackground) reconcile({ reason: 'foreground' });
    returnedFromBackground = false;
  });
  const tokenSubscription = Notifications?.addPushTokenListener((nativeToken) => {
    if ((nativeToken.type !== 'ios' && nativeToken.type !== 'android') || typeof nativeToken.data !== 'string') return;
    const changed = lastNativeToken != null && lastNativeToken !== nativeToken.data;
    lastNativeToken = nativeToken.data;
    // The first SDK event during acquisition establishes the baseline. A real
    // later rotation passes its native token through, avoiding recursive acquisition.
    if (changed) {
      reconcile({ force: true, reason: 'rotation', devicePushToken: nativeToken as NativePushToken });
    }
  });
  return () => {
    appStateSubscription.remove(); tokenSubscription?.remove();
    if (heartbeat) clearInterval(heartbeat);
    clearPushRetry();
  };
}

/** Explicit logout uses current credentials; emergency session loss is best-effort. */
export async function unregisterPushToken(options: { beforeSignOut?: boolean } = {}) {
  clearPushRetry();
  const identity = getAppIdentity();
  const owner = identity.kind === 'authenticated' ? identity.userId : pushRegistration.getBinding()?.userId;
  const stored = await readCleanupBinding(owner);
  try {
    await pushRegistration.unregister(async (binding) => {
      if (options.beforeSignOut) {
        const response = await apiFetch('/api/notifications/register-token', {
          method: 'DELETE', expectedUserId: binding.userId, timeoutMs: 5_000,
          body: JSON.stringify({ token: binding.token, bindingVersion: binding.bindingVersion }),
        });
        if (!response.ok) throw new Error(`Push cleanup rejected: ${response.status}`);
      } else if (cleanupCredential?.userId === binding.userId) {
        await deleteWithCredential(binding, cleanupCredential.accessToken);
      } else {
        throw new Error('No current credential for emergency push cleanup');
      }
      await clearCleanupBinding(binding.userId);
    }, owner, stored);
  } catch (error) {
    logPushWarning('Push cleanup failed:', error);
    if (owner) reportPushRegistrationFailure(owner, 'remove_registration', error);
  }
  finally { if (cleanupCredential?.userId === owner) cleanupCredential = null; }
}

export async function signOutWithPushCleanup() {
  await unregisterPushToken({ beforeSignOut: true });
  try {
    const result = await supabase.auth.signOut();
    if (result.error) throw result.error;
    return result;
  } catch (error) {
    pushRegistration.resume();
    const identity = getAppIdentity();
    if (identity.kind === 'authenticated') void registerPushToken(identity.userId, { force: true, reason: 'auth' });
    throw error;
  }
}

function routeForNotificationTap(data: NotificationAdditionalData): Href {
  // Prefer the real destination the backend intended (the `url` field
  // src/lib/push-server.ts embeds directly into the push `data` payload)
  // over the coarser `type` bucket.
  const fromUrl = pathFromUrlLike(data.url);
  if (fromUrl) return resolveNativeRoute(fromUrl, '/notifications');

  switch (data.type) {
    case 'tithi': return '/panchang';
    case 'festival': return '/vrat';
    case 'nitya':
    case 'brahma_muhurta': return '/nitya-karma';
    case 'japa': return '/japa';
    case 'streak': return '/(tabs)';
    case 'mood':
    case 'mood_checkin': return '/mood';
    case 'mandali_mention':
    case 'connection_request':
    case 'connection_accepted':
    case 'connection_rejected':
    case 'connection_cancelled':
    case 'user_blocked':
    case 'content_reported':
    case 'post_reaction': return '/mandali';
    // general/test/milestone/sanskar_milestone/guided-plan/broadcast and
    // anything unrecognized: land in the inbox itself rather than
    // guessing — the notification that was tapped is right there, in
    // context.
    default: return '/notifications';
  }
}

export function handleNotificationTap(router: Router): () => void {
  if (!Notifications) return () => {};

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = (response.notification.request.content.data ?? {}) as NotificationAdditionalData;
    router.push(routeForNotificationTap(data));
  });

  return () => subscription.remove();
}
