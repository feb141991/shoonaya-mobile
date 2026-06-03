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
  if (!ONESIGNAL_APP_ID || !OneSignal) return;
  OneSignal.initialize(ONESIGNAL_APP_ID);
  OneSignal.Notifications.requestPermission(false);
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

export function handleNotificationTap(router: Router): () => void {
  if (!ONESIGNAL_APP_ID || !OneSignal) return () => {};

  const listener = (event: { notification?: { additionalData?: unknown } }) => {
    const data = (event?.notification?.additionalData ?? {}) as NotificationAdditionalData;
    const type = data.type;
    switch (type) {
      case 'daily_shloka': router.push('/(tabs)/pathshala'); break;
      case 'streak_reminder': router.push('/(tabs)'); break;
      case 'mandali_mention': router.push('/mandali'); break;
      default: router.push('/(tabs)');
    }
  };

  OneSignal.Notifications.addEventListener('click', listener);
  return () => { OneSignal!.Notifications.removeEventListener('click', listener); };
}
