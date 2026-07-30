# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Styling — match existing DNA, never invent

`lib/constants.ts` is the single source of truth: `COLORS`, `themeColor(isDark)`
(the `theme.*` object — `bg/card/border/borderSoft/text/dim/brand/brandSoft/
glass/premiumBorder/accent/earth`), `FONTS`, `TYPE`, `RADII`, `SPACING`,
`SHADOWS`. Every color, font, radius, spacing, and shadow value used anywhere
in the app should trace back to a named export in this one file — never a
fresh hex/rgba literal, never inline opacity math on top of an already-alpha
token (e.g. `opacity: 0.6` on a View whose `backgroundColor` is already
`rgba(...,0.12)` — the two multiply, silently producing ~7% effective alpha).
If a token doesn't exist yet for what you need, add it to `lib/constants.ts`
with a comment explaining where the value came from (PWA parity, an existing
sibling token, etc.) — don't invent a one-off in the component file.

**Before styling anything, grep 2-3 existing screens doing something similar
and copy their exact pattern** (colors, radius, shadow, icon treatment) rather
than deriving a new one. Concretely:
- Decorative backdrop glow/bubbles → copy `app/(tabs)/japa.tsx`'s launcher
  backdrop circles (`theme.brandSoft` + `COLORS.navGlow*Light/Dark`,
  `pointerEvents="none"`, absolutely positioned, bleeding off-edge).
- Card/surface → use the `Card` component (`components/ui/Card.tsx`,
  24px radius) or `Surface`, not a bare `View` with hand-rolled
  border/shadow, unless an existing screen's bare-View pattern is what
  you're matching.
- Icon wells / feature-identity icons → check `components/ui/SacredIcon.tsx`
  first (full-color clay-art assets exist for most features); don't drop
  back to a plain `Feather` glyph if a matching asset already exists.
- Pills/chips/buttons → match `TYPE.chip`/`TYPE.section` and the
  `PressableSurface` component, not ad hoc `Text`+`View` styling.

`docs/NATIVE_VISUAL_DEBT_MATRIX.md` inventories known, already-tracked
styling debt (untokenized rgba literals, bare `COLORS.brandGold` instead of
the theme-aware pair, etc.) — check it before "fixing" something that's
already a deliberate, deferred item there, and update it if you fix one.

If a styling change goes through more than one back-and-forth with the user
in a session, that's the signal to stop iterating on values and instead go
find the actual existing precedent to copy — say explicitly which existing
screen/pattern you matched, so it can be verified without another round
trip.

## graphify

This project has a source-scoped graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `./scripts/graphify-update-source.sh` to keep the graph current (AST-only, no API cost)
- Do not run `graphify update .` directly in this repo; it includes node_modules and produces dependency noise instead of saving tokens.
