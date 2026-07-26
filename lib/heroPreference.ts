import AsyncStorage from '@react-native-async-storage/async-storage';

// The user's Home hero backdrop pick — mirrors the PWA's own
// `localStorage`-only `shoonaya_hero_pick` (src/app/(main)/home/sections/
// HeroSection.tsx): device-local only, no `profiles` column, so growing
// the picker's theme pool never costs per-user DB storage. Native stores
// the resolved image/position alongside the id (not just the id) so Home
// can apply the override immediately on mount without an extra round trip
// to /api/native/hero-themes just to look the id back up.
const HERO_PICK_KEY = 'shoonaya_hero_pick';

export type HeroPick = {
  id: string;
  imageUrl: string;
  objectPosition?: string;
};

export async function getHeroPick(): Promise<HeroPick | null> {
  try {
    const raw = await AsyncStorage.getItem(HERO_PICK_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HeroPick;
  } catch {
    return null;
  }
}

export async function setHeroPick(pick: HeroPick | null): Promise<void> {
  try {
    if (pick) {
      await AsyncStorage.setItem(HERO_PICK_KEY, JSON.stringify(pick));
    } else {
      await AsyncStorage.removeItem(HERO_PICK_KEY);
    }
  } catch {
    // Best-effort, matching the PWA's own localStorage usage (no throw).
  }
}
