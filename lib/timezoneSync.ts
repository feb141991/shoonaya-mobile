import { supabase } from '@/lib/supabase';

// Keeps `profiles.timezone` in sync with the device's actual IANA timezone.
//
// Why this exists: every date-sensitive write/read on the backend
// (nitya-karma, japa/complete, pathshala/progress, quiz/save, dharm-veer/
// submit, home-summary, ...) calls `localSpiritualDate(profile.timezone, 4)`
// to decide what "today" means for that user. Native never wrote
// `profiles.timezone` anywhere — onboarding doesn't set it, and no screen
// ever persists it — so for any user who signed up on native without also
// touching the web app, that column stays NULL forever. Each backend route
// falls back independently when it's NULL, and those fallbacks don't agree
// (some default to 'UTC', `/api/native/home-summary` defaults to
// 'Asia/Kolkata') — so a write can land on one "today" and a read can look
// for a different "today", and a just-completed practice appears not done.
// See home-summary's fallback fix for the narrow patch; this is the actual
// root fix so the mismatch stops being possible in the first place.
//
// Re-synced on every authenticated session (see _layout.tsx routeForSession,
// same lifecycle as registerPushToken) rather than once at signup, so a
// user who travels and changes timezone gets corrected automatically —
// cheap because it's a no-op whenever the stored value already matches.

let lastSyncedUserId: string | null = null;
let lastSyncedTimezone: string | null = null;

function getDeviceTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === 'string' && tz.length > 0 ? tz : null;
  } catch {
    return null;
  }
}

export async function syncDeviceTimezone(userId: string): Promise<void> {
  if (!userId) return;

  const deviceTz = getDeviceTimezone();
  if (!deviceTz) return;

  // Skip the network round-trip if we already synced this exact
  // (user, timezone) pair earlier in this app session.
  if (lastSyncedUserId === userId && lastSyncedTimezone === deviceTz) return;

  try {
    const { data: profile, error: readError } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', userId)
      .maybeSingle();

    if (readError) return;

    if (profile?.timezone === deviceTz) {
      lastSyncedUserId = userId;
      lastSyncedTimezone = deviceTz;
      return;
    }

    const { error: writeError } = await supabase
      .from('profiles')
      .update({ timezone: deviceTz })
      .eq('id', userId);

    if (!writeError) {
      lastSyncedUserId = userId;
      lastSyncedTimezone = deviceTz;
    }
  } catch {
    // Best-effort — a failed sync just means the fallback path (which is
    // being made consistent server-side) applies for a bit longer.
  }
}
