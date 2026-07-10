import { Feather } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';

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
// Why not real 3D icons yet: no PNG/WebP icon art exists anywhere in this
// repo or the web repo (checked both — web's own equivalent, SacredIcon.tsx,
// is likewise a flat inline-SVG glyph set, not 3D art; native's assets/
// directory has only Android adaptive-icon layers, nothing usable here).
// Fabricating placeholder "3D-style" icons inside this change would produce
// worse visual quality than the existing clean Feather glyphs and would have
// to be redone once real art exists — so this slice ships the *seam* only:
// an asset map keyed by feature name, empty today, with every existing
// call site's current Feather glyph preserved as an explicit, required
// fallback. The moment a real PNG/WebP lands for a given name, one line in
// ICON_ASSETS below is all that's needed — no call-site changes, no layout
// changes, per this task's "prefer static PNG/WebP assets first, do not
// introduce runtime 3D unless there is a specific interactive need" brief.
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
  | 'kosh';

// Empty by design — see file header. Populate as real static assets land,
// e.g. `japa: require('@/assets/icons/japa.webp')`.
const ICON_ASSETS: Partial<Record<SacredIconName, ImageSource>> = {};

type SacredIconProps = {
  name: SacredIconName;
  // Required, not optional: this is what every call site already rendered
  // before this component existed, so passing it is what guarantees zero
  // visual regression today rather than silently falling back to some
  // unrelated default glyph.
  fallbackGlyph: keyof typeof Feather.glyphMap;
  size?: number;
  color: string;
};

export function SacredIcon({ name, fallbackGlyph, size = 20, color }: SacredIconProps) {
  const asset = ICON_ASSETS[name];

  if (asset) {
    return (
      <Image
        source={asset}
        style={{ width: size, height: size }}
        contentFit="contain"
        accessibilityIgnoresInvertColors
      />
    );
  }

  return <Feather name={fallbackGlyph} size={size} color={color} />;
}
