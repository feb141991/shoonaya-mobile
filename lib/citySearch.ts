import { searchLocalCities } from './cityCatalog';

export interface CitySuggestion {
  city: string;
  label: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
}

export function parseCitySuggestion(value: unknown): CitySuggestion | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<CitySuggestion>;
  if (
    typeof item.city !== 'string' || !item.city.trim()
    || (item.label !== undefined && (typeof item.label !== 'string' || !item.label.trim()))
    || typeof item.country !== 'string' || !item.country.trim()
    || typeof item.lat !== 'number' || !Number.isFinite(item.lat) || item.lat < -90 || item.lat > 90
    || typeof item.lng !== 'number' || !Number.isFinite(item.lng) || item.lng < -180 || item.lng > 180
    || typeof item.timezone !== 'string' || !item.timezone.trim()
  ) return null;
  try {
    new Intl.DateTimeFormat('en', { timeZone: item.timezone });
    return {
      city: item.city.trim(),
      label: item.label?.trim() || `${item.city.trim()}, ${item.country.trim()}`,
      country: item.country.trim(),
      lat: item.lat,
      lng: item.lng,
      timezone: item.timezone,
    };
  } catch {
    return null;
  }
}

function isSamePlace(a: CitySuggestion, b: CitySuggestion): boolean {
  const sameNamedCity = a.city.trim().toLocaleLowerCase() === b.city.trim().toLocaleLowerCase()
    && a.country.trim().toLocaleLowerCase() === b.country.trim().toLocaleLowerCase();
  return sameNamedCity || (Math.abs(a.lat - b.lat) < 0.05 && Math.abs(a.lng - b.lng) < 0.05);
}

export function formatCoordinate(value: number, positiveHemisphere: 'N' | 'E', negativeHemisphere: 'S' | 'W'): string {
  return `${Math.abs(value).toFixed(3)}°${value < 0 ? negativeHemisphere : positiveHemisphere}`;
}

export function searchLocalCitySuggestions(query: string, limit = 6): CitySuggestion[] {
  return searchLocalCities(query, limit).map((city) => ({
    city: city.city,
    label: city.label,
    country: city.country,
    lat: city.lat,
    lng: city.lng,
    timezone: city.timezone,
  }));
}

let _apiFetch: typeof import('@/lib/api').apiFetch | null = null;
async function getApiFetch() {
  if (!_apiFetch) {
    try {
      const mod = await import('@/lib/api');
      _apiFetch = mod.apiFetch;
    } catch {
      return null;
    }
  }
  return _apiFetch;
}

/**
 * Searches for city suggestions.
 * 1. Checks curated high-precision local catalog (0ms latency).
 * 2. Fetches remote geocoding suggestions via backend proxy.
 * 3. Merges and dedupes results.
 */
export async function searchCities(query: string, limit = 6): Promise<CitySuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // 1. Get instant local matches
  const localMatches = searchLocalCities(trimmed, limit);
  const results = searchLocalCitySuggestions(trimmed, limit);

  const exactLocalMatch = localMatches.find((city) =>
    city.city.toLocaleLowerCase() === trimmed.toLocaleLowerCase()
      || city.aliases?.some((alias) => alias.toLocaleLowerCase() === trimmed.toLocaleLowerCase()));
  if (exactLocalMatch) return results.filter((r) => r.city === exactLocalMatch.city).slice(0, limit);

  // If local catalog already gave enough exact prefix matches, return them immediately
  if (results.length >= 4) {
    return results.slice(0, limit);
  }

  // 2. Fetch live geocode suggestions
  try {
    const apiFetch = await getApiFetch();
    if (!apiFetch) return results.slice(0, limit);
    // The Jyotish geocoder returns coordinates and the matching IANA zone.
    // Tirtha's multi-result endpoint has no timezone field; guessing UTC for
    // international birthplaces can change a chart's ascendant and houses.
    const res = await apiFetch(`/api/jyotish/geocode?q=${encodeURIComponent(trimmed)}`);
    if (res.ok) {
      const item = parseCitySuggestion(await res.json());
      if (item && !results.some((existing) => isSamePlace(existing, item))) {
        results.push(item);
      }
    }
  } catch (err) {
    // If network fails, local catalog results still protect the user
    console.warn('[CitySearch] Remote geocode failed, using local fallback:', err);
  }

  return results.slice(0, limit);
}

export async function resolveCoordinateTimezone(lat: number, lng: number): Promise<string | null> {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) return null;
  try {
    const apiFetch = await getApiFetch();
    if (!apiFetch) return null;
    const response = await apiFetch('/api/jyotish/geocode', {
      method: 'POST',
      body: JSON.stringify({ lat, lng }),
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object') return null;
    const timezone = (payload as { timezone?: unknown }).timezone;
    if (typeof timezone !== 'string' || !timezone.trim()) return null;
    new Intl.DateTimeFormat('en', { timeZone: timezone });
    return timezone;
  } catch {
    return null;
  }
}
