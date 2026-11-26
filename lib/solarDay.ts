// The Solar Day timeline: one civil day at one place, built from the same engine
// values the Panchang screen shows (calculatePanchang), so a window on this screen
// is never a different time from the same window on Panchang.
//
// This is daily guidance for a location, not an observance date (AGENTS.md section 2):
// nothing here decides a festival, vrat or tithi.
import {
  calculatePanchang,
  dateToJde,
  getSolarApparentLongitude,
  getSunriseSunsetTimes,
  getTzOffsetHours,
} from '@sangam/panchang-engine';
import {
  MINUTES_PER_DAY,
  declinationFromApparentLongitude,
  sunAltitudeDeg,
  wrapMinutes,
  type SolarGeometryInput,
} from '@/lib/solarGeometry';

export type SolarWindowId = 'brahma' | 'abhijit' | 'rahu';

export type SolarWindow = {
  id: SolarWindowId;
  /** Start and end in minutes after local midnight; end may be smaller than start if it crosses midnight. */
  start: number;
  end: number;
  /** The engine's own text for the window, exactly as Panchang shows it. */
  label: string;
};

export type SolarDay = SolarGeometryInput & {
  civilDate: string;
  timezone: string;
  sunrise: number;
  sunset: number;
  windows: SolarWindow[];
};

export type SolarDayResult =
  | { ok: true; day: SolarDay }
  /** The Sun does not both rise and set here on this date (polar day or night). */
  | { ok: false; reason: 'no_sunrise_or_sunset' };

/** "06:43 AM" -> 403. Returns null for anything else. */
export function parseClockMinutes(text: string | null | undefined): number | null {
  const match = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i.exec(text ?? '');
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  return (hour % 12) * 60 + (/PM/i.test(match[3]) ? 720 : 0) + minute;
}

/** "05:02 AM – 05:55 AM" (en dash or hyphen) -> [302, 355]. */
export function parseClockRange(text: string | null | undefined): [number, number] | null {
  const parts = (text ?? '').split(/\s*[–-]\s*/);
  if (parts.length !== 2) return null;
  const start = parseClockMinutes(parts[0]);
  const end = parseClockMinutes(parts[1]);
  return start === null || end === null ? null : [start, end];
}

/** The instant of local noon on a civil date (YYYY-MM-DD) in a time zone. */
export function localNoonInstant(civilDate: string, timezone: string): Date {
  const [y, m, d] = civilDate.split('-').map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, 12));
  return new Date(guess.getTime() - getTzOffsetHours(guess, timezone) * 3_600_000);
}

export function buildSolarDay(input: { civilDate: string; lat: number; lon: number; timezone: string }): SolarDayResult {
  const noonInstant = localNoonInstant(input.civilDate, input.timezone);
  const riseSet = getSunriseSunsetTimes(input.lat, input.lon, noonInstant);
  if (!riseSet.sunrise || !riseSet.sunset) return { ok: false, reason: 'no_sunrise_or_sunset' };

  const panchang = calculatePanchang(noonInstant, input.lat, input.lon, input.timezone);
  const sunrise = parseClockMinutes(panchang.sunrise);
  const sunset = parseClockMinutes(panchang.sunset);
  if (sunrise === null || sunset === null || sunset <= sunrise) return { ok: false, reason: 'no_sunrise_or_sunset' };

  const t = (dateToJde(noonInstant) - 2451545) / 36525;
  const windows: SolarWindow[] = [];
  const add = (id: SolarWindowId, label: string) => {
    const range = parseClockRange(label);
    if (range) windows.push({ id, start: range[0], end: range[1], label });
  };
  add('brahma', panchang.brahmaMuhurta);
  add('abhijit', panchang.abhijitMuhurat);
  add('rahu', panchang.rahuKaal);

  return {
    ok: true,
    day: {
      civilDate: input.civilDate,
      timezone: input.timezone,
      latitudeDeg: input.lat,
      declinationRad: declinationFromApparentLongitude(getSolarApparentLongitude(t)),
      noonMinutes: (sunrise + sunset) / 2,
      sunrise,
      sunset,
      windows,
    },
  };
}

export function isWithin(minutes: number, start: number, end: number): boolean {
  return start <= end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

export function activeWindows(minutes: number, day: SolarDay): SolarWindow[] {
  return day.windows.filter((w) => isWithin(wrapMinutes(minutes), w.start, w.end));
}

export type SolarEventId = SolarWindowId | 'sunrise' | 'sunset';
export type SolarEvent = { id: SolarEventId; at: number };

/** Every moment worth jumping to, in time order. */
export function solarEvents(day: SolarDay): SolarEvent[] {
  return [
    ...day.windows.map((w) => ({ id: w.id, at: w.start })),
    { id: 'sunrise' as const, at: day.sunrise },
    { id: 'sunset' as const, at: day.sunset },
  ].sort((a, b) => a.at - b.at);
}

/**
 * The next event after `minutes`. `laterToday` is false when it is only reached by
 * wrapping past midnight: its time then belongs to the next day, which this timeline
 * does not compute, so the caller must say so rather than state that time as fact.
 */
export function nextEvent(minutes: number, day: SolarDay): (SolarEvent & { inMinutes: number; laterToday: boolean }) | null {
  const now = wrapMinutes(minutes);
  let best: (SolarEvent & { inMinutes: number; laterToday: boolean }) | null = null;
  for (const event of solarEvents(day)) {
    const raw = event.at - now;
    const inMinutes = raw > 0 ? raw : raw + MINUTES_PER_DAY;
    if (!best || inMinutes < best.inMinutes) best = { ...event, inMinutes, laterToday: raw > 0 };
  }
  return best;
}

/** Minutes after local midnight right now in a time zone. */
export function minutesNowIn(timezone: string, now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

export function formatClock(minutes: number): string {
  const m = Math.round(wrapMinutes(minutes)) % MINUTES_PER_DAY;
  const hour = Math.floor(m / 60);
  return `${hour % 12 || 12}:${String(m % 60).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** Rounded to whole degrees: the method is not good to a tenth (see lib/solarGeometry.ts). */
export function altitudeWholeDegrees(minutes: number, day: SolarDay): number {
  return Math.round(sunAltitudeDeg(minutes, day));
}
