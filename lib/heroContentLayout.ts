import AsyncStorage from '@react-native-async-storage/async-storage';

export type HeroContentPosition = 'auto' | 'left' | 'right' | 'below';
const KEY = 'shoonaya_hero_content_position_v1';

export const HERO_CONTENT_POSITIONS: ReadonlyArray<{ value: HeroContentPosition; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'below', label: 'Below' },
];

function isPosition(value: unknown): value is HeroContentPosition {
  return value === 'auto' || value === 'left' || value === 'right' || value === 'below';
}

export async function getHeroContentPosition(): Promise<HeroContentPosition> {
  try {
    const value = await AsyncStorage.getItem(KEY);
    return isPosition(value) ? value : 'auto';
  } catch {
    return 'auto';
  }
}

export async function setHeroContentPosition(value: HeroContentPosition): Promise<void> {
  await AsyncStorage.setItem(KEY, value);
}

/** Local presentation only: never infer subject location from the image crop. */
export function resolveHeroContentLayout(
  preference: HeroContentPosition,
  artworkId: string | undefined,
  width: number,
  fontScale: number,
): { position: Exclude<HeroContentPosition, 'auto'>; columnWidth: number } {
  // Left-anchored overlay per explicit product preference (originally scoped
  // to the reviewed Krishna artwork only; extended to every artwork -- the
  // "unreviewed composition" caution wasn't worth every other artwork
  // defaulting to the separate below-image surface).
  void artworkId;
  const preferred = preference === 'auto' ? 'left' : preference;
  const availableColumn = (width - 60) / 2;
  // A phone side column tops out around 150-185pt (iPhone SE through Pro
  // Max) -- the previous 296pt minimum could never be satisfied by any
  // phone, so 'left'/'right' silently never fired outside tablet widths.
  // 150 covers mainstream phone widths (>=375) while still falling back
  // to 'below' on the smallest/oldest screens (320pt) and at larger
  // accessibility text scales, where a stacked layout reads better anyway.
  const minimumColumn = 150 * Math.max(1, fontScale);
  if (preferred === 'below' || availableColumn < minimumColumn || fontScale > 1.3) {
    return { position: 'below', columnWidth: Math.max(0, width - 40) };
  }
  return { position: preferred, columnWidth: Math.min(360, availableColumn) };
}
