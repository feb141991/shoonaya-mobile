import Feather from '@expo/vector-icons/Feather';
import { Image, type ImageSource } from 'expo-image';
import type { OpaqueColorValue } from 'react-native';

// Shared feature-identity icon component — the seam for the theme/3D-icon
// migration (see docs/NATIVE_VISUAL_DEBT_MATRIX.md, "3D icon approach").
//
// Every feature currently renders its identity icon as a flat Feather glyph
// inside a themed circular "icon well" (COLORS.homeIconWell{Light,Dark}) —
// see app/(tabs)/index.tsx's practice-list rows and app/(tabs)/bhakti.tsx's
// practice cards, both already using that exact container pattern. This
// component does not change that container or introduce a new visual
// language on its own; it swaps what each icon well renders, from directly
// calling <Feather> to going through this seam instead.
//
// Icon art: static app-owned PNG assets now live at assets/icons/. Newer
// route-identity assets are full-color clay-style renders; older monochrome
// assets still tint per call site exactly like the Feather fallback did.
export type SacredIconName =
  | 'japa'
  | 'bhakti'
  | 'pathshala'
  | 'mandali'
  | 'nitya'
  | 'panchang'
  | 'vrat'
  | 'shloka'
  | 'dharmveer'
  | 'quiz'
  | 'mood'
  | 'profile'
  | 'live-darshan'
  | 'progress'
  | 'ai-guide'
  | 'tirtha'
  | 'seva'
  | 'rashiphala'
  | 'kundali';

const ICON_ASSETS: Partial<Record<SacredIconName, ImageSource>> = {
  japa: require('@/assets/icons/japa.png'),
  bhakti: require('@/assets/icons/bhakti.png'),
  pathshala: require('@/assets/icons/pathshala.png'),
  mandali: require('@/assets/icons/mandali.png'),
  nitya: require('@/assets/icons/nitya.png'),
  panchang: require('@/assets/icons/panchang.png'),
  vrat: require('@/assets/icons/vrat.png'),
  shloka: require('@/assets/icons/shloka.png'),
  dharmveer: require('@/assets/icons/dharmveer.png'),
  quiz: require('@/assets/icons/quiz.png'),
  mood: require('@/assets/icons/mood.png'),
  profile: require('@/assets/icons/profile.png'),
  'live-darshan': require('@/assets/icons/live-darshan.png'),
  progress: require('@/assets/icons/progress.png'),
  'ai-guide': require('@/assets/icons/ai-guide-scroll.png'),
  tirtha: require('@/assets/icons/tirtha.png'),
  seva: require('@/assets/icons/seva.png'),
  rashiphala: require('@/assets/icons/rashiphala.png'),
  kundali: require('@/assets/icons/kundali.png'),
};

const FULL_COLOR_ASSETS = new Set<SacredIconName>([
  'japa',
  'mandali',
  'nitya',
  'panchang',
  'pathshala',
  'dharmveer',
  'quiz',
  'ai-guide',
  'progress',
  'live-darshan',
  'tirtha',
  'seva',
  'rashiphala',
  'kundali',
]);

type SacredIconProps = {
  name: SacredIconName;
  // Required, not optional: this is what every call site already rendered
  // before this component existed, so passing it is what guarantees zero
  // visual regression today rather than silently falling back to some
  // unrelated default glyph.
  fallbackGlyph: keyof typeof Feather.glyphMap;
  size?: number;
  // Matches Feather's own color prop type (string | OpaqueColorValue) —
  // widened from a plain `string` so this component is a drop-in
  // replacement at every existing Feather call site, including
  // react-navigation's tabBarIcon render prop, which types `color` as
  // ColorValue (can be an OpaqueColorValue from PlatformColor()).
  color: string | OpaqueColorValue;
};

export function SacredIcon({ name, fallbackGlyph, size = 20, color }: SacredIconProps) {
  const asset = ICON_ASSETS[name];
  const renderFullColor = FULL_COLOR_ASSETS.has(name);
  const renderedSize = renderFullColor ? Math.round(size * 1.35) : size;

  if (asset) {
    return (
      <Image
        source={asset}
        style={{ width: renderedSize, height: renderedSize }}
        tintColor={renderFullColor ? undefined : (color as string)}
        contentFit="contain"
        accessibilityIgnoresInvertColors
      />
    );
  }

  return <Feather name={fallbackGlyph} size={size} color={color} />;
}
