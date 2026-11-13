/**
 * Curated diaspora temple directory.
 *
 * These are hand-verified, well-known sacred places in diaspora cities.
 * They are used as a primary overlay on top of OpenStreetMap (Overpass) results
 * — so diaspora users see real results even when OSM data is sparse.
 *
 * Coordinates are approximate (within ~200 m of the actual entrance).
 * Expand this list as the community grows — each row is pure JSON, no build step.
 */

import { DIASPORA_TEMPLES_UNITED_KINGDOM } from './diaspora-temples-data/united-kingdom';
import { DIASPORA_TEMPLES_UNITED_STATES } from './diaspora-temples-data/united-states';
import { DIASPORA_TEMPLES_CANADA_AND_AUSTRALIA } from './diaspora-temples-data/canada-and-australia';
import { DIASPORA_TEMPLES_MIDDLE_EAST_ASIA_AND_AFRICA } from './diaspora-temples-data/middle-east-asia-and-africa';
import { DIASPORA_TEMPLES_CARIBBEAN_EUROPE_AND_OCEANIA } from './diaspora-temples-data/caribbean-europe-and-oceania';

export interface CuratedTemple {
  id: string;                                            // stable slug — never change
  name: string;
  tradition: 'hindu' | 'sikh' | 'buddhist' | 'jain';
  lat: number;
  lon: number;
  city: string;
  country: string;
  address?: string;
  website?: string;
  deity?: string;
  sampradaya?: string;
  opening?: string;
}

export const DIASPORA_TEMPLES: CuratedTemple[] = [
  ...DIASPORA_TEMPLES_UNITED_KINGDOM,
  ...DIASPORA_TEMPLES_UNITED_STATES,
  ...DIASPORA_TEMPLES_CANADA_AND_AUSTRALIA,
  ...DIASPORA_TEMPLES_MIDDLE_EAST_ASIA_AND_AFRICA,
  ...DIASPORA_TEMPLES_CARIBBEAN_EUROPE_AND_OCEANIA,
];

// ── Haversine distance (km) ────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns curated temples within `radiusMetres` of the given coordinates,
 * sorted by distance (nearest first). Pure client-side — no API call.
 */
export function getCuratedNearbyTemples(
  lat: number,
  lon: number,
  radiusMetres: number
): (CuratedTemple & { distanceKm: number })[] {
  const radiusKm = radiusMetres / 1000;
  return DIASPORA_TEMPLES
    .map((t) => ({ ...t, distanceKm: haversineKm(lat, lon, t.lat, t.lon) }))
    .filter((t) => t.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
