import { COLORS, READER_PAPER, SHADOWS, themeColor, type ReaderPaperKey } from '@/lib/constants';
import type { ReaderPaperChoice } from '@/lib/readerPrefs';

// Turns the reader's paper choice (Phase 2, docs/READER_EXPERIENCE_GRAND_PLAN.md)
// into colours. Pure: no React Native imports, so it is unit-tested directly.
// The hook lives in lib/useReaderAppearance.ts.
//
// Every reader screen reads `isDark` and `theme` from here instead of
// useColorScheme()/themeColor(), so its own cards and text follow the paper:
// the dark papers report isDark=true, Bhojpatra reports false, and `theme`
// keeps themeColor()'s exact shape with the paper's surfaces and ink swapped
// in. Brand colours are untouched.

/** 'auto' follows the device: light -> Bhojpatra, dark -> Temple Night. */
export function resolveReaderPaper(choice: ReaderPaperChoice, systemDark: boolean): ReaderPaperKey {
  if (choice === 'auto') return systemDark ? 'templeNight' : 'bhojpatra';
  return choice;
}

/** themeColor()'s shape with plain string values (COLORS is `as const`). */
export type ReaderTheme = { [K in keyof ReturnType<typeof themeColor>]: string };

export function readerTheme(paper: ReaderPaperKey): { isDark: boolean; theme: ReaderTheme } {
  const tokens = READER_PAPER[paper];
  const base: ReaderTheme = themeColor(tokens.isDark);
  return {
    isDark: tokens.isDark,
    theme: {
      ...base,
      bg: tokens.page,
      card: tokens.card,
      cardSoft: tokens.cardSoft,
      border: tokens.border,
      borderSoft: tokens.borderSoft,
      text: tokens.text,
      dim: tokens.dim,
      glass: tokens.bar,
    },
  };
}

/** Colours for the reader's own controls (top bar, capsule, sheet). */
export function readerControlsPalette(paper: ReaderPaperKey, accent?: string) {
  const tokens = READER_PAPER[paper];
  const dark = tokens.isDark;
  return {
    isDark: dark,
    page: tokens.page,
    bar: tokens.bar,
    barBorder: tokens.borderSoft,
    well: tokens.cardSoft,
    border: tokens.border,
    text: tokens.text,
    dim: tokens.dim,
    accent: accent ?? tokens.accent,
    onAccent: dark ? COLORS.ink : COLORS.onMediaWhite,
    glass: tokens.bar,
    capsule: tokens.card,
    glassBorder: dark ? COLORS.premiumBorderDark : COLORS.premiumBorderLight,
    shadow: dark ? SHADOWS.md.dark : SHADOWS.md.light,
    floatingShadow: dark ? SHADOWS.navFloating.dark : SHADOWS.navFloating.light,
    scrim: COLORS.celebrationScrim,
  };
}

/** `#RRGGBB` -> `rgba(r,g,b,alpha)`, for fades that must match a paper colour. */
export function withAlpha(hex: string, alpha: number): string {
  const v = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(v)) return hex;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${alpha})`;
}
