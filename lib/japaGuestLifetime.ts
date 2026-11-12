import AsyncStorage from '@react-native-async-storage/async-storage';

// Device-only lifetime totals for someone who practises without signing in.
// Not keyed by a person on purpose: it is guest-only data and is never read
// for a signed-in account (the server's totals are used for those).
const JAPA_GUEST_LIFETIME_KEY = 'shoonaya.japa.guestLifetime';

export type JapaLifetimeData = {
  totalBeads: number;
  totalRounds: number;
  lastPracticed: string | null;
};

export const EMPTY_LIFETIME: JapaLifetimeData = { totalBeads: 0, totalRounds: 0, lastPracticed: null };

// `saved` says whether anything was stored at all, which is what route-open
// telemetry reports as a cache hit; unreadable stored text still counts as saved.
export function parseGuestLifetime(raw: string | null): { lifetime: JapaLifetimeData; saved: boolean } {
  if (!raw) return { lifetime: EMPTY_LIFETIME, saved: false };
  try {
    const parsed = JSON.parse(raw) as Partial<JapaLifetimeData>;
    return {
      lifetime: {
        totalBeads: typeof parsed.totalBeads === 'number' ? parsed.totalBeads : 0,
        totalRounds: typeof parsed.totalRounds === 'number' ? parsed.totalRounds : 0,
        lastPracticed: typeof parsed.lastPracticed === 'string' ? parsed.lastPracticed : null,
      },
      saved: true,
    };
  } catch {
    return { lifetime: EMPTY_LIFETIME, saved: true };
  }
}

export async function readGuestLifetime() {
  return parseGuestLifetime(await AsyncStorage.getItem(JAPA_GUEST_LIFETIME_KEY));
}

export function writeGuestLifetime(lifetime: JapaLifetimeData) {
  return AsyncStorage.setItem(JAPA_GUEST_LIFETIME_KEY, JSON.stringify(lifetime));
}
