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
| 4. Listening | code complete; real-device background check pending | (this commit) |
| 5. Pathshala + Panchatantra | done | (this commit) |
| 6. Chapters (Dharm Veer, Vrat) | done | (this commit) |
| 7. Quote cards | done | (this commit) |
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

## Phase 4 — Listening (2026-10-07)

Built: opt-in background playback and lock-screen controls for reader audio;
Stotram verse-follow with active-verse highlighting, automatic scrolling and
prefetch of the next verse; standalone 1×/11×/21×/108× repeat counts; and the
approved 15-minute, 30-minute and end-of-recitation sleep choices. Katha audio
also opts into background playback. Repeat state remains local and writes
nothing to Japa, karma or streaks.

Review fixes before commit:
- a focus-invalidated audio request now reports that playback never began, so
  a reader left during TTS generation cannot publish a stale playing state
- the unplanned 60-minute sleep option was removed
- the new ReaderShell ref assignment no longer uses an `any` cast

Verified against the Expo SDK 57 audio contract: background playback is
enabled by the config plugin, the audio mode uses `shouldPlayInBackground`,
and Android playback activates lock-screen controls with `doNotMix`.

Tests: targeted reader/listening suites 43 passed, 0 failed, 0 skipped;
TypeScript passed. Full `npm test`: 1158 passed, 1 failed, 0 skipped. The one
failure remains the known nested-worktree path in
`astro-engine-numerical.test.ts`; it cannot resolve the adjacent backend repo.

Still required before release sign-off: rebuild the native binaries and prove
lock-screen/background continuation plus timer stop on physical Android and
iOS devices. Simulator or unit tests do not establish background delivery.

## Phase 4 — Listening (2026-10-07/08)

Built:
- Stotram "Listen" recites verse by verse from the open verse: each verse is
  opened, highlighted (accent border + tint) and scrolled into view; the next
  verse's audio is prefetched while the current one plays (no silent gap,
  which would let iOS suspend the app when locked). Status "Verse 2 of 5" /
  "Recitation 3 of 11 · Verse 2 of 5" above the capsule.
- Repeat counter (decision D3, standalone): 1× / 11× / 21× / 108× whole
  recitations, also for stotrams with a recorded track. Writes nothing.
- Sleep timer in "Aa": Off / 15 min / 30 min / After this recitation (Stotram).
  Stops via the same Listen control.
- Background playback: app.json `enableBackgroundPlayback: true` (iOS
  UIBackgroundModes audio; Android FOREGROUND_SERVICE_MEDIA_PLAYBACK), but
  opt-in per playback (`useAudioPlayer` options): only reader listening
  (Stotram, Katha) asks for it, with lock-screen title; Japa and other audio
  unchanged. Lock-screen controls cleared when playback ends/stops.
- `useReaderControls`: `playTTS` (never toggles), `prefetchTTS`, rotating cache
  files; existing 2,800-char limit and cache write kept.

Edits from another session ("Shoonaya App (fork)") landed in this worktree
during Phase 4 and are kept: sleep timer limited to the plan's 15/30/after
choices (I had added 60 min); `loadAndPlay` returns whether playback started so
a focus-cancelled play never shows "playing" (+ test). Messaged that session
to coordinate.

Checked on iOS Simulator with a fresh build of this branch (Debug 1.0.0 (7),
UIBackgroundModes = audio): verse 1 -> 2 auto-advance with highlight and
scroll; app sent Home on verse 1, back after 60 s -> recitation had continued
through verse 5 and finished. Found/fixed: Listen button spinner invisible on
the active (accent) button. "Aa" sheet shows Repeat and Sleep sections.
Not proven: lock-screen playback on a real phone (Simulator is not enough),
Android background service.

Incidents: a Shoonaya crash report at 14:31:06 (EXC_BREAKPOINT in Expo's
ExpoFabricView initializer while mounting a native view) during the switch
from the old to the new build/bundle; did not recur. The simulator device
itself shut down once during a background test (not an app crash); rebooted
and re-ran the test successfully.

