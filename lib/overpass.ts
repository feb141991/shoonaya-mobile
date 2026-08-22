export interface Temple {
  id: string; // Source-qualified id: 'curated:<slug>' or 'osm:<type>:<id>'
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

export interface CitySuggestion {
  label: string;
  lat: number;
  lon: number;
}

const DEDUP_RADIUS_KM = 0.25;

export const TRADITION_DEFAULT_NAMES: Record<Temple['tradition'], string> = {
  hindu: 'Hindu Mandir',
  sikh: 'Gurudwara',
  buddhist: 'Buddhist Vihara',
  jain: 'Jain Temple',
  other: 'Place of Worship',
};

export function inferTradition(tags: Record<string, string | undefined>): Temple['tradition'] {
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
  if (
    combined.includes('mandir') ||
    combined.includes('temple') ||
    combined.includes('shiv') ||
    combined.includes('krishna') ||
    combined.includes('ram')
  ) {
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
