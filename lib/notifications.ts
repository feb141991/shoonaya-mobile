import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { NotificationPermissionsStatus } from 'expo-notifications';
import type { Href, useRouter } from 'expo-router';

import { apiFetch } from '@/lib/api';
import { API_BASE } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { pathFromUrlLike, resolveNativeRoute } from '@/lib/routes';

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
const skipsRemotePushRegistration = __DEV__ && Platform.OS === 'ios';
type NotificationsModule = typeof import('expo-notifications');
const Notifications: NotificationsModule | null = isExpoGo || skipsRemotePushRegistration
  ? null
  : require('expo-notifications');

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
  | 'post_reaction';

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

// Cached in-memory so a sign-out (which nulls the Supabase session before
// this module gets a chance to react) can still authenticate one last
// DELETE call using the access token captured at registration time, rather
// than needing a currently-valid session. JWT signature/expiry checks don't
// care that the client has locally signed out — this call happens
// milliseconds after sign-out, well inside the token's validity window.
let cachedToken: string | null = null;
let cachedAccessToken: string | null = null;

function logPushWarning(label: string, error: unknown) {
  if (__DEV__) {
    console.warn(label, error);
  }
}

/**
 * One-time setup: Android requires an explicit notification channel for
 * pushes to display correctly (OneSignal configured this invisibly).
 * Safe/no-op in Expo Go and on iOS.
 */
export function initPushNotifications() {
  if (!Notifications) return;
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    }).catch(() => {});
  }
}

function getExpoProjectId(): string | null {
  const fromExtra = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  const fromEasConfig = (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  return fromExtra ?? fromEasConfig ?? null;
}

function hasNotificationPermission(permission: NotificationPermissionsStatus) {
  const normalized = permission as { granted?: boolean; status?: string };
  return normalized.granted === true || normalized.status === 'granted';
}

/**
 * OS-level permission prompt only — no token fetch/registration. Used by
 * the two call sites that want to trigger the prompt at a specific moment
 * in the UI (onboarding's "notifications" step, settings' notification
 * toggle) without needing a signed-in user id in hand at that exact point.
 * Actual token registration still happens separately via registerPushToken,
 * which app/_layout.tsx already calls on every authenticated session — so
 * granting permission here doesn't leave the device unregistered.
 * Safe no-op if permission is already granted; iOS/Android both silently
 * no-op a re-prompt after a previous denial rather than re-showing the OS
 * dialog, so this never nags.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (hasNotificationPermission(existing)) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return hasNotificationPermission(requested);
  } catch {
    return false;
  }
}

/**
 * Request permission (if not already granted), fetch this device's Expo
 * push token, and register it against the signed-in user. Cheap/idempotent
 * to call repeatedly — skips the network round-trip entirely if the token
 * hasn't changed since the last successful registration this session, so
 * calling it on every auth-state change (the same pattern OneSignal's
 * registerUserId used) doesn't spam the backend.
 */
export async function registerPushToken(userId: string) {
  if (!Notifications || !userId) return;

  try {
    const existing = await Notifications.getPermissionsAsync();
    const finalPermission = hasNotificationPermission(existing) ? existing : await Notifications.requestPermissionsAsync();
    if (!hasNotificationPermission(finalPermission)) return;

    const projectId = getExpoProjectId();
    if (!projectId) {
      console.warn('registerPushToken: missing EAS projectId — cannot fetch Expo push token');
      return;
    }

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!expoPushToken || expoPushToken === cachedToken) return;

    const response = await apiFetch('/api/notifications/register-token', {
      method: 'POST',
      body: JSON.stringify({ token: expoPushToken, platform: Platform.OS }),
    });

    if (response.ok) {
      cachedToken = expoPushToken;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      cachedAccessToken = session?.access_token ?? null;
    } else {
      console.warn('registerPushToken: server rejected token registration', response.status);
    }
  } catch (error) {
    // Token registration is best-effort. iOS simulator/dev builds can throw
    // ERR_NOTIFICATIONS_KEYCHAIN_ACCESS while reading Expo's persisted server
    // registration; surfacing that as console.error blocks the app behind
    // LogBox even though auth and normal navigation can continue.
    logPushWarning('registerPushToken skipped:', error);
  }
}

/**
 * Unbind this device's token on sign-out. Scoped to this one device's
 * token, not "delete every token this user ever registered" — signing out
 * on one device shouldn't kill push on their other devices. Best-effort:
 * if this fails (offline, request lost), nothing is permanently broken —
 * the token row just gets correctly reassigned the next time *any* user
 * registers on this device, since upsert_push_token is keyed on the token
 * itself, not the user.
 */
export async function unregisterPushToken() {
  const token = cachedToken;
  const accessToken = cachedAccessToken;
  cachedToken = null;
  cachedAccessToken = null;

  if (!token || !accessToken) return;

  try {
    await fetch(`${API_BASE}/api/notifications/register-token`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token }),
    });
  } catch {
    // best-effort, see doc comment above
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
