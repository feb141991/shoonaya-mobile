import { consentContext } from '@/lib/consentContext';
import type { ConsentSurface } from '@/lib/consentWording';
import { apiFetch } from '@/lib/api';
import { getAppIdentity, isSameAppIdentity, type AppIdentity } from '@/lib/appIdentity';
import { supabase } from '@/lib/supabase';
import { readUserScoped, USER_SCOPED_NAMES, writeUserScoped } from '@/lib/userScopedStorage';

/**
 * "Help improve reminders" (profiles.consent_notification_taps; AGENTS.md section 28).
 *
 * It is the ONLY consent that lets a tap on one of our notifications be recorded. It is off until the person turns it on
 * (never pre-selected), separate from "Share product usage data", and the server decides again on every upload.
 *
 * This device keeps a copy only so a tap made at launch, before Settings was ever opened, is queued or not. The copy is
 * stored under the person (lib/userScopedStorage.ts, so sign-out removes it), read fail-closed, and never authorises
 * anything on its own: the server refuses a tap without the stored consent.
 */

let enabled = false;
let activeUserId: string | null = null;
let generation = 0;

/** True only while the signed-in account has this device's copy of the consent switched on. */
export function isNotificationTapConsentEnabled(): boolean {
  return enabled;
}

function authenticated(userId: string): AppIdentity {
  return { kind: 'authenticated', userId };
}

/** Fail-closed identity switch: the gate closes first, then reopens only for a stored "true" belonging to this account. */
export async function initializeNotificationTapConsent(userId: string | null): Promise<void> {
  const mine = ++generation;
  enabled = false;
  activeUserId = userId;
  if (!userId) return;
  const stored = await readUserScoped(authenticated(userId), USER_SCOPED_NAMES.notificationTapConsent);
  if (mine !== generation || activeUserId !== userId) return;
  enabled = stored === 'true';
}

/** Called once the server value is known or acknowledged. */
export async function applyNotificationTapConsent(userId: string, value: boolean): Promise<void> {
  ++generation;
  if (activeUserId === userId) enabled = value === true;
  await writeUserScoped(authenticated(userId), USER_SCOPED_NAMES.notificationTapConsent, value === true ? 'true' : 'false');
}

/** Closes the gate immediately (before the profile write finishes), so nothing is queued while a withdrawal is pending. */
export async function closeNotificationTapConsent(userId: string): Promise<void> {
  ++generation;
  if (activeUserId === userId) enabled = false;
  await writeUserScoped(authenticated(userId), USER_SCOPED_NAMES.notificationTapConsent, 'false');
}

export type ServerTapConsent = 'on' | 'off' | 'unavailable';

/**
 * Reads the account's choice. `unavailable` means the read failed or the service has not been updated with the column yet:
 * the caller must show nothing and change nothing (a failed read is not "off"; AGENTS.md section 18).
 */
export async function readServerNotificationTapConsent(userId: string): Promise<ServerTapConsent> {
  try {
    const { data, error } = await supabase.from('profiles').select('consent_notification_taps').eq('id', userId).maybeSingle();
    if (error || !data) return 'unavailable';
    const value = (data as { consent_notification_taps?: boolean | null }).consent_notification_taps;
    if (value === true) return 'on';
    if (value === false) return 'off';
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/** Writes the choice through the profile route. True only when the server confirms it. */
export async function saveNotificationTapConsent(userId: string, value: boolean, surface: ConsentSurface): Promise<boolean> {
  try {
    const response = await apiFetch('/api/native/profile', {
      method: 'PATCH',
      expectedUserId: userId,
      body: JSON.stringify({ consent_notification_taps: value, consent_context: consentContext(surface, ['notification_taps']) }),
    });
    if (!response.ok) return false;
    return isSameAppIdentity(authenticated(userId), getAppIdentity());
  } catch {
    return false;
  }
}
