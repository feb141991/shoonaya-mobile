import * as Location from 'expo-location';

import { reverseGeocode } from '@/lib/mandali';
import { supabase } from '@/lib/supabase';

// Keeps `profiles.latitude`/`longitude`/`city`/`country` in sync with the
// device's actual GPS position -- the coordinate counterpart to
// lib/timezoneSync.ts's timezone sync. Same root problem: native never
// wrote these columns anywhere (onboarding.tsx doesn't collect them,
// profile.tsx only ever displayed `city` as inert text), so a user whose
// web-side profile also never set them falls back to Ujjain, India for
// every panchang/sunrise calculation (see app/panchang.tsx's
// INITIAL_STATE) while the timezone label shows correctly -- producing a
// "locally-labeled but Ujjain-computed" mismatch.
//
// Unlike timezone, reading GPS requires an OS permission prompt, so this
// can't fire unconditionally on every session the way syncDeviceTimezone
// does. `syncDeviceLocationIfPermitted` only ever reads a position when
// permission is already granted (e.g. previously granted for Tirtha or
// Mandali) -- it never itself prompts. `requestAndSyncDeviceLocation` is
// the one path allowed to prompt, meant to be called from an explicit user
// action (Profile's "Update location" row).

const LOCATION_TIMEOUT_MS = 8000;
const CACHED_LOCATION_MAX_AGE_MS = 2 * 60 * 1000;

let lastSyncedUserId: string | null = null;
let lastSyncedKey: string | null = null;

async function getPosition(): Promise<Location.LocationObject | null> {
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), LOCATION_TIMEOUT_MS)),
    ]);
  } catch {
    return Location.getLastKnownPositionAsync({ maxAge: CACHED_LOCATION_MAX_AGE_MS });
  }
}

async function writeLocationIfChanged(
  userId: string,
  lat: number,
  lon: number
): Promise<{ ok: true; city: string } | { ok: false; reason: string }> {
  const geocoded = await reverseGeocode(lat, lon).catch(() => null);
  if (!geocoded?.city) {
    return { ok: false, reason: 'Could not determine your city from that location.' };
  }

  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (lastSyncedUserId === userId && lastSyncedKey === key) {
    return { ok: true, city: geocoded.city };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ latitude: lat, longitude: lon, city: geocoded.city, country: geocoded.country || null })
    .eq('id', userId);

  if (error) {
    return { ok: false, reason: 'Could not save your location. Please try again.' };
  }

  lastSyncedUserId = userId;
  lastSyncedKey = key;
  return { ok: true, city: geocoded.city };
}

// Best-effort, silent -- called unconditionally every authenticated
// session (see app/_layout.tsx, alongside syncDeviceTimezone). Never
// prompts; a denied/undetermined permission is simply a no-op.
export async function syncDeviceLocationIfPermitted(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== 'granted') return;

    const position = await getPosition();
    if (!position) return;

    await writeLocationIfChanged(userId, position.coords.latitude, position.coords.longitude);
  } catch {
    // Best-effort -- a failed sync just means the profile's location stays
    // whatever it was (Ujjain fallback or a stale value) for a bit longer.
  }
}

// User-initiated -- the only path allowed to trigger the OS permission
// prompt. Returns a result so the calling UI can show success/denial
// feedback, unlike the passive sync above.
export async function requestAndSyncDeviceLocation(
  userId: string
): Promise<{ ok: true; city: string } | { ok: false; reason: string }> {
  if (!userId) return { ok: false, reason: 'Not signed in.' };

  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      return { ok: false, reason: 'Location permission denied.' };
    }

    const position = await getPosition();
    if (!position) {
      return { ok: false, reason: 'Could not get your current location.' };
    }

    return await writeLocationIfChanged(userId, position.coords.latitude, position.coords.longitude);
  } catch {
    return { ok: false, reason: 'Location lookup failed. Please try again.' };
  }
}