Native project: `npx expo prebuild -p ios` regenerated the worktree's ios/
(gitignored); `pod install` needed `LANG=en_US.UTF-8` and
`SDKROOT=<Xcode MacOSX26.5.sdk>` because the Command Line Tools' macOS 27 SDK
is unreadable by Xcode 26.5's linker.

Tests: npm test 1158 passed, 1 failed (astro-engine-numerical, worktree path
only), 0 skipped. New: recitation (7), reader-listening (5).

## Phase 5 — Pathshala + Panchatantra storybook (2026-10-08)

Built:
- `components/reader/usePagedResume.tsx`: resume + keep-awake for paged
  readers. Restores a saved page once per content+version, saves on every page
  move, forgets the position on the last page (= finished). Shows "Resumed
  where you left off · Scene 3 · Start over" for 6 s. Same per-identity store,
  bounds and sign-out purge as Phase 3 (`lib/readingProgress.ts`,
  `isResumablePage`).
- Panchatantra storybook: progress id `story:<katha id>`, version = reading
  language. Its page surfaces were already on the paper tokens (Phase 2).
- Pathshala lesson: progress id `pathshala:<pathId>:<lessonIndex>`, version =
  reading language; the whole screen now renders inside `ReaderPaperScope` and
  takes its colours from `useReaderAppearance()` (Bhojpatra / Sandhya /
  Temple Night, following the reader paper pref).
- Copy: `sceneLabel` / `verseLabel` in en/hi/pa.

Decisions:
- **Pathshala and the storybook keep their own controls** (no ReaderShell
   capsule). Both already have page navigation, language and size controls
   designed for paging; adding the capsule would duplicate them.
- **No interlinear word-by-word for Pathshala.** Its "word by word" is an
   AI-explain output, not sourced per-word glosses; presenting it as an
   interlinear would imply a source it does not have (AGENTS.md §3).

Checked on iOS Simulator (worktree Debug build 1.0.0 (7), Metro :8082):
- Storybook "The Crane and the Crab": to scene 3, app relaunched, reopened ->
  scene 3 with the resume pill (`p5-story-resume.jpg`).
- Pathshala "Bhagavad Gita — Foundations" lesson 1 (already completed, so no
  progress write): verse 4, back, reopened -> verse 4 + pill
  (`p5-pathshala-resume.jpg`); "Start over" -> verse 1 and position cleared.
- Pathshala in dark mode on Temple Night (`p5-pathshala-templenight.jpg`).

Incident: opening the storybook by deep link while the dev client was still
connecting crashed with `ExpoFabricView.swift:197: Fatal error: The app context
has been lost` (same signature as the 14:31:06 report). It is the dev client
mounting a native view across a JS-runtime reload, not reader code: with the
bundle loaded first, the same deep link and screen open normally (repeated
twice). Recheck on a release build in the final pass.

Tests: npm test 1160 passed, 1 failed (astro-engine-numerical, worktree path
only), 0 skipped. TypeScript passed. New: reading-progress paged-resume tests.

## Phase 6 — Chapter layout for Dharm Veer and Vrat (2026-10-08)

Built:
- ReaderShell `chapterLayout` prop: one chapter per page with a "Chapter 2 of
  5" header and dots, Previous / "Next · <chapter>" at the end of the chapter,
  horizontal swipe (`chapterSwipe`; never from the left screen edge, which is
  the system back gesture), the screen-reader announcement of the new chapter,
  and resume by chapter + position in it (`isResumableChapterPosition`).
  Positions are stored under `<version>:chapters` so a one-page position is
  never applied inside a chapter.
- "Aa" → Layout: Chapters / One page (reader pref `layout`, default Chapters,
  per identity like the paper choice). One page is the previous screen,
  unchanged.
