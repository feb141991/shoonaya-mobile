import { POPULAR_CITIES, searchLocalCities, type CityRecord } from './cityCatalog';

export interface CitySuggestion {
  city: string;
  label: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
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
  const results: CitySuggestion[] = localMatches.map((c) => ({
    city: c.city,
    label: c.label,
    country: c.country,
    lat: c.lat,
    lng: c.lng,
    timezone: c.timezone,
  }));

  // If local catalog already gave enough exact prefix matches, return them immediately
  if (results.length >= 4) {
    return results.slice(0, limit);
  }

  // 2. Fetch live geocode suggestions
  try {
    const apiFetch = await getApiFetch();
    if (!apiFetch) return results.slice(0, limit);
    const res = await apiFetch(`/api/tirtha/geocode?q=${encodeURIComponent(trimmed)}&limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          if (typeof item.lat === 'number' && typeof item.lon === 'number' && item.label) {
            const parts = String(item.label).split(',').map((p) => p.trim());
            const cityName = parts[0] || trimmed;
            const country = parts[parts.length - 1] || 'India';
            const isIndia = /india/i.test(country) || /india/i.test(item.label);
            const timezone = isIndia ? 'Asia/Kolkata' : 'UTC';

            // Deduplicate by city name and approx lat/lng
            const alreadyExists = results.some(
              (r) =>
                r.city.toLowerCase() === cityName.toLowerCase() ||
                (Math.abs(r.lat - item.lat) < 0.05 && Math.abs(r.lng - item.lon) < 0.05)
            );

            if (!alreadyExists) {
              results.push({
                city: cityName,
                label: item.label,
                country,
                lat: item.lat,
                lng: item.lon,
                timezone,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    // If network fails, local catalog results still protect the user
    console.warn('[CitySearch] Remote geocode failed, using local fallback:', err);
  }

  return results.slice(0, limit);
}
