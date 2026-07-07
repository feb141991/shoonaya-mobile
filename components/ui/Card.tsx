import type { PropsWithChildren } from 'react';
import type { ViewProps } from 'react-native';

import { Surface } from './Surface';

type CardProps = PropsWithChildren<ViewProps> & {
  // Raises the card with a stronger shadow (SHADOWS.md instead of the
  // default SHADOWS.sm) — opt in for a card that should visually lead a
  // screen (e.g. a hero/summary card), not the default for every card.
  elevated?: boolean;
};

// Card = Surface with card-specific defaults (24px radius, 18px padding —
// both unchanged from Card's previous hardcoded values, so no existing
// screen's card size shifts). `tone` stays at Surface's 'light' default
// deliberately: Card's own colors were always hardcoded light-only before
// this change, and at least one screen (app/(auth)/login.tsx) has no
// dark-mode handling and renders a bare `<Card>` with no style override —
// making Card dark-mode-reactive by default would have silently changed
// that screen without being asked to touch it. Every other screen already
// passes its own themed backgroundColor/borderColor via `style`, which
// still wins here (style arrays resolve left-to-right), so this is purely
// additive for them: same colors, plus the new default shadow.
export function Card({ children, style, elevated = false, ...props }: CardProps) {
  return (
    <Surface
      variant={elevated ? 'elevated' : 'flat'}
      radius="xl"
      style={[{ padding: 18 }, style]}
      {...props}
    >
      {children}
    </Surface>
  );
}
