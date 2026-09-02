/**
 * Notification inbox's own identity-scoped disk cache -- same low-level
 * envelope shape as lib/homeCache.ts, lib/mandaliCache.ts and
 * lib/settingsCache.ts (schema version, identity-scoped key, read/
 * validate/remove, logout purge), each with its own feature-local policy
 * rather than a shared generic factory. This feature's policy: the cache
 * is the single source both the Bell badge (Home) and the inbox screen
 * read from, so a mark-read/mark-all-read/clear performed in one place is
 * immediately visible in the other without an extra network round trip --
 * that's the "badge reuse" and "cache reconciliation" this cache exists
 * for, not just an offline-render nicety.
 *
 * Guest has no notification inbox at all (see app/notifications.tsx) --
 * there is no guest variant of this cache.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationRow } from './notificationsData';

export const NOTIFICATIONS_CACHE_SCHEMA_VERSION = 1;

export type NotificationsCacheEnvelope = {
  schemaVersion: number;
  userId: string;
  savedAt: number;
  notifications: NotificationRow[];
};

function getNotificationsCacheKey(userId: string): string {
  return `shoonaya_notifications_cache_v1_user_${userId}`;
}

function isValidEnvelope(value: unknown): value is NotificationsCacheEnvelope {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.userId === 'string' && Array.isArray(v.notifications);
}

export async function readNotificationsCache(userId: string): Promise<NotificationsCacheEnvelope | null> {
  const key = getNotificationsCacheKey(userId);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    let envelope: unknown;
    try {
      envelope = JSON.parse(raw);
    } catch {
      await AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }

    if (!isValidEnvelope(envelope) || envelope.schemaVersion !== NOTIFICATIONS_CACHE_SCHEMA_VERSION) {
      await AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }
    if (envelope.userId !== userId) {
      await AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }

    return envelope;
  } catch (error) {
    console.warn('[NotificationsCache] read failed', error);
    return null;
  }
}

export async function writeNotificationsCache(userId: string, notifications: NotificationRow[]): Promise<void> {
  const key = getNotificationsCacheKey(userId);
  const envelope: NotificationsCacheEnvelope = {
    schemaVersion: NOTIFICATIONS_CACHE_SCHEMA_VERSION,
    userId,
    savedAt: Date.now(),
    notifications,
  };
  try {
    await AsyncStorage.setItem(key, JSON.stringify(envelope));
  } catch (error) {
    console.warn('[NotificationsCache] write failed', error);
  }
}

/**
 * Applies a reconciling patch (mark-read / mark-all-read / clear) to
 * whatever is currently cached and persists the result -- called from
 * wherever the mutation happens (today, only the inbox screen) so the
 * next reader (Home's badge, or the inbox screen itself after a
 * remount) sees the reconciled state without waiting on a network round
 * trip to notice.
 */
export async function patchNotificationsCache(
  userId: string,
  updater: (current: NotificationRow[]) => NotificationRow[]
): Promise<void> {
  const cached = await readNotificationsCache(userId);
  const next = updater(cached?.notifications ?? []);
  await writeNotificationsCache(userId, next);
}

export async function clearNotificationsCache(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(getNotificationsCacheKey(userId));
  } catch (error) {
    console.warn('[NotificationsCache] clear failed', error);
  }
}

export async function clearAllNotificationsCaches(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const notifKeys = keys.filter((k) => k.startsWith('shoonaya_notifications_cache_v1_user_'));
    if (notifKeys.length > 0) {
      await AsyncStorage.multiRemove(notifKeys);
    }
  } catch (error) {
    console.warn('[NotificationsCache] clearAll failed', error);
  }
}

export function deriveUnreadCount(notifications: NotificationRow[]): number {
  return notifications.filter((row) => !row.read).length;
}
