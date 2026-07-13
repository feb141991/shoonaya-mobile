import { COLORS, RADII } from './constants';

// Single reference for every icon-well's size/color, replacing the ad hoc
// per-component wrappers this was audited from (5 different box sizes —
// 30/38/40/44/58 — across MoodCheckin, nitya-karma, bhakti.tsx, tirtha.tsx,
// index.tsx — 3 different color sources — theme.iconWell, theme.brandSoft,
// component-local constants like QuizSparkCard's quizGlow — and inconsistent
// icon-to-box ratio). See components/ui/IconTile.tsx, the component that
// consumes this file; screens should render <IconTile> rather than building
// their own View+SacredIcon pair.
//
// Icon is always 50% of the box across every size, so icon "weight" reads
// the same everywhere instead of drifting screen to screen.
export const ICON_WELL = {
  sm: { box: 36, icon: 18, radius: RADII.sm }, // list/row icons — practice rows, compact chips
  md: { box: 48, icon: 24, radius: RADII.md }, // default card leading icon
  lg: { box: 56, icon: 28, radius: RADII.md }, // hero cards — Quiz, Dincharya
  xl: { box: 72, icon: 36, radius: RADII.lg }, // tile grids — reserved; the
  // Sadhana/Community horizontal tiles (index.tsx) are a deliberate,
  // separately-tokened multi-color system (COLORS.tileGold/tilePurple/etc.)
  // and are NOT migrated onto this scale — that's a different, already-
  // consistent pattern, not the inconsistency this file fixes.
} as const;

export type IconWellSize = keyof typeof ICON_WELL;

// Fill/border for an icon well. No `accent` = the app-wide default (brand
// gold at a fixed tint, matching MoodCheckin/nitya-karma's existing
// treatment). Pass `accent` for a well that should read as belonging to a
// specific feature color (Quiz's purple, a per-practice tint) — the alpha
// suffixes (15%/28%) are fixed so no call site invents its own opacity.
export function iconWellColor(isDark: boolean, accent?: string) {
  if (accent) {
    return { bg: `${accent}15`, border: `${accent}28` };
  }
  return {
    bg: isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight,
    border: isDark ? COLORS.premiumBorderDark : COLORS.premiumBorderLight,
  };
}