- `lib/readerChapters.ts`: chapters only from existing fields, fixed order,
  only when the field has text.
  - Dharm Veer: Journey · Test of Dharma · Wisdom · Living Legacy (when
    present) · Essence. The hero banner opens chapter 1. The quote and
    canonical sources close Essence. Ask Dharma Mitra and Share reflection end
    the last chapter.
  - Vrat: Significance · Practice & Fasting Rules · Do's & Don'ts · Mantra ·
    Vrat Katha. The date / observe / Around-the-World cards open chapter 1.
    The katha is the linked katha's own paragraphs and phal, from the same
    endpoint and cache as the Katha reader (`hooks/useLinkedKatha.ts`). The
    chapter appears only once the katha has text, and it is also added at the
    end of One page so both layouts carry the same content. Date and parana
    still come only from the canonical occurrence data; nothing is derived.
- A chapter whose translation does not exist shows English with an
  "English" tag in the chapter header. Today this happens when the app
  language is Punjabi and a hero has no Punjabi text (61 heroes); no hero
  offers a partial Hindi/Punjabi toggle.

Decisions:
- **Chapters is the default layout**, with One page one tap away in "Aa".
  The user asked for the chapter layout; keeping One page avoids removing the
  reading mode people already have.
- **Vrat katha also shows in One page.** It is existing content linked by
  `kathaId` that the screen never showed. Showing it only in Chapters would
  make the two layouts differ in content.
- Chapter-mode Vrat cards sit at the shell's 16 pt margin, aligned with the
  chapter header. One page keeps its existing nested 32 pt inset.

Checked on iOS Simulator (worktree Debug build, Metro :8082, light/Bhojpatra
and dark/Temple Night):
- Sri Krishna: chapter 1 with banner (`p6-dv-chapter1.jpg`); swipe → chapter
  2 at the top (`p6-dv-chapter2-swipe.jpg`); Next → 3; last chapter = Essence
  + quote + sources + Ask (`p6-dv-last-chapter.jpg`); swipe back → 4; left
  and reopened → chapter 4 + "Resumed … · Living Legacy"
  (`p6-dv-resume-chapter.jpg`); EN → HI kept chapter 4; "Aa" Layout section
  (`p6-layout-sheet.jpg`); One page = previous layout.
- Ekadashi: 5 chapters, chapter 1 with the cards (`p6-vrat-chapter1.jpg`);
  Vrat Katha chapter in Hindi with Phal Shruti and "Open in Katha"
  (`p6-vrat-katha-hi.jpg`, `p6-vrat-katha-templenight.jpg`).
- Not checked on device: the "English" tag (needs app language Punjabi;
  covered by unit tests), Android, VoiceOver, largest text.

