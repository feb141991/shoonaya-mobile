// Where the Solar Day is calculated. The same precedence and reference as Panchang:
// the profile's saved place, otherwise Ujjain, always labelled as a reference
// (AGENTS.md section 15). A failed read is not "no saved place" (section 18): the
// screen shows Ujjain with a retry and says it could not load the saved place.
import { REFERENCE_LOCATION_UJJAIN } from '@sangam/panchang-engine';

export type SolarDayLocation = {
  lat: number;
  lon: number;
  timezone: string;
  /** The place name to show; for the reference, the screen shows its own label. */
  city: string | null;
  source: 'saved' | 'reference';
};

export const SOLAR_DAY_REFERENCE: SolarDayLocation = {
  lat: REFERENCE_LOCATION_UJJAIN.lat,
  lon: REFERENCE_LOCATION_UJJAIN.lon,
  timezone: REFERENCE_LOCATION_UJJAIN.tz,
  city: null,
  source: 'reference',
};

export type SolarDayProfileRead = {
  data: { latitude?: number | null; longitude?: number | null; timezone?: string | null; city?: string | null; neighbourhood?: string | null } | null;
  error: unknown;
};

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function resolveSolarDayLocation(result: SolarDayProfileRead): SolarDayLocation {
  if (result.error) throw result.error;
  const row = result.data;
  const lat = row?.latitude;
  const lon = row?.longitude;
  const timezone = row?.timezone?.trim();
  // A place is used only whole: coordinates without a valid time zone would put the
  // right sky on the wrong clock.
  if (
    typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon) ||
    Math.abs(lat) > 90 || Math.abs(lon) > 180 || !timezone || !isValidTimezone(timezone)
  ) {
    return SOLAR_DAY_REFERENCE;
  }
  const city = (row?.neighbourhood || row?.city || '').trim() || null;
  return { lat, lon, timezone, city, source: 'saved' };
}
