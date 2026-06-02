import { OneSignal } from 'react-native-onesignal';
import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? '';

type NotificationType = 'daily_shloka' | 'streak_reminder' | 'mandali_mention';

type NotificationAdditionalData = {
  type?: NotificationType;
  [key: string]: unknown;
};

/**
 * Initialize OneSignal. Call once after fonts and auth are ready.
 * Safe to call on web — OneSignal SDK is a no-op without a native layer.
 */
export function initOneSignal() {
  if (!ONESIGNAL_APP_ID) {
    console.warn('[OneSignal] EXPO_PUBLIC_ONESIGNAL_APP_ID is not set. Push notifications disabled.');
    return;
  }
  OneSignal.initialize(ONESIGNAL_APP_ID);
  // Opt into live-activity / foreground notifications on iOS
  OneSignal.Notifications.requestPermission(false);
}

/**
 * Request push notification permission.
 * Should only be called after the user opts in (e.g. end of onboarding).
 * Returns true if granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!ONESIGNAL_APP_ID) return false;
  try {
    const granted = await OneSignal.Notifications.requestPermission(true);
    return granted;
  } catch {
    return false;
  }
}

/**
 * Associate this device with a user ID so OneSignal can target them.
 * Call after Supabase sign-in resolves with a user.id.
 */
export function registerUserId(userId: string) {
  if (!ONESIGNAL_APP_ID || !userId) return;
  OneSignal.login(userId);
}

/**
 * Remove user association (on sign-out).
 */
export function unregisterUser() {
  if (!ONESIGNAL_APP_ID) return;
  OneSignal.logout();
}

/**
 * Register a handler that fires when the user taps a push notification.
 * Performs deep-link routing based on `additionalData.type`.
 *
 * Returns a cleanup function — call it in a useEffect return.
 */
export function handleNotificationTap(router: Router): () => void {
  if (!ONESIGNAL_APP_ID) return () => {};

  const listener = (event: { notification?: { additionalData?: unknown } }) => {
    const data = (event?.notification?.additionalData ?? {}) as NotificationAdditionalData;
    const type = data.type;

    switch (type) {
      case 'daily_shloka':
        router.push('/(tabs)/pathshala');
        break;
      case 'streak_reminder':
        router.push('/(tabs)');
        break;
      case 'mandali_mention':
        router.push('/mandali');
        break;
      default:
        // Unknown type — navigate to home
        router.push('/(tabs)');
    }
  };

  OneSignal.Notifications.addEventListener('click', listener);

  return () => {
    OneSignal.Notifications.removeEventListener('click', listener);
  };
}
