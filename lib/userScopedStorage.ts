/**
 * Small private values that belong to one person (a cached progress payload,
 * a name story, a custom mantra, a vrat sankalpa) and are not worth a cache
 * module of their own. Every key carries its owner, a value is written only
 * while that owner is still the current identity, and sign-out or an account
 * switch removes all of them (AGENTS.md sections 5 and 23).
 *
 * Device preferences that say nothing about a person (theme, mala skin, sound)
 * stay in plain AsyncStorage keys; private values never do.
 */
import { createCacheStorageBarrier } from './cacheStorageBarrier';
import { getAppIdentity, isSameAppIdentity, type AppIdentity } from './appIdentity';

export const USER_SCOPED_PREFIX = 'shoonaya_scoped_v1:';

/** Every value stored here, by name. A slug-specific value appends `:<slug>`. */
export const USER_SCOPED_NAMES = {
  progress: 'progress_v3',
  nameStory: 'name_story',
  dharmVeerHistory: 'dharm_veer_history',
  japaCustomMantra: 'japa_custom_mantra',
  vratMode: 'vrat_mode',
  vratSankalpa: 'vrat_sankalpa',
  vratRead: 'vrat_read',
} as const;

/**
 * Keys written before 2026-11-03 with no owner in the name. They are never
 * read again, and every purge deletes whatever an older build left behind.
 */
export const LEGACY_UNSCOPED_KEYS = [
  'shoonaya_progress_cache_v2',
  'shoonaya:last_name_story',
  'shoonaya-dharmveer-history',
  'shoonaya.japa.customMantra',
] as const;
export const LEGACY_UNSCOPED_PREFIXES = [
  'shoonaya_vrat_sankalpa_',
  'shoonaya_vrat_mode_',
  'shoonaya_vrat_read_',
] as const;

function isOwnedKey(key: string): boolean {
  return (
    key.startsWith(USER_SCOPED_PREFIX) ||
    (LEGACY_UNSCOPED_KEYS as readonly string[]).includes(key) ||
    LEGACY_UNSCOPED_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
}

const storage = createCacheStorageBarrier(isOwnedKey);

/** `null` while identity is loading or nobody is signed in: there is no owner to file a value under. */
export function userScopedKey(identity: AppIdentity, name: string): string | null {
  if (identity.kind === 'authenticated') return `${USER_SCOPED_PREFIX}user_${identity.userId}:${name}`;
  if (identity.kind === 'guest') return `${USER_SCOPED_PREFIX}guest:${name}`;
  return null;
}

export async function readUserScoped(identity: AppIdentity, name: string): Promise<string | null> {
  const key = userScopedKey(identity, name);
  if (!key) return null;
  try {
    const stored = await storage.read(key);
    // A purge or a later write during the read returns nothing rather than an old value.
    return stored?.value ?? null;
  } catch {
    return null;
  }
}

/** Skipped when `identity` is no longer the current one, so a late response cannot file data for a signed-out person. */
export async function writeUserScoped(identity: AppIdentity, name: string, value: string): Promise<void> {
  const key = userScopedKey(identity, name);
  if (!key || !isSameAppIdentity(identity, getAppIdentity())) return;
  try {
    await storage.setItem(key, value);
  } catch {
    // Non-fatal: the value is a convenience copy of server or session state.
  }
}

export function clearAllUserScopedStorage(): Promise<void> {
  return storage.clearAll();
}
