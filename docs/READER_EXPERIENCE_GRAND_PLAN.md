# Reader Experience — Grand Plan

Status: planned, not started. Written 2026-10-07. Native only (the PWA is no
longer maintained; backend changes, where needed, are called out).

Goal: make long-form reading in Shoonaya feel like a calm, book-like folio —
more of the screen for the text, controls within thumb reach and out of the
way, comfortable paper tones, listening that follows the verse, and the
reader always able to pick up where they left off.

---

## 1. Decisions already made

| # | Decision | Choice |
|---|---|---|
| D1 | How controls hide | **Auto-hide after 3.5 s of no interaction**; a tap on the page shows them again |
| D2 | Paper themes | **All three**: Bhojpatra (parchment), Sandhya (twilight), Temple Night |
| D3 | Repeat counter (11× / 21× / 108×) | **Standalone** in the reader; does **not** count toward Japa, streak or karma |
| D4 | Quote cards | **Quiet "Shared from Shoonaya" mark**, matching the existing share cards |
| D5 | Chapter layout for Dharm Veer and Vrat | **In scope** (Phase 6) |

## 2. Facts this plan is built on (verified in the code, 2026-10-07)

- `components/reader/ReaderShell.tsx` (558 lines) is used by **5 screens**:
  Dharm Veer `app/dharm-veer/[id].tsx`, Stotram `app/bhakti/stotram/[id].tsx`,
  Katha `app/bhakti/katha/[id].tsx` (non-Panchatantra), Vrat `app/vrat/[slug].tsx`,
  Festival `app/festival/[slug].tsx`. Its header holds: back, title, listen
  (0.75/1/1.25×), copy, share, font steps, language, transliteration and
  meaning toggles.
- **Not** on ReaderShell: the Panchatantra storybook
  (`components/reader/PanchatantraStorybookView.tsx`, has its own hard-coded
  parchment colours) and Pathshala lessons
  (`app/pathshala/[pathId]/[lessonId].tsx`, has its own font scale and
  `word_by_word` data).
- `components/home/FloatingDharmaScroll.tsx` is a Home card, not a reader —
  **out of scope**.
- Stotram already shows each verse's Sanskrit, transliteration and meaning
  together (tap-to-expand per verse). Verses are tap targets.
- Listening: Stotram generates speech per verse on the server
  (`quality: 'pandit'`), or plays a recorded track (`lib/devotional-audio.ts`,
  Wikimedia). **Neither provides line/word timing.**
- `app.json`: `expo-audio` has `"enableBackgroundPlayback": false` → audio
  stops when the screen locks or the app is backgrounded.
- `expo-keep-awake` is installed.
- Dharm Veer (`lib/dharm-veer.ts`, 76 heroes): every hero has `journey`,
  `trial`, `teaching`, `moral`, optional `legacy`, a `quote {text, attribution}`
  and `sourceCitations`; 33 have an `illustrationPrompt`. All have hi/pa fields.
- Vrat (`lib/vrat-data.ts`, `app/vrat/[slug].tsx`): headed sections
  Significance, Practice Rules, Do's, Don'ts, Mantra; some vrats link a katha
  via `kathaId`.
- Share cards: `lib/share-card.ts` + `components/share/ShoonayaShareCard.tsx`
  (footer "Shared from Shoonaya"), already used by Shloka, Name Story, Dyuta.

## 3. Rules every phase follows

- **Content integrity:** no new scripture, quotes, translations, word
  meanings or chapter splits are generated. Chapters follow existing headed
  sections or existing paragraph breaks only. Quote cards use only
  `quote` + `attribution` that already exist with source citations.
- **Styling:** every colour/radius/shadow from `lib/constants.ts`; reader paper
  themes are added there as named tokens. Use `PressableSurface`, `TYPE.*`,
  `SacredIcon` where assets exist.
- **Accessibility (non-negotiable):** with VoiceOver/TalkBack on, controls
  never auto-hide; with Reduce Motion on, they appear/disappear without
  sliding; every control ≥ 44 pt; the capsule works at the largest text size;
  the system back gesture/button always works even when controls are hidden.
- **Caches:** anything stored (theme, last position) is keyed by user (or
  guest) + content id + content version, and private entries are cleared on
  sign-out/account switch.
