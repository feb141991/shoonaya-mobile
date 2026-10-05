import type { AppIdentity } from '@/lib/appIdentity';

/**
 * Language preferences are identity-owned. A device-wide preference lets a
 * second person briefly inherit the previous account's language on shared
 * devices, so authenticated and guest preferences use separate keys.
 */
export function getLanguageStorageKey(identity: AppIdentity): string | null {
  if (identity.kind === 'loading') return null;
  if (identity.kind === 'authenticated') {
    return `@shoonaya/app_language:user:${identity.userId}`;
  }
  return '@shoonaya/app_language:guest';
}
