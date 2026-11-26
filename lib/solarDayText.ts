// The words the Solar Day screen shows for one minute of one day. Names and
// explanations are Panchang's own (lib/panchangInfoText.ts); nothing here adds a
// ritual claim.
import { PANCHANG_INFO_TEXT } from '@/lib/panchangInfoText';
import {
  activeWindows,
  altitudeWholeDegrees,
  formatClock,
  formatDuration,
  nextEvent,
  type SolarDay,
  type SolarEventId,
} from '@/lib/solarDay';
import { solarPhase, sunAltitudeDeg, sunAzimuthRad } from '@/lib/solarGeometry';

/** Panchang's names for the same rows, so the two screens read alike. */
export const SOLAR_EVENT_NAMES: Record<SolarEventId, string> = {
  brahma: 'Brahma Muhurta',
  abhijit: 'Abhijit Muhurat',
  rahu: 'Rahu Kaal',
  sunrise: 'Sunrise',
  sunset: 'Sunset',
};

export function solarEventInfo(id: SolarEventId): string | null {
  return PANCHANG_INFO_TEXT[SOLAR_EVENT_NAMES[id]] ?? null;
}

const PHASE_NAMES = { day: 'Daytime', twilight: 'Twilight', night: 'Night' } as const;
const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

export function compassWord(azimuthRad: number): string {
  const index = Math.round(((azimuthRad / (2 * Math.PI)) * 8 + 8) % 8) % 8;
  return COMPASS[index];
}

export type SolarMomentText = {
  clock: string;
  /** "Daytime · about 30° above the horizon" */
  height: string;
  /** "Now: Abhijit Muhurat" or "No marked window right now" */
  now: string;
  /** "Next: Sunset at 5:40 PM, in 2 h 38 min." */
  next: string | null;
  /** One sentence for screen readers in place of the picture. */
  spoken: string;
};

export function describeSolarMoment(minutes: number, day: SolarDay): SolarMomentText {
  const altitude = sunAltitudeDeg(minutes, day);
  const degrees = Math.abs(altitudeWholeDegrees(minutes, day));
  const phase = PHASE_NAMES[solarPhase(altitude)];
  const side = altitude >= 0 ? 'above' : 'below';
  const height = degrees === 0 ? `${phase} · the Sun is on the horizon` : `${phase} · about ${degrees}° ${side} the horizon`;
  const active = activeWindows(minutes, day).map((w) => SOLAR_EVENT_NAMES[w.id]);
  const upcoming = nextEvent(minutes, day);
  let next: string | null = null;
  if (upcoming) {
    const name = SOLAR_EVENT_NAMES[upcoming.id];
    // Past midnight the time belongs to tomorrow, which this day does not calculate.
    next = upcoming.laterToday
      ? `Next: ${name} at ${formatClock(upcoming.at)}, in ${formatDuration(upcoming.inMinutes)}.`
      : `Next: ${name}, tomorrow.`;
  }
  const clock = formatClock(minutes);
  const where = altitude >= -4 ? `, in the ${compassWord(sunAzimuthRad(minutes, day))}` : '';
  return {
    clock,
    height,
    now: active.length ? `Now: ${active.join(' and ')}` : 'No marked window right now',
    next,
    spoken: `${clock}. The Sun is about ${degrees} degrees ${side} the horizon${where}.`,
  };
}
