# Reader Experience — progress log

Branch: `reader-experience` (worktree `.claude/worktrees/reader-experience`),
cut from local `main` at `8747d9b`. Plan: `docs/READER_EXPERIENCE_GRAND_PLAN.md`.
Nothing on this branch is pushed. Run in the user's absence (approved
2026-10-07: separate branch, test per phase + full pass at the end, background
audio included).

## Status

| Phase | Status | Commits |
|---|---|---|
| 0. Baseline | done | (this commit) |
| 1. Immersive controls | — | |
| 2. Paper themes | — | |
| 3. Resume | — | |
| 4. Listening | — | |
| 5. Pathshala + Panchatantra | — | |
| 6. Chapters (Dharm Veer, Vrat) | — | |
| 7. Quote cards | — | |
| 8. Data-gated | not started (blocked on data) | |

## Decisions made on the user's behalf

Each is the conservative choice; revisit any of them on review.

1. **Reading screens hide the bottom navigation bar.** Only Pathshala lessons
   did before. Baseline shows the collapsed bar's Home button sitting on top of
   the text on every ReaderShell screen; with a floating control capsule at the
   bottom the two would collide. Back stays on screen and via system gesture.
2. **Control labels cap their text scaling; reading text does not.** At the
   largest accessibility size the current font row runs off screen and titles
   truncate (`before-xxxl-*`). Chrome text uses `maxFontSizeMultiplier`; body
   text keeps full Dynamic Type.
3. The floating gear at top-right in every baseline screenshot is the Expo
   dev-menu button (`expo-dev-menu` FAB, development builds only) — not app UI,
   ignored.

## Phase 0 — Baseline (2026-10-07)

Device: iOS Simulator, iPhone 17 Pro Max (440×956 pt), development build
1.0.0 (7) loading this branch's JS from Metro :8082. Screenshots in
`docs/reader-baseline/` (`before-light-*`, `before-dark-*`, `before-xxxl-*`;
shrunk to 440 px JPEG).

How much of the screen the controls take before content starts (measured by
`scripts/reader-measure.py`, light mode, default text size):

| Screen | Controls end at | Share of screen |
|---|---|---|
| Dharm Veer (`sri-krishna`) | 208 pt | 22% |
| Stotram (`ganesha-pancharatnam`) | 307 pt | 32% |
| Katha (`katha-ekadashi-margashirsha-shukla`) | 253 pt | 26% |
| Vrat (`ekadashi`) | 208 pt | 22% |
| Festival (`diwali`) | 208 pt | 22% |

Also observed:
- Collapsed bottom-nav Home button overlaps reading text (all 5 screens).
- Largest text size: font-size row clipped ("++" off-screen), titles cut to
  "Sri Kris…", "Gane…".
- Panchatantra storybook and Pathshala lesson have their own control layouts
  (not ReaderShell); captured for Phase 5.

Android baseline: deferred to the end-of-run pass (emulator + Android dev build
needed; disk is at 97%, so it is done once).
