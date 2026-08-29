import AsyncStorage from '@react-native-async-storage/async-storage';

const HERO_SIZE_KEY = 'shoonaya_hero_size';
const FLOATING_SCROLL_POSITION_KEY = 'shoonaya_floating_scroll_position_v1';

export type HeroSize = 'standard' | 'expanded' | 'immersive';

export type HeroSizeDetails = {
  label: string;
  description: string;
  height: number;
  readabilityHeight: number;
};

export type FloatingScrollPosition = { x: number; y: number };

export const HERO_SIZE_CONFIG: Record<HeroSize, HeroSizeDetails> = {
  standard: { label: 'Standard', description: 'Balanced view', height: 420, readabilityHeight: 242 },
  expanded: { label: 'Expanded', description: 'More room for artwork', height: 525, readabilityHeight: 303 },
  immersive: { label: 'Immersive', description: 'Largest sanctuary view', height: 630, readabilityHeight: 363 },
};

export const DEFAULT_HERO_SIZE: HeroSize = 'standard';

export async function getHeroSize(): Promise<HeroSize> {
  try {
    const raw = await AsyncStorage.getItem(HERO_SIZE_KEY);
    return raw === 'standard' || raw === 'expanded' || raw === 'immersive' ? raw : DEFAULT_HERO_SIZE;
  } catch {
    return DEFAULT_HERO_SIZE;
  }
}

export async function setHeroSize(size: HeroSize): Promise<void> {
  try {
    await AsyncStorage.setItem(HERO_SIZE_KEY, size);
  } catch {
    // Device-local preference is best effort.
  }
}

export function maxFloatingScrollY(
  screenHeight: number,
  insetBottom: number,
  navClearance: number,
  anchorSize: number,
): number {
  return Math.max(140, screenHeight - anchorSize - insetBottom - navClearance);
}

export function resolveDefaultFloatingScrollPosition({
  heroHeight,
  screenWidth,
  screenHeight,
  insetBottom,
  navClearance,
  anchorSize,
}: {
  heroHeight: number;
  screenWidth: number;
  screenHeight: number;
  insetBottom: number;
  navClearance: number;
  anchorSize: number;
}): FloatingScrollPosition {
  const maxY = maxFloatingScrollY(screenHeight, insetBottom, navClearance, anchorSize);
  return {
    x: Math.max(18, screenWidth - 112),
    y: Math.min(Math.max(120, heroHeight - anchorSize - 30), maxY),
  };
}

export function clampFloatingScrollPosition(
  position: FloatingScrollPosition,
  screenWidth: number,
  screenHeight: number,
  insetBottom: number,
  navClearance: number,
  anchorSize: number,
): FloatingScrollPosition {
  return {
    x: Math.min(Math.max(18, position.x), Math.max(18, screenWidth - anchorSize - 18)),
    y: Math.min(
      Math.max(120, position.y),
      maxFloatingScrollY(screenHeight, insetBottom, navClearance, anchorSize),
    ),
  };
}

export async function getFloatingScrollPosition(): Promise<FloatingScrollPosition | null> {
  try {
    const raw = await AsyncStorage.getItem(FLOATING_SCROLL_POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FloatingScrollPosition>;
    return Number.isFinite(parsed.x) && Number.isFinite(parsed.y)
      ? { x: parsed.x as number, y: parsed.y as number }
      : null;
  } catch {
    return null;
  }
}

export async function setFloatingScrollPosition(position: FloatingScrollPosition): Promise<void> {
  try {
    await AsyncStorage.setItem(FLOATING_SCROLL_POSITION_KEY, JSON.stringify(position));
  } catch {
    // Device-local preference is best effort.
  }
}