Harness note: simulator taps are intermittently dropped (also seen before
Phase 6 on the storybook's Next). Checks were repeated until each tap
registered.

Tests: npm test 1168 passed, 1 failed (astro-engine-numerical, worktree path
only), 0 skipped. TypeScript passed. New: reader-chapters (7 tests: every one
of the 76+ heroes in en/hi/pa and every vrat, chapter lists equal their
non-empty fields; swipe rule; layout rule), chapter resume rule, layout pref
parsing. Updated one source assertion in dharm-veer-localization for the
banner's `tagline={tagline || undefined}`; same behaviour, since the banner
renders a tagline only when set.

## Phase 7 — Quote cards (2026-10-08)

Built:
- "Share as card" under the Dharm Veer quote opens a sheet styled like
  "Aa". It has a live preview, Square (1080×1080) / Story 9:16 (1080×1920),
  and Share card, which opens the system share sheet.
- `ShoonayaQuoteCard` sits in `components/share/ShoonayaShareCard.tsx` and
  uses the same tradition backgrounds, motifs, borders and quiet "Shared from
  Shoonaya" footer as the existing cards (decision D4). It shows the
  wordmark, the hero's name, the quote, the attribution and the sources
  (square shows the first source; story shows up to 5 lines).
- `lib/quoteCard.ts`:
  - `dharmVeerQuoteCard` offers a card only when the hero has quote text, an
    attribution and a source. Text is used as stored. A half-translated quote
    falls back to the whole English quote; text and attribution are never
    mixed across languages.
  - `quoteCardTypography` picks the type size from text length, so nothing is
    cut. It is sized for the roster maxima: quote 178 and attribution 244
    characters.
- Coverage today: all 76 heroes qualify, in en/hi/pa. **Vrat: no cards.**
  No vrat mantra carries a source, and the plan allows cards only where one
  exists. A test fails if a mantra source is ever added without a card.

Found and fixed while verifying:
- **Every share card exported at 9× the intended pixels on iOS.** Shloka,
  Vrat, Japa and the new quote cards all use `lib/share-card.ts`. Measured
  3240×5760 and 21.1 MB for one 9:16 card: react-native-view-shot on iOS
  multiplies `width`/`height` by the screen scale. The helper now passes
  points on iOS and pixels on Android (3× the card either way). Measured
  after: 1080×1080, 2.0 MB. The helper is the only capture path (swept
  `captureRef`). Android output size is unchanged.
- The first quote card used `adjustsFontSizeToFit`. In the captured image
  the font shrank but the line height did not (tiny text, large gaps), unlike
  the on-screen preview. Replaced with length-based sizes; a test keeps
  auto-shrink and truncation out of the quote card.

Checked on iOS Simulator: Sri Krishna (Sanatan) square + story; Atisha
(Buddhist, dark card, longest quote) square preview and exported PNG
1080×1080 matching the preview; Banda Singh Bahadur (Sikh, longest
attribution) square + story; the share sheet opened from the export. Nothing
was sent. Screenshots: `p7-*.jpg`. Not checked: Jain / universal card
styles on device, Android capture size, VoiceOver.

Fixed after review (2026-10-08): the Dharm Veer page showed the **Hindi**
quote to a Punjabi reader when a hero had no Punjabi quote (61 heroes). It
also picked text and attribution separately, so they could come from
different quotes. Page and card now share `pickDharmVeerQuote`
(lib/dharm-veer.ts): the whole quote in the reader's language when it has
text and attribution, otherwise the English quote. This is the same rule as
the other Dharm Veer fields, so page and card always match.

Tests: npm test 1176 passed, 1 failed (astro-engine-numerical, worktree path
only), 0 skipped. TypeScript passed. New: quote-card (8).

## Final pass (2026-10-08)

iOS Simulator (iPhone 17 Pro Max, worktree Debug build 1.0.0 (7), current
bundle). All seven readers open on the paper themes with their Phase 1–7
features:
- Dharm Veer: chapters, swipe, resume by chapter, EN↔HI, One page, quote
  cards.
- Vrat: chapters, katha chapter in EN/HI, Temple Night.
- Stotram: capsule with Listen. Listening itself was verified in Phase 4;
  untouched since.
- Katha: resume (Phase 3).
- Festival: paper + "Educational Overview" date disclosure intact.
- Panchatantra storybook and Pathshala: resume, papers.

Android: **not tested.** The Sep 7 debug APK predates expo-insights (Sep 10)
and this branch's background-audio manifest change, so a fresh build is
required. An incremental `assembleDebug` (arm64 only) ran the disk from 9.6
GB to 2.7 GB free before the guard stopped it. This run's partial outputs
were removed (3.0 GB free now). The worktree `android/` was regenerated by
`expo prebuild` (gitignored); main's `android/` and its APKs are untouched.
Freeing disk is needed before Android can be built: e.g. the 17 GB shared
`~/.gradle/caches`, Xcode DerivedData, or old simulator builds.

Still open before release:
- Android build + smoke test.
- Real-device background audio / lock screen (Phase 4).
- VoiceOver / TalkBack, largest text, Reduce Motion on the new chapter and
  quote-card UI.
- Native-speaker review of the hi/pa control copy.
- Phase 8 (blocked on timing / word data).

Tests at the end: npm test 1176 passed, 1 failed (astro-engine-numerical,
nested-worktree path only; passes on the main checkout), 0 skipped.
TypeScript passed.
