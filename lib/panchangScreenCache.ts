import { spiritualDate } from './spiritualDate';

export type PanchangScreenProfile<TTradition extends string = string> = {
  lat: number;
  lon: number;
  timezone: string;
  tradition: TTradition;
  rashi: string | null;
  city: string;
};

export type PanchangScreenSnapshot<TFestival, TTradition extends string = string> = {
  profile: PanchangScreenProfile<TTradition>;
  festivals: TFestival[];
  spiritualDate: string;
};

const snapshots = new Map<string, PanchangScreenSnapshot<unknown>>();

/**
 * Memory-only, identity-scoped cache for the Panchang screen. It avoids a
 * storage/schema migration and is cleared at the same auth boundaries as the
 * other private render caches. A spiritual-date rollover invalidates it.
 */
export function getPanchangScreenSnapshot<TFestival, TTradition extends string = string>(
  identityKey: string,
  now: Date = new Date()
): PanchangScreenSnapshot<TFestival, TTradition> | null {
  const snapshot = snapshots.get(identityKey);
  if (!snapshot || snapshot.spiritualDate !== spiritualDate(snapshot.profile.timezone, now)) return null;
  return snapshot as PanchangScreenSnapshot<TFestival, TTradition>;
}

export function writePanchangScreenSnapshot<TFestival, TTradition extends string>(
  identityKey: string,
  profile: PanchangScreenProfile<TTradition>,
  festivals: TFestival[],
  now: Date = new Date()
): void {
  snapshots.set(identityKey, {
    profile,
    festivals,
    spiritualDate: spiritualDate(profile.timezone, now),
  });
}

export function clearPanchangScreenSnapshots(): void {
  snapshots.clear();
}
