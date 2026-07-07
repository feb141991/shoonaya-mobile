import type { PropsWithChildren } from 'react';
import type { ViewProps } from 'react-native';

import { Surface, type SurfaceTone } from './Surface';

type CardProps = PropsWithChildren<ViewProps> & {
  // Raises the card with a stronger shadow (SHADOWS.md instead of the
  // default SHADOWS.sm) — opt in for a card that should visually lead a
  // screen (e.g. a hero/summary card), not the default for every card.
  elevated?: boolean;
  // Passed straight through to Surface — undefined by default, so Surface's
  // own 'light' default still applies and no existing bare `<Card>` caller
  // changes behavior. Added because screens that override Card's
  // background/border via `style` for their own dark-mode theme (e.g.
  // app/sankalpa.tsx) still got Surface's *light*-preset boxShadow
  // regardless of device theme, since that shadow lives on Card's base
  // style object, before `style` is merged on top — a dark card rendered
  // with a warm light-mode shadow tint underneath it. Callers that are
  // already dark-mode-aware should pass `tone="auto"` (or an explicit
  // 'light'/'dark') to get the matching shadow too.
  tone?: SurfaceTone;
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
