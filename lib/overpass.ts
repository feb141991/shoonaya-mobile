export interface Temple {
  id: number;
  lat: number;
  lon: number;
  name: string;
  tradition: 'hindu' | 'sikh' | 'buddhist' | 'jain' | 'other';
  deity?: string;
  address?: string;
  website?: string;
  phone?: string;
  opening?: string;
  sampradaya?: string;
  verified?: boolean;
}

const OVERPASS_MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'ShoonayaMobile/1.0';
const DEFAULT_RADIUS = 10000;
const DEDUP_RADIUS_KM = 0.25;

const TRADITION_DEFAULT_NAMES: Record<Temple['tradition'], string> = {
  hindu: 'Hindu Mandir',
  sikh: 'Gurudwara',
  buddhist: 'Buddhist Vihara',
  jain: 'Jain Temple',
  other: 'Place of Worship',
};

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function inferTradition(tags: Record<string, string | undefined>): Temple['tradition'] {
  const religion = tags.religion?.toLowerCase() ?? '';
  if (religion.includes('sikh')) return 'sikh';
  if (religion.includes('buddh')) return 'buddhist';
  if (religion.includes('jain')) return 'jain';
  if (religion.includes('hindu')) return 'hindu';

  const combined = [
    tags.name,
    tags['name:en'],
    tags['name:hi'],
    tags['name:pa'],
    tags.denomination,
    tags.deity,
    tags['hindu:deity'],
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    combined.includes('gurudwara') ||
    combined.includes('gurdwara') ||
    combined.includes('gurudvara') ||
    combined.includes('darbar sahib') ||
    combined.includes('guru nanak') ||
    combined.includes('khalsa')
  ) {
    return 'sikh';
  }
  if (combined.includes('vihara') || combined.includes('buddh') || combined.includes('stupa')) return 'buddhist';
  if (combined.includes('jain') || combined.includes('derasar') || combined.includes('jin')) return 'jain';
  if (combined.includes('mandir') || combined.includes('temple') || combined.includes('shiv') || combined.includes('krishna') || combined.includes('ram')) {
    return 'hindu';
  }

  return 'other';
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function fetchNearbyTemples(
  lat: number,
  lon: number,
  radiusMetres: number = DEFAULT_RADIUS
): Promise<Temple[]> {
  const query = `
    [out:json][timeout:12];
    (
      node["amenity"="place_of_worship"]["religion"="hindu"](around:${radiusMetres},${lat},${lon});
      way["amenity"="place_of_worship"]["religion"="hindu"](around:${radiusMetres},${lat},${lon});
      node["amenity"="place_of_worship"]["religion"="sikh"](around:${radiusMetres},${lat},${lon});
      way["amenity"="place_of_worship"]["religion"="sikh"](around:${radiusMetres},${lat},${lon});
      node["amenity"="place_of_worship"]["religion"="buddhist"](around:${radiusMetres},${lat},${lon});
      way["amenity"="place_of_worship"]["religion"="buddhist"](around:${radiusMetres},${lat},${lon});
      node["amenity"="place_of_worship"]["religion"="jain"](around:${radiusMetres},${lat},${lon});
      way["amenity"="place_of_worship"]["religion"="jain"](around:${radiusMetres},${lat},${lon});
      relation["amenity"="place_of_worship"]["religion"~"hindu|sikh|buddhist|jain"](around:${radiusMetres},${lat},${lon});
    );
    out center tags;
  `;

  const options: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  };

  let lastError: Error = new Error('All Overpass endpoints failed');

  for (const endpoint of OVERPASS_MIRRORS) {
    try {
      const response = await fetchWithTimeout(endpoint, options, 2800);
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }
      const json = (await response.json()) as { elements?: Array<{ id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> };
      return (json.elements ?? [])
        .map((element) => {
          const tradition = inferTradition(element.tags ?? {});
          return {
            id: element.id,
            lat: element.lat ?? element.center?.lat ?? 0,
            lon: element.lon ?? element.center?.lon ?? 0,
            tradition,
            name:
              element.tags?.name ||
              element.tags?.['name:en'] ||
              element.tags?.['name:hi'] ||
              element.tags?.['name:pa'] ||
              TRADITION_DEFAULT_NAMES[tradition],
            deity: element.tags?.['hindu:deity'] || element.tags?.deity,
            address:
              [element.tags?.['addr:housenumber'], element.tags?.['addr:street'], element.tags?.['addr:city']]
                .filter(Boolean)
                .join(', ') || undefined,
            website: element.tags?.website,
            phone: element.tags?.phone,
            opening: element.tags?.opening_hours,
            sampradaya: element.tags?.denomination,
          } satisfies Temple;
        })
        .filter((temple) => temple.lat !== 0 && temple.lon !== 0);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError;
}

export function mergeCuratedAndOsm(curated: Temple[], osm: Temple[]): Temple[] {
  const filtered = osm.filter(
    (osmTemple) =>
      !curated.some(
        (curatedTemple) =>
          distanceKm(curatedTemple.lat, curatedTemple.lon, osmTemple.lat, osmTemple.lon) < DEDUP_RADIUS_KM
      )
  );

  return [...curated, ...filtered];
}

export async function geocodeCity(city: string, country: string): Promise<{ lat: number; lon: number } | null> {
  const query = country ? `${city}, ${country}` : city;
  try {
    const response = await fetchWithTimeout(
      `${NOMINATIM_SEARCH}?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' } },
      2800
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) {
      return null;
    }

    return { lat: Number.parseFloat(data[0].lat), lon: Number.parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}
