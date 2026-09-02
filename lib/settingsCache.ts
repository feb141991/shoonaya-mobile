/**
 * Settings' own identity-scoped cache + durable outbox.
 *
 * Deliberately NOT a shared generic cache factory -- Settings' merge policy
 * (server wins except unacknowledged pending writes) is specific to this
 * feature and would be hidden, not simplified, by forcing it through a
 * one-size-fits-all abstraction. lib/homeCache.ts and lib/mandaliCache.ts
 * each have their own equally specific policy (spiritual-date masking;
 * feed/page shape) for the same reason. If a third feature needs the same
 * low-level envelope shape (schema version, identity-scoped key, read/
 * validate/remove, logout purge), extract *that* piece then -- not before.
 *
 * Settings writes are desired-state, not append-only: retrying a toggle
 * flip just resends the same desired value, which is naturally idempotent
 * server-side (setting a field to X twice has the same effect as once).
 * There is no client-operation-id / backend dedup concern here, unlike
 * Japa completions or Mandali posts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppLanguage } from './language-runtime';
import { classifyFailure, nextBackoffMs, RETRY_BACKOFF_MS } from './retryPolicy';

export const SETTINGS_CACHE_SCHEMA_VERSION = 2;

// The pre-fix cache: a single global, identity-unscoped key shared by every
// guest AND every signed-in account on the device. It cannot be safely
// attributed to any one user, so it is deleted outright on first read of
// the new cache -- never migrated into a scoped key.
const LEGACY_UNSCOPED_KEY = 'shoonaya_mobile_settings';

export type SettingsCacheIdentity =
  | { kind: 'authenticated'; userId: string }
  | { kind: 'guest' };

export type SettingsFields = {
  wants_festival_reminders: boolean;
  wants_shloka_reminders: boolean;
  wants_nitya_reminders: boolean;
  wants_community_notifications: boolean;
  wants_family_notifications: boolean;
  app_language: AppLanguage;
  transliteration_language: AppLanguage;
  meaning_language: AppLanguage;
  consent_religious_data: boolean;
};

/**
 * A single coalesced desired-state write awaiting server acknowledgment.
 * Re-toggling a field before this resolves overwrites `fields` and resets
 * the retry schedule rather than queueing a second entry -- Settings has
 * one "current desired state," not a log of every toggle.
 */
export type PendingSettingsWrite = {
  id: string;
  fields: Partial<SettingsFields>;
  attempts: number;
  nextAttemptAt: number;
  createdAt: number;
  status: 'pending' | 'failed';
};

export type SettingsCacheEnvelope = {
  schemaVersion: number;
  identity: SettingsCacheIdentity;
  savedAt: number;
  settings: SettingsFields;
  // The server's own profiles.updated_at as of the last acknowledged
  // write/read -- NOT just "we did a GET at some point." A later GET only
  // counts as proof a pending write landed if its updated_at is at least
  // this recent; otherwise the GET is stale relative to a write already in
  // flight and must not clear the pending entry.
  serverUpdatedAt: string | null;
  pendingOperations: PendingSettingsWrite[];
};

function getSettingsCacheKey(identity: SettingsCacheIdentity): string {
  return identity.kind === 'guest'
    ? 'shoonaya_settings_cache_v2_guest'
    : `shoonaya_settings_cache_v2_user_${identity.userId}`;
}

function isValidEnvelope(value: unknown): value is SettingsCacheEnvelope {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.settings === 'object' &&
    v.settings !== null &&
    Array.isArray(v.pendingOperations)
  );
}

/**
 * Purges the old unscoped cache -- never read, never migrated. Removing an
 * already-absent key is a harmless no-op, so this runs on every read
 * rather than needing "only once" bookkeeping.
 */
async function purgeLegacyUnscopedCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LEGACY_UNSCOPED_KEY);
  } catch {
    // Best-effort; a leftover legacy key is inert once nothing reads it.
  }
}

export async function readSettingsCache(
  identity: SettingsCacheIdentity
): Promise<SettingsCacheEnvelope | null> {
  await purgeLegacyUnscopedCache();
  const key = getSettingsCacheKey(identity);
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

    if (!isValidEnvelope(envelope) || envelope.schemaVersion !== SETTINGS_CACHE_SCHEMA_VERSION) {
      await AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }

    if (identity.kind === 'guest') {
      if (envelope.identity?.kind !== 'guest') {
        await AsyncStorage.removeItem(key).catch(() => {});
        return null;
      }
    } else if (envelope.identity?.kind !== 'authenticated' || envelope.identity.userId !== identity.userId) {
      await AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }

    return envelope;
  } catch (error) {
    console.warn('[SettingsCache] read failed', error);
    return null;
  }
}

export async function writeSettingsCache(envelope: SettingsCacheEnvelope): Promise<void> {
  const key = getSettingsCacheKey(envelope.identity);
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ ...envelope, savedAt: Date.now() }));
  } catch (error) {
    console.warn('[SettingsCache] write failed', error);
  }
}

export async function clearSettingsCache(identity: SettingsCacheIdentity): Promise<void> {
  try {
    await AsyncStorage.removeItem(getSettingsCacheKey(identity));
  } catch (error) {
    console.warn('[SettingsCache] clear failed', error);
  }
}

/** Logout/account-switch purge -- removes cache AND any queued mutations together (same key). */
export async function clearAllSettingsCaches(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const settingsKeys = keys.filter(
      (k) => k === 'shoonaya_settings_cache_v2_guest' || k.startsWith('shoonaya_settings_cache_v2_user_')
    );
    if (settingsKeys.length > 0) {
      await AsyncStorage.multiRemove(settingsKeys);
    }
  } catch (error) {
    console.warn('[SettingsCache] clearAll failed', error);
  }
}

/**
 * Merge policy: server wins, except fields covered by a still-pending
 * (unacknowledged) local write. A field only stays locally-overridden
 * while its write hasn't been confirmed committed -- once acknowledged,
 * server precedence resumes for it like any other field.
 */
export function mergeServerWithPending(
  serverSettings: SettingsFields,
  pendingOperations: PendingSettingsWrite[]
): SettingsFields {
  let merged = { ...serverSettings };
  for (const op of pendingOperations) {
    if (op.status === 'pending') {
      merged = { ...merged, ...op.fields };
    }
  }
  return merged;
}

// ── Retry policy ────────────────────────────────────────────────────────
// The classification/backoff math itself lives in lib/retryPolicy.ts,
// shared with the notification-actions outbox -- see that file's comment
// for why this one piece is a shared extraction and the envelope above is
// not. Settings' own contribution on top is just the 'success' variant,
// which carries feature-specific data (persisted settings fields).
export { nextBackoffMs, RETRY_BACKOFF_MS };

export type WriteOutcome =
  | { kind: 'success'; updatedAt: string; persisted: Partial<SettingsFields> }
  | { kind: 'retry'; afterMs: number }
  | { kind: 'permanent_failure' };

export function classifyWriteFailure(status: number, retryAfterHeader: string | null): WriteOutcome {
  return classifyFailure(status, retryAfterHeader);
}
