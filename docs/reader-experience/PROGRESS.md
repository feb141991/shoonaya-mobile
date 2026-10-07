# Reader Experience — progress log

Branch: `reader-experience` (worktree `.claude/worktrees/reader-experience`),
cut from local `main` at `8747d9b`. Plan: `docs/READER_EXPERIENCE_GRAND_PLAN.md`.
Nothing on this branch is pushed. Run in the user's absence (approved
2026-10-07: separate branch, test per phase + full pass at the end, background
audio included).

## Status

| Phase | Status | Commits |
|---|---|---|
| 0. Baseline | done | 299fbe0 |
| 1. Immersive controls | done | (this commit) |
| 2. Paper themes | done | cf337b1 (wip) + (this commit) |
| 3. Resume | done | (this commit) |
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
3. **The control capsule is solid, not glass.** It first copied the floating
   nav's translucent glass, but it floats over body text and the text showed
   through (`dv-pair` check). It uses the card colour (`COLORS.cardBg*`) with
   the nav's glass border and floating shadow.
4. **Speed moved into the "Aa" sheet**, and the language button cycles through
   the available languages on tap (EN → हिंदी → …). Keeps the capsule at five
   controls (− + listen language Aa), all 44 pt, which fits a 320 pt-wide phone.
5. **Hint waits for the existing reader intro.** The one-time "tap the page"
   hint shows only once `shoonaya_reader_intro_seen` is set, so the two never
   stack; a user who has not seen the intro gets the hint on a later visit.
6. The floating gear at top-right in every baseline screenshot is the Expo
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
| Dharm Veer (`sri-krishna`) | 205 pt | 21% |
| Stotram (`ganesha-pancharatnam`) | 312 pt | 33% |
| Katha (`katha-ekadashi-margashirsha-shukla`) | 247 pt | 26% |
| Vrat (`ekadashi`) | 205 pt | 21% |
| Festival (`diwali`) | 205 pt | 21% |

(Corrected in Phase 1: the first version of `reader-measure.py` sampled the
left edge, where a decorative glow reaches ~208 pt; it now samples the right
edge. Numbers above are re-measured from the same baseline screenshots.)

Also observed:
- Collapsed bottom-nav Home button overlaps reading text (all 5 screens).
- Largest text size: font-size row clipped ("++" off-screen), titles cut to
  "Sri Kris…", "Gane…".
- Panchatantra storybook and Pathshala lesson have their own control layouts
  (not ReaderShell); captured for Phase 5.

Android baseline: deferred to the end-of-run pass (emulator + Android dev build
needed; disk is at 97%, so it is done once).

## Phase 1 — Immersive controls (2026-10-07)

Built: compact top bar (back · title · ⛶ pin), floating capsule (− · + ·
listen · language · Aa), "Aa" sheet (text size, listening speed,
transliteration, meaning, copy, share), 3.5 s auto-hide with tap-to-show
(`lib/readerChrome.ts`), keep-screen-awake while a reader is focused
(`expo-keep-awake`, tagged, released on blur), one-time tap hint, per-user
reader prefs (`lib/readerPrefs.ts`, cleared at the four purge points), en/hi/pa
control text (`lib/readerCopy.ts`), bottom nav hidden on reader routes
(`lib/readerRoutes.ts`). ReaderShell's props are unchanged; no screen edited.

Measured (same method, controls showing, light, default text):

| Screen | Before | After (controls shown) | After (hidden) |
|---|---|---|---|
| Dharm Veer | 205 pt (21%) | 129 pt (13%) | 0 |
| Stotram | 312 pt (33%) | 130 pt (14%) | 0 |
| Katha | 247 pt (26%) | 130 pt (14%) | 0 |
| Vrat | 205 pt (21%) | 130 pt (14%) | 0 |
| Festival | 205 pt (21%) | 129 pt (13%) | 0 |

Checked on iOS Simulator (screenshots `p1-light-*`, `p1-dark-*`,
`p1-xxxl-*`):
- Controls hide at 3.5 s; a tap on plain page shows them; a tap on a Stotram
  verse expands the verse **and** shows the controls (never swallowed).
- "Aa" sheet opens, holds the controls visible, Done closes.
- Dark mode uses the dark palette; largest text size: no clipping (old
  header clipped "++" and titles).
