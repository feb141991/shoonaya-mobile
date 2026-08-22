import { Platform } from 'react-native';

type FirebaseAnalyticsModule = typeof import('@react-native-firebase/analytics');

type AnalyticsEventName =
  | 'app_opened'
  | 'login_started'
  | 'onboarding_completed'
  | 'practice_started'
  | 'practice_completed'
  | 'share_started'
  | 'progressive_profiling';

type AnalyticsEventParams = {
  surface?: string;
  action?: string;
  route?: string;
  prompt_key?: string;
};

let firebaseAnalytics: FirebaseAnalyticsModule | null | undefined;
let lastScreenName: string | null = null;

function getFirebaseAnalytics() {
  if (Platform.OS !== 'android') return null;
  if (firebaseAnalytics !== undefined) return firebaseAnalytics;

  try {
    firebaseAnalytics = require('@react-native-firebase/analytics') as FirebaseAnalyticsModule;
  } catch {
    firebaseAnalytics = null;
  }

  return firebaseAnalytics;
}

function sanitizeScreenName(screenName: string) {
  const normalized = screenName
    .replace(/\([^)]+\)/g, '')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');

  const safe = normalized
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (/^\[.+\]$/.test(segment)) return segment;
      if (/^[0-9a-f]{8,}(-[0-9a-f]{4,}){2,}$/i.test(segment)) return ':id';
      if (/^[0-9]+$/.test(segment)) return ':number';
      if (segment.includes('@')) return ':value';
      if (segment.length > 48) return ':value';
      return segment.replace(/[^a-zA-Z0-9_-]/g, '_');
    })
    .join('/');

  return safe || 'home';
}

function sanitizeParams(params: AnalyticsEventParams = {}) {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    sanitized[key] = sanitizeScreenName(value).slice(0, 80);
  }

  return sanitized;
}

export async function setNativeAnalyticsEnabled(enabled: boolean) {
  const analytics = getFirebaseAnalytics();
  if (!analytics) return;

  await analytics.setAnalyticsCollectionEnabled(analytics.getAnalytics(), enabled);
}

export async function trackScreenView(screenName: string) {
  const analytics = getFirebaseAnalytics();
  if (!analytics) return;

  const safeScreenName = sanitizeScreenName(screenName);
  if (safeScreenName === lastScreenName) return;
  lastScreenName = safeScreenName;

  await analytics.logEvent(analytics.getAnalytics(), 'screen_view', {
    screen_name: safeScreenName,
    screen_class: safeScreenName,
  });
}

export async function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  params?: AnalyticsEventParams
) {
  const analytics = getFirebaseAnalytics();
  if (!analytics) return;

  await analytics.logEvent(analytics.getAnalytics(), eventName, sanitizeParams(params));
}