- **Claims:** no "60 fps", "less eye strain" or "more battery" claims without
  measurement. Reading-space gains are measured (Phase 0 → Phase 1).
- **Delivery:** one scoped commit per objective; tests reported as
  passed/failed/skipped; verification on iOS Simulator **and** Android emulator,
  light + dark, largest text, VoiceOver, Reduce Motion; batch pushes.

---

## 4. Phases

### Phase 0 — Baseline (no code changes)
- Screenshot the 5 ReaderShell screens + Pathshala + Panchatantra on iOS and
  Android, light/dark, default and largest text.
- Measure: header height (pt), lines of body text visible on first screen.
- Output: `docs/reader-baseline/` screenshots + a table in this file.

### Phase 1 — Immersive controls in ReaderShell (D1)
Scope:
- **Compact top bar:** back · title · ⛶ (pin controls on/off). Copy and share
  move into the "Aa" sheet.
- **Floating capsule** (bottom, thumb zone, `theme.glass`, `RADII.pill`):
  font A⁻ / A⁺ · listen ▶ with speed · language pill · **Aa** (opens a sheet
  with transliteration, meaning, copy, share, paper theme). Max 5 controls.
- **Auto-hide:** controls visible on open; hide after **3.5 s** with no
  interaction. Any touch on a control, or an active listen/sheet, resets the
  timer. A tap on an empty part of the page shows/hides them. Taps on
  interactive content (Stotram verses, links, toggles) do what they do today
  **and** show the controls — they are never swallowed.
- **⛶ pin:** keeps controls visible permanently (remembered per user).
- **First-time hint:** once per user, a small "Tap the page to show controls"
  toast.
- **Keep screen awake** while a reader is open and in the foreground
  (`expo-keep-awake`), released on leave.
- **Accessibility pinning** as in §3.
- Animation: `Animated` with native driver (opacity + translate); no new
  animation dependency.
Acceptance:
- All 5 screens use the new controls; nothing that was reachable before is
  unreachable now (checklist per screen).
- Header height and visible lines measured against Phase 0.
- Tests: timer (hides at 3.5 s, resets on interaction, never hides with
  screen reader on / when pinned), tap routing (content tap not swallowed),
  keep-awake activated/released.
Effort: L. Risk: tap-routing on Stotram verses — prototype first on Stotram.

