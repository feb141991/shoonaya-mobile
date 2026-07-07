import type { PropsWithChildren } from 'react';
import { useColorScheme, View, type ViewProps } from 'react-native';

import { COLORS, RADII, SHADOWS } from '@/lib/constants';

// Lowest-level themed container primitive. Card is now built on top of this
// (Card = Surface + card-specific padding/radius defaults) so the two never
// duplicate their own bg/border/shadow logic.
//
// `tone` controls whether colors are fixed or follow the system color
// scheme:
//   - 'light' (default) — always the light palette, regardless of device
//     theme. This matches every existing bare `<Card>` usage today (Card's
//     own colors were previously hardcoded light-only), so defaulting here
//     to 'light' keeps that behavior unchanged.
//   - 'dark' — always the dark palette.
//   - 'auto' — follows useColorScheme(). Opt in explicitly once a screen is
//     ready for it; not the default, because at least one existing screen
//     (app/(auth)/login.tsx) has no dark-mode handling at all and is
//     apparently deliberately light/cream-branded regardless of system
//     theme — flipping bare Card/Screen defaults to 'auto' would have
//     silently changed that screen's look without being asked to touch it.
export type SurfaceTone = 'light' | 'dark' | 'auto';
export type SurfaceVariant = 'flat' | 'soft' | 'elevated';

type SurfaceProps = PropsWithChildren<ViewProps> & {
  tone?: SurfaceTone;
  variant?: SurfaceVariant;
  radius?: keyof typeof RADII;
  bordered?: boolean;
};

export function Surface({
  children,
  style,
  tone = 'light',
  variant = 'flat',
  radius = 'xl',
  bordered = true,
  ...props
}: SurfaceProps) {
  const systemIsDark = useColorScheme() === 'dark';
  const isDark = tone === 'auto' ? systemIsDark : tone === 'dark';

  const backgroundColor =
    variant === 'soft'
      ? isDark
        ? COLORS.surfaceSoftDark
        : COLORS.surfaceSoftLight
      : isDark
        ? COLORS.cardBgDark
        : COLORS.cardBgLight;

  const borderColor = isDark ? COLORS.borderDark : COLORS.borderLight;
  // 'soft' surfaces are a recessed/nested background layer, not a raised
  // card, so they carry no shadow; 'elevated' gets more lift than the
  // default 'flat' card shadow.
  const shadow = variant === 'elevated' ? SHADOWS.md : variant === 'soft' ? SHADOWS.none : SHADOWS.sm;

  return (
    <View
      style={[
        {
          borderRadius: RADII[radius],
          backgroundColor,
          borderWidth: bordered ? 1 : 0,
          borderColor,
        },
        shadow,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