- The debug build handles taps with a visible delay; screenshots taken
  immediately can show the pre-tap state. Waiting 2 s after a tap gives the
  settled result.

Not verifiable here: VoiceOver/TalkBack pinning and Reduce Motion are covered
by unit tests (`__tests__/reader-chrome.test.ts`), not by a live screen
reader; keep-awake needs a real device (the Simulator does not sleep).

Tests: 1131 passed, 1 failed, 0 skipped (`npm test`). The failure is
`__tests__/astro-engine-numerical.test.ts`, which imports the backend repo by
a relative path that does not resolve from this nested worktree location; it
passes 18/18 on the main checkout and Phase 1 touches no astrology code.
Updated two source-level tests that asserted the old header (font "--"/"++"
labels, NAV_BAR_CLEARANCE padding) to assert the same guarantees on the new
design. New: `reader-chrome` (10), `reader-shell-support` (5).

## Phase 2 — Paper themes (2026-10-07)

Built: `READER_PAPER` tokens (lib/constants.ts) for Bhojpatra, Sandhya,
Temple Night; per-user `paper` pref (auto/bhojpatra/sandhya/templeNight,
default auto: light -> Bhojpatra, dark -> Temple Night); resolver
(lib/readerAppearance.ts) + hook (lib/useReaderAppearance.ts); "Paper"
section with swatches in the "Aa" sheet; light/dark status bar per paper.

Making content follow the paper (not just the frame):
- the five reader screens read `isDark`/`theme` from useReaderAppearance()
- shared Surface/Card, Button, Screen, SacredLoader and the Dharm Veer hero
  banner read lib/readerAppearanceContext.ts: inside a reader (ReaderShell, or
  ReaderPaperScope for loading/error states) they follow the paper; everywhere
  else they follow the device exactly as before
- Panchatantra storybook page surfaces moved onto the tokens
  (docs/NATIVE_VISUAL_DEBT_MATRIX.md updated; overlay literals on artwork kept)
- reader intro "Reading Mode" text now mentions the papers

Decisions:
7. Reader controls use each paper's own accent, not the screen's brand gold
   (~2.6:1 on light paper, below the 3:1 control minimum).
8. Paper context is provided per reader screen, not at the app root: a root
   provider would recolour the screen underneath during a back-swipe.
9. Pathshala is not on the papers yet (Phase 5); its route is a reader route
   but it keeps device colours until then.

Contrast (tested in __tests__/reader-appearance.test.ts, mutation-checked):
text >= 11.5:1, dim >= 6.0:1, accent >= 4.6:1 on page.

Checked on iOS Simulator, each paper on all five readers + storybook
(`p2-bhojpatra-*`, `p2-sandhya-*`, `p2-templenight-*`). First Sandhya pass
found Vrat/Festival cards staying white with light text and the Dharm Veer
name dark-on-dark; fixed via the context above and re-verified. Simulator
left on "Auto".

Tests: npm test 1139 passed, 1 failed (astro-engine-numerical, worktree-path
only), 0 skipped. New: reader-appearance (8).

## Phase 3 — Pick up where you left off (2026-10-07)

Built: lib/readingProgress.ts (per identity, key = content id + version,
position stored as a fraction of the scrollable height so it survives
text-size changes; max 50 items / 90 days; cleared at the four purge points;
never stored when signed out). ReaderShell restores once content has laid
out (re-applied for up to 2.5 s while content grows, unless the user
scrolls), saves while scrolling (throttled 1.5 s) and on leaving, and shows
"Resumed where you left off · NN% · Start over" for 6 s. Start over scrolls
to the top and forgets the position. Positions under 5% or over 97% are not
offered (not started / finished). All five ReaderShell readers pass a
progress id; the version includes the reading language.

Decision 10: no section names in the resume prompt for now (percentage
only). Dharm Veer and Vrat become chaptered in Phase 6 and will name the
chapter then; building section tracking for their current scrolling layout
would be thrown away. Storybook and Pathshala get resume in Phase 5.

Checked on iOS Simulator (Katha): read to ~75%, left, came back -> scrolled
back to the same passage (a few lines lower) with the banner; Start over
returned to the top. Reading to the end and coming back starts at the top.

Tests: npm test 1146 passed, 1 failed (astro-engine-numerical, worktree path
only), 0 skipped. New: reading-progress (7).
