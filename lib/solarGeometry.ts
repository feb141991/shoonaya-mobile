// Where the Sun is in the sky at a given minute of a civil day, for the Solar Day
// screen and its 3D scene. Pure maths with no imports: the scene page is bundled from
// this same file (scripts/solar-scene), so the picture and the words on screen can
// never disagree.
//
// Accuracy: the hour angle comes from solar noon taken as the midpoint of the engine's
// sunrise and sunset (minute resolution), and the declination from the engine's apparent
// solar longitude. That is good to well under a degree, so the screen shows the height
// to the nearest whole degree and never claims more. Refraction is ignored here; the
// engine's sunrise and sunset already include it, so the height near the horizon can
// read about half a degree low.

export const MINUTES_PER_DAY = 1440;
const RAD = Math.PI / 180;
const OBLIQUITY_RAD = 23.4393 * RAD;

export type SolarGeometryInput = {
  /** Latitude in degrees, north positive. */
  latitudeDeg: number;
  /** Solar declination in radians for the day. */
  declinationRad: number;
  /** Solar noon in minutes after local civil midnight. */
  noonMinutes: number;
};

export function wrapMinutes(minutes: number): number {
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

/** Declination from the apparent ecliptic longitude of the Sun, in radians (the engine's unit). */
export function declinationFromApparentLongitude(longitudeRad: number): number {
  return Math.asin(Math.sin(OBLIQUITY_RAD) * Math.sin(longitudeRad));
}

function hourAngleRad(minutes: number, geo: SolarGeometryInput): number {
  // 4 minutes of time per degree of hour angle.
  return ((minutes - geo.noonMinutes) / 4) * RAD;
}

/** Height of the Sun's centre above the horizon, in degrees (negative below it). */
export function sunAltitudeDeg(minutes: number, geo: SolarGeometryInput): number {
  const lat = geo.latitudeDeg * RAD;
  const h = hourAngleRad(minutes, geo);
  const sinAlt =
    Math.sin(lat) * Math.sin(geo.declinationRad) + Math.cos(lat) * Math.cos(geo.declinationRad) * Math.cos(h);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) / RAD;
}

/** Compass bearing of the Sun in radians, clockwise from north (east = pi/2). */
export function sunAzimuthRad(minutes: number, geo: SolarGeometryInput): number {
  const lat = geo.latitudeDeg * RAD;
  const h = hourAngleRad(minutes, geo);
  const alt = sunAltitudeDeg(minutes, geo) * RAD;
  const denominator = Math.cos(alt) * Math.cos(lat);
  if (Math.abs(denominator) < 1e-9) return Math.PI;
  const cosAz = (Math.sin(geo.declinationRad) - Math.sin(alt) * Math.sin(lat)) / denominator;
  const az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  // Morning (negative hour angle, after wrapping to -pi..pi) is the eastern half.
  const wrapped = Math.atan2(Math.sin(h), Math.cos(h));
  return wrapped > 0 ? 2 * Math.PI - az : az;
}

export type SolarPhase = 'day' | 'twilight' | 'night';

/** Civil twilight runs to 6 degrees below the horizon. */
export function solarPhase(altitudeDeg: number): SolarPhase {
  if (altitudeDeg >= 0) return 'day';
  if (altitudeDeg >= -6) return 'twilight';
  return 'night';
}
