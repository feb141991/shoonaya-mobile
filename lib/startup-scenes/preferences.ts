import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppLanguage, StartupPreferences, TraditionKey } from './types';

/**
 * Storage keys for startup preferences.
 * - DEVICE_PREFS_KEY: Explicit device-level tradition/language, cleared on logout.
 * - USER_CACHE_PREFIX: Canonical home cache key prefix strictly scoped by user ID.
 */
export const STARTUP_DEVICE_PREFS_KEY = 'shoonaya_device_startup_prefs_v1';
export const HOME_CACHE_USER_PREFIX = 'shoonaya_home_cache_v1_user_';

let activePreferenceUserId: string | null = null;
let preferenceWriteGeneration = 0;

export function setStartupPreferenceIdentity(userId: string | null): number {
  const normalizedUserId = userId?.trim() || null;
  if (normalizedUserId !== activePreferenceUserId) {
    activePreferenceUserId = normalizedUserId;
    preferenceWriteGeneration += 1;
  }
  return preferenceWriteGeneration;
}

export function isStartupPreferenceIdentityCurrent(
  userId: string | null,
  generation: number
): boolean {
  return (
    activePreferenceUserId === (userId?.trim() || null) &&
    preferenceWriteGeneration === generation
  );
}

/**
 * Startup-scoped device timezone detection helper.
 * Resolves the device's local timezone, falling back to UTC if Intl is unavailable.
 * Isolated from the shared spiritualDate panchang engine.
 */
export function getStartupDeviceTimezone(timezone?: string | null): string {
  if (timezone && typeof timezone === 'string' && timezone.trim().length > 0) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return timezone;
    } catch {
      // invalid timezone string, fall through to device detection
    }
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Returns a fallback startup preference based on the device timezone and system language.
 * Never defaults silently to Asia/Kolkata for international devices.
 */
export function getDefaultStartupPreferences(): StartupPreferences {
  return {
    tradition: 'neutral',
    language: 'en',
    timezone: getStartupDeviceTimezone(),
  };
}

/**
 * Identity-safe resolver for startup preferences.
 *
 * Invariant:
 * 1. If a verified userId is supplied, read strictly from that user's private cache key.
 * 2. If no userId is supplied (guest or pre-auth), read the device-level preference key.
 * 3. NEVER search arbitrary user cache keys to prevent cross-account tradition leakage.
 * 4. Fallback safely to neutral on missing or corrupt payload.
 */
export async function getStartupPreferences(
  userId?: string | null
): Promise<StartupPreferences> {
  const defaults = getDefaultStartupPreferences();

  try {
    // 1. If authenticated user ID is known, read strictly from their isolated cache
    if (userId && typeof userId === 'string' && userId.trim().length > 0) {
      const userCacheKey = `${HOME_CACHE_USER_PREFIX}${userId.trim()}`;
      const rawUserCache = await AsyncStorage.getItem(userCacheKey);
      if (rawUserCache) {
        const parsed = JSON.parse(rawUserCache);
        if (parsed && typeof parsed === 'object') {
          const tradition = (parsed.profile?.tradition || 'neutral') as TraditionKey | 'neutral';
          const language = (parsed.profile?.appLanguage || defaults.language) as AppLanguage;
          const timezone = getStartupDeviceTimezone(parsed.date?.timezone || defaults.timezone);
          return { tradition, language, timezone };
        }
      }
    }

    // Authenticated lookups must never fall through to another account's
    // device preference. The neutral fallback is safer until this user's
    // own Home cache has been written.
    if (userId) {
      return defaults;
    }

    // 2. Read explicit device-scoped startup preferences (guest / pre-auth only)
    const rawDevicePrefs = await AsyncStorage.getItem(STARTUP_DEVICE_PREFS_KEY);
    if (rawDevicePrefs) {
      const parsed = JSON.parse(rawDevicePrefs);
      if (parsed && typeof parsed === 'object') {
        const tradition = (parsed.tradition || 'neutral') as TraditionKey | 'neutral';
        const language = (parsed.language || defaults.language) as AppLanguage;
        const timezone = getStartupDeviceTimezone(parsed.timezone || defaults.timezone);
        return { tradition, language, timezone };
      }
    }
  } catch {
    // Fail-closed safely to default neutral
  }

  return defaults;
}

/**
 * Persists device-level startup preferences.
 */
export async function saveDeviceStartupPreferences(
  prefs: Partial<StartupPreferences>,
  expectedGeneration?: number,
  expectedUserId?: string | null
): Promise<void> {
  try {
    const current = await getStartupPreferences(null);
    const updated: StartupPreferences = {
      tradition: prefs.tradition || current.tradition,
      language: prefs.language || current.language,
      timezone: getStartupDeviceTimezone(prefs.timezone || current.timezone),
    };
    if (
      expectedGeneration !== undefined &&
      (expectedGeneration !== preferenceWriteGeneration ||
        (expectedUserId ?? null) !== activePreferenceUserId)
    ) {
      return;
    }
    await AsyncStorage.setItem(STARTUP_DEVICE_PREFS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage write failure on startup
  }
}

/**
 * Convenience helper to sync startup preferences whenever user profile or settings change.
 */
export async function syncStartupPreferencesFromProfile(
  profile?: { tradition?: string | null; appLanguage?: string | null } | null,
  timezone?: string | null,
  userId?: string | null
): Promise<void> {
  const normalizedUserId = userId?.trim() || null;
  if (!profile || !normalizedUserId || activePreferenceUserId !== normalizedUserId) return;
  const writeGeneration = preferenceWriteGeneration;
  const validTraditions: TraditionKey[] = ['hindu', 'sikh', 'buddhist', 'jain'];
  const rawTradition = profile.tradition?.toLowerCase().trim();
  const tradition: TraditionKey | 'neutral' = validTraditions.includes(rawTradition as TraditionKey)
    ? (rawTradition as TraditionKey)
    : 'neutral';
  const rawLang = profile.appLanguage?.toLowerCase().trim();
  const language: AppLanguage = rawLang === 'hi' || rawLang === 'pa' ? rawLang : 'en';

  if (
    writeGeneration !== preferenceWriteGeneration ||
    activePreferenceUserId !== normalizedUserId
  ) {
    return;
  }

  await saveDeviceStartupPreferences({
    tradition,
    language,
    timezone: getStartupDeviceTimezone(timezone),
  }, writeGeneration, normalizedUserId);
}

/**
 * Clears device-level startup preferences.
 * Must be called during auth signout or account switch to guarantee zero cross-account leakage.
 */
export async function clearDeviceStartupPreferences(): Promise<void> {
  activePreferenceUserId = null;
  preferenceWriteGeneration += 1;
  try {
    await AsyncStorage.removeItem(STARTUP_DEVICE_PREFS_KEY);
  } catch {
    // Ignore storage failure
  }
}
