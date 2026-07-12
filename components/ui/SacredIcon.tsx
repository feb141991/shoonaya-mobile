import { Feather } from '@expo/vector-icons';
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
// Icon art: static app-owned PNG assets now live at assets/icons/ (source
// SVGs at assets/icons/src/), one per SacredIconName, hand-drawn as flat
// single-color silhouettes with transparent negative-space cutouts (e.g.
// mood's eyes/mouth, dharmveer's flame emblem) rather than true 3D/rendered
// art — no 3D icon library or pre-rendered 3D asset exists in either repo
// (see NATIVE_VISUAL_DEBT_MATRIX.md's "3D icon approach" section), and
// fabricating fake-3D placeholder art would look worse than a clean flat
// set. Rendered via expo-image with `tintColor` so the same asset still
// recolors per call site exactly like the Feather fallback did — several
// call sites render the same SacredIconName in different accent colors
// depending on context (e.g. Home's Sadhana/Community tile rows pass
// tileGold/tilePurple/etc. per practice, not always brand gold).
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
  | 'kosh'
  | 'live-darshan'
  | 'progress';

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
  kosh: require('@/assets/icons/kosh.png'),
  'live-darshan': require('@/assets/icons/live-darshan.png'),
  progress: require('@/assets/icons/progress.png'),
};

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

  if (asset) {
    return (
      <Image
        source={asset}
        style={{ width: size, height: size, tintColor: color }}
        contentFit="contain"
        accessibilityIgnoresInvertColors
      />
    );
  }

  return <Feather name={fallbackGlyph} size={size} color={color} />;
}
