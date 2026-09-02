export type MandaliLocation = {
  city: string;
  country: string;
  member_count: number;
  distanceKm?: number;
};

export function mandaliLocationKey(city: string, country: string): string {
  return `${city.trim().toLocaleLowerCase()}|${country.trim().toLocaleLowerCase()}`;
}

// Input must already be sorted by proximity, then member count. Retaining the
// first record makes the UI deterministic while historical duplicate rows are
// reconciled in the database.
export function dedupeNearbyMandalis<T extends MandaliLocation>(nearby: T[]): T[] {
  const uniqueByLocation = new Map<string, T>();
  for (const mandali of nearby) {
    const key = mandaliLocationKey(mandali.city, mandali.country);
    if (!uniqueByLocation.has(key)) uniqueByLocation.set(key, mandali);
  }
  return [...uniqueByLocation.values()];
}
