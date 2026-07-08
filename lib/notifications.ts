import { Platform } from 'react-native';
// OneSignal requires native binary — not available in Expo Go
let OneSignal: typeof import('react-native-onesignal').OneSignal | null = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    OneSignal = require('react-native-onesignal').OneSignal;
  } catch {
    // Running in Expo Go — native module not available
  }
}
import type { Href, useRouter } from 'expo-router';

import { pathFromUrlLike, resolveNativeRoute } from '@/lib/routes';

type Router = ReturnType<typeof useRouter>;

const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? '';

// Real `data.type` values the web repo's push senders actually use —
// confirmed by a full-repo grep of src/lib/onesignal-server.ts call sites
// (crons + /api/notifications/{test,milestone}). The previous union here
// (`daily_shloka` / `streak_reminder` / `mandali_mention`) never matched
// anything the backend sends: `daily_shloka`/`streak_reminder` were
// speculative names (the real shloka-reminder cron sends `type: 'streak'`),
// and `mandali_mention` doesn't exist server-side at all — there is no
// cron or trigger that sends a mandali/community notification yet (web's
// own `wants_community_notifications` profile toggle is saved but checked
// by zero crons today). Kept as an extra, harmless switch case below in
// case that ever ships, but not treated as already real.
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
  | 'mandali_mention';

type NotificationAdditionalData = {
  type?: NotificationType;
  [key: string]: unknown;
};

/**
 * Initialize OneSignal. Call once after fonts and auth are ready.
 * Safe to call on web — OneSignal SDK is a no-op without a native layer.
 */
export function initOneSignal() {
  if (!ONESIGNAL_APP_ID || !OneSignal) return;
  try {
    OneSignal.initialize(ONESIGNAL_APP_ID);
  } catch (error) {
    console.error('OneSignal initialization failed:', error);
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!ONESIGNAL_APP_ID || !OneSignal) return false;
  try {
    return await OneSignal.Notifications.requestPermission(true);
  } catch {
    return false;
  }
}

export function registerUserId(userId: string) {
  if (!ONESIGNAL_APP_ID || !OneSignal || !userId) return;
  OneSignal.login(userId);
}

export function unregisterUser() {
  if (!ONESIGNAL_APP_ID || !OneSignal) return;
  OneSignal.logout();
}

// Type-only shape of react-native-onesignal's NotificationClickEvent —
// declared locally rather than imported so this file still type-checks
// when OneSignal is unavailable (Expo Go / web, see the top-of-file guard).
type ClickEvent = {
  result?: { url?: string };
  notification?: { launchURL?: string; additionalData?: unknown };
};

function routeForNotificationTap(event: ClickEvent): Href {
  // Prefer the real destination the backend intended — OneSignal's own
  // click result URL, then the notification's own launchURL — over the
  // coarse `type` bucket. Both ultimately come from the same `action_url`
  // (or a milestone/test route's actionUrl) the web repo wrote onto the
  // notifications row / push payload's top-level `url` (confirmed: the
  // push `data` object never carries `action_url` itself — only `url` at
  // the top level does — see src/lib/onesignal-server.ts sendOneSignalPush
  // call sites in the web repo).
  const fromUrl = pathFromUrlLike(event.result?.url ?? event.notification?.launchURL);
  if (fromUrl) return resolveNativeRoute(fromUrl, '/notifications');

  const data = (event?.notification?.additionalData ?? {}) as NotificationAdditionalData;
  switch (data.type) {
    case 'tithi': return '/panchang';
    case 'festival': return '/vrat';
    case 'nitya':
    case 'brahma_muhurta': return '/nitya-karma';
    case 'japa': return '/(tabs)/bhakti';
    case 'streak': return '/(tabs)';
    case 'mandali_mention': return '/mandali';
    // general/test/milestone/sanskar_milestone/guided-plan and anything
    // unrecognized: land in the inbox itself rather than guessing — the
    // notification that was tapped is right there, in context.
    default: return '/notifications';
  }
}

export function handleNotificationTap(router: Router): () => void {
  if (!ONESIGNAL_APP_ID || !OneSignal) return () => {};

  const listener = (event: ClickEvent) => {
    router.push(routeForNotificationTap(event));
  };

  OneSignal.Notifications.addEventListener('click', listener);
  return () => { OneSignal?.Notifications.removeEventListener('click', listener); };
}