### Phase 2 — Paper themes (D2)
Scope:
- Tokens in `lib/constants.ts`: `READER_THEMES.bhojpatra`
  (paper #F7F3E8 / ink #2A2118), `sandhya` (#131722 / #E8D8B8),
  `templeNight` (#0C0D0E / ivory), each with dim, border, accent, glass
  variants; contrast checked (body text ≥ 4.5:1, aim 7:1).
- Picker in the "Aa" sheet; default follows the app's light/dark setting
  (light → Bhojpatra, dark → Temple Night) until the user picks.
- Choice stored per user; applies to all readers.
- Move `PanchatantraStorybookView`'s hard-coded parchment colours onto these
  tokens; update `docs/NATIVE_VISUAL_DEBT_MATRIX.md`.
Acceptance: contrast test for every theme pair; all 5 readers + storybook
render in each theme (screenshots).
Effort: M.

### Phase 3 — Pick up where you left off
Scope:
- Store last position per user + content id + content version: section /
  chapter / scene index plus scroll offset.
- On return: subtle "Resuming from Trial" (or "Scene 4") prompt with "Start
  over"; auto-scroll to the position.
- Cleared on sign-out/account switch; bounded (e.g. last 50 items, 90 days).
Acceptance: tests for keying, version change discards, sign-out clears,
bound enforced.
Effort: M.

### Phase 4 — Listening
Scope:
- **Verse follow (Stotram):** highlight the verse being played (golden
  glow from tokens) and auto-advance to the next verse; scroll it into view.
  Verse-level only — no line/word highlight (no timing data exists).
- **Sleep timer:** 15 min · 30 min · End of story/stotram, next to listen.
- **Background playback:** set `enableBackgroundPlayback: true`, configure the
  audio session, show lock-screen controls. **Native change → new iOS/Android
  build**; App Store review requires real audio use in background (we have it).
- **Repeat counter (D3, standalone):** 1× / 11× / 21× / 108× for a stotram or
  verse; shows "7 of 11"; stops at target; resets when leaving. Writes nothing
  to the server; no karma/streak/Japa effect.
Acceptance: tests for advance order, sleep timer stop, counter stop at target;
real-device check that audio continues with screen locked (Simulator is not
enough for background audio sign-off).
Effort: L (background audio is the risky part).

### Phase 5 — Pathshala and Panchatantra adopt the shared pieces
Scope:
- Extract the capsule, auto-hide controller, theme and resume into shared
  modules (`components/reader/ReaderControls/*`, `lib/readerPrefs.ts`).
- Pathshala lesson: capsule + auto-hide + themes + resume; show the existing
  `word_by_word` data in an interlinear layout (original · transliteration ·
  word meanings · meaning) where present — no generated glosses.
- Panchatantra storybook: capsule + auto-hide + themes + resume (scene index).
Acceptance: per-screen reachability checklist; existing storybook and Pathshala
tests stay green.
Effort: L.

### Phase 6 — Chapter layout for Dharm Veer and Vrat (D5)
A text-first chaptered reader (page per chapter, progress dots, Prev/Next,
swipe), reusing the storybook pager pattern and Phase 1–3 pieces.

**Dharm Veer** — chapters from existing fields only, in this order:
1. Journey 2. Trial 3. Teaching 4. Legacy (when present) 5. Moral, closing on
the hero's `quote` + `attribution` with its source citations listed.
hi/pa use the existing `*Local` / `*Pa` fields; a chapter with no translation
falls back to English with a visible "English" label (never machine-filled).
Art: text-first. The 33 heroes with `illustrationPrompt` can get one image per
chapter later via `docs/artwork/panchatantra-storybook/IMAGE_SPEC.md` rules —
separate content task.

**Vrat** — chapters from existing headed sections: Significance · Practice
Rules · Do's & Don'ts · Mantra · (Katha, when `kathaId` links one — rendered
from the linked katha's own paragraphs, no new splits). Date/parana timing
stays on the canonical occurrence data and keeps its stale-data disclosure;
the chapter view never derives dates.
Acceptance: every one of the 76 heroes and every vrat renders all its
chapters with no empty page; tests assert chapter list per item equals its
non-empty fields; resume works per chapter.
Effort: L.

### Phase 7 — Quote cards (D4)
Scope:
- "Share as card" on the Dharm Veer quote (all 76 have quote + attribution)
  and on Vrat mantras that carry a source.
- Card: quote in serif, attribution, tradition glyph/emblem, "Shared from
  Shoonaya" footer (existing `ShoonayaShareCard` variants), square and 9:16.
- Only text that is explicitly a quote with attribution — Shoonaya's own
  explanations are never put on a card as someone's words.
Acceptance: tests that cards are offered only where quote + attribution +
source exist; visual check of both sizes in all traditions.
Effort: M.

### Phase 8 — Data-gated (do not start until the data exists)
- **Line/word-level recitation highlight:** needs timestamps from the speech
  service (backend change) or hand-aligned timing for recorded tracks.
- **Tap-a-word glossary** outside Pathshala: needs sourced word-by-word data.

## 5. Order and dependencies

```
Phase 0 ─▶ Phase 1 ─▶ Phase 2 ─▶ Phase 3 ─┬─▶ Phase 5 ─▶ Phase 6
                    └──────▶ Phase 4 ─────┘              └─▶ Phase 7
Phase 8: blocked on data
```
Phase 4's background-audio change needs a native rebuild; schedule it with
another native release.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Auto-hide confuses older readers ("where did the back button go?") | First-time hint; ⛶ pin; system back always works; revisit after Phase 1 with real use |
| Page taps swallowed by the HUD | Tap-routing tests; prototype on Stotram first |
| Background audio rejected or battery complaints | Only while listening; stops on sleep timer; lock-screen controls |
| Translations missing for some chapters | Visible "English" fallback label, never machine-filled |
| Scope creep into content (new chapters, images, glosses) | §3 content rules; Phase 8 gate |

## 7. Not in this plan

PWA reader; Home's Daily Dharma Scroll; generating any new spiritual content
or images (images follow the separate image spec); Japa integration of the
repeat counter (D3 chose standalone).
