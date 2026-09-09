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
  // Reviewed artwork: Krishna stands on the left of this landscape image.
  // Unreviewed artwork uses a separate details surface until its composition is known.
  const preferred = preference === 'auto'
    ? artworkId === 'krishna-yamuna-sunrise' ? 'right' : 'below'
    : preference;
  const availableColumn = (width - 60) / 2;
  const minimumColumn = 264 * Math.max(1, fontScale) + 32;
  if (preferred === 'below' || availableColumn < minimumColumn || fontScale > 1.3) {
    return { position: 'below', columnWidth: Math.max(0, width - 40) };
  }
  return { position: preferred, columnWidth: Math.min(360, availableColumn) };
}
