# Native Visual-System Debt Matrix

Repo scope: `/Users/Business(C)/shoonaya-mobile` only (this audit does not touch
the web/API repo).

Purpose: inventory what stands between the current native UI and "feels as
premium as the PWA, with no random per-screen styling," and record what this
pass fixed vs. deferred. This is Prompt 7 of the native migration series.

## Read order

- `lib/constants.ts` — theme tokens (`COLORS`, `FONTS`, `RADII`, `SPACING`,
  `SHADOWS`, `TYPE`, `MIN_TOUCH_TARGET`).
- `components/ui/*` — existing design-system primitives.
- `app/(tabs)/index.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/bhakti.tsx`,
  `app/(tabs)/japa.tsx`, `app/nitya-karma.tsx`, `app/panchang.tsx`,
  `app/vrat.tsx`, `app/shloka.tsx`.
- PWA `globals.css` and Home components (web repo), for the token/typography
  baseline native is meant to match — already ported into `lib/constants.ts`
  in earlier passes (see task #73/#74 in project history: full color-token
  and typography audits against the PWA).

## Debt matrix

| Category | Finding | Count | Verdict |
|---|---|---|---|
| Bare `COLORS.brandGold` | Non-theme-aware gold references; the design system already exposes `brandGoldLight`/`brandGoldDark` for correct dark-mode contrast, but 30 files still reference the flat constant directly. | 200 occurrences / 30 files | Real debt, deferred (see below) |
| Raw `rgba(...)` in UI chrome | Untokenized literals outside `lib/constants.ts`'s own token definitions and outside legitimate data files. | 9 occurrences / 6 files | Real debt, deferred (already flagged once before, in `lib/constants.ts`'s own comments) |
| Raw hex outside `constants.ts` | `#RRGGBB`/`#RGB` literals not in the token file. | 21 raw regex hits, but 19 are legitimate content data (mala bead/thread colors in `lib/mala-skins.ts`, hero-poster gradient stops in `lib/dharm-veer.ts`) and 2 are code comments in `index.tsx`, not style literals. | Not debt — false positives / content data, correctly excluded |
| `backgroundColor:'#..'` / `color:'#..'` / `borderColor:'#..'` inline literals | Direct hex string literals passed to style props (would bypass tokens entirely). | 0 | Clean |
| `TouchableOpacity` | Legacy RN touchable instead of the app's `Pressable` convention. | 0 | Clean |
| `elevation:` | Legacy Android-only shadow prop instead of the app's `boxShadow` convention. | 0 | Clean |
| `as any` | Type-safety escape hatches. | 0 | Clean |
| Flat icon candidates | Feature-identity icons rendered as flat `Feather` glyphs where the PWA's equivalent has more visual presence. | 12 named icons across Home, Bhakti, and 10 other screens (see icon inventory below) | Infrastructure fixed this pass (see Slice 1); asset population deferred |
| Inconsistent cards/surfaces | Not separately re-audited this pass — out of scope; see Slice 2 candidate below. | — | Deferred |
| Typography scale usage | Not separately re-audited this pass (already covered by task #74's full typography audit, which is why `TYPE.*` already exists and is in active use in `index.tsx`). | — | Already addressed in an earlier pass |

Raw rgba(...) file-by-file (the real, actionable 9):

- `app/(tabs)/japa.tsx:483` — `rgba(0,0,0,0.28)` (bottom-sheet scrim)
- `app/(tabs)/japa.tsx:578` — `rgba(0,0,0,0.18)`
- `app/(tabs)/profile.tsx:460` — `rgba(0,0,0,0.35)` (bottom-sheet scrim)
- `app/(tabs)/tirtha.tsx:532` — `rgba(0,0,0,0.28)` (bottom-sheet scrim)
- `app/kosh.tsx:389` — `rgba(0,0,0,0.28)` (bottom-sheet scrim)
- `app/nitya-karma.tsx:240,285` — gold-tinted panel backgrounds
- `app/sankalpa.tsx:291,380` — gold-tinted panel backgrounds

The four bottom-sheet scrims are the same debt `lib/constants.ts` already
flags in its own comments (a `celebrationScrim` token exists for one specific
use, but the general-purpose scrim value was never extracted into a shared
token, so each sheet re-types the literal).

`COLORS.brandGold` file list (30 files, 200 occurrences): `app/ai-chat.tsx`,
`app/quiz.tsx`, `app/pathshala/[pathId].tsx`, `app/auth/callback.tsx`,
`app/(auth)/whatsapp.tsx`, `app/(auth)/onboarding.tsx`, `app/(auth)/login.tsx`,
`app/(auth)/otp.tsx`, `app/notifications.tsx`,
`app/pathshala/[pathId]/[lessonId].tsx`, `app/dharm-veer.tsx`,
`app/sankalpa.tsx`, `app/kosh.tsx`, `app/panchang.tsx`, `app/nitya-karma.tsx`,
`app/vrat.tsx`, `app/settings.tsx`, `app/dharm-veer/[id].tsx`,
`app/(tabs)/pathshala.tsx`, `app/(tabs)/profile.tsx`, `app/(tabs)/tirtha.tsx`,
`app/(tabs)/japa.tsx`, `app/(tabs)/index.tsx`, `components/pathshala/PathCard.tsx`,
`components/ui/ErrorBoundary.tsx`, `components/ui/EmptyState.tsx`,
`components/ui/Button.tsx`, `components/ui/Pill.tsx`,
`components/ui/SectionHeader.tsx`, `components/tirtha/TempleCard.tsx`.

This list is large enough that a blanket find/replace across all 30 files in
one commit would be exactly the "sweep the whole app in one commit" this
task was told not to do — screen-by-screen review is needed since some of
these 200 usages are on dark, non-`theme`-driven surfaces (auth screens,
which use a fixed dark background regardless of system color scheme) where
the flat gold is actually correct as-is, not a bug. Flagged as the next slice,
not fixed here.

## 3D icon approach

Icons required: Japa, Bhakti, Pathshala, Mandali, Nitya, Panchang, Vrat,
Shloka, Dharm Veer, Quiz, Mood, Profile.

Checked both repos for existing 3D/rendered icon material before deciding
an approach:

- No 3D icon library (Lottie, Rive, Spline, or similar) is a dependency in
  either repo's `package.json`.
- No pre-rendered 3D-style PNG/WebP icon assets exist in either repo. Native's
  `assets/` directory has only Android adaptive-icon layers. Web's `public/`
  has app icons and unrelated hero/darshan WebP images, nothing usable as a
  feature-icon set.
- The PWA's own `src/components/ui/SacredIcon.tsx` — despite the name — is a
  hand-drawn custom inline-SVG glyph wrapper (a ~30-name union), not actual
  3D or rendered art. It is not a source of 3D assets to port.

Decision: static app-owned PNG/WebP assets, per the task's stated preference,
with no runtime 3D introduced (no specific interactive need was identified
that would justify it — these are static feature-identity icons, not
animated or physics-driven elements).

Because no real icon art exists yet in either repo, fabricating placeholder
"3D-style" icons as part of this change would produce lower visual quality
than the existing clean Feather glyphs, and would need to be thrown away
once real art is commissioned. The safe first slice is therefore the
**seam**, not the art: a shared `SacredIcon` component with a
name-keyed asset map (empty today) that falls back to each call site's
existing Feather glyph. Populating `ICON_ASSETS` with real PNG/WebP files
later requires zero call-site changes.

## Icon inventory (12 required names)

| Name | Current render | Call sites found | This pass |
|---|---|---|---|
| `japa` | Feather `heart` | `app/(tabs)/bhakti.tsx` primary card; `app/(tabs)/index.tsx` next-practice card and practices list (when Japa is next/listed) | Migrated to `SacredIcon` |
| `bhakti` | Feather `sun` (tab bar, elevated center pill) | `app/(tabs)/_layout.tsx` | Not migrated — tab bar icon deferred to next slice |
| `pathshala` | Feather `book-open` | `app/(tabs)/_layout.tsx` (tab bar); `app/(tabs)/index.tsx` practices list | Practices-list instance migrated (shared code path with `japa`/`nitya`/`quiz`/`dharmveer`); tab bar instance deferred |
| `mandali` | Feather `users` | `app/(tabs)/_layout.tsx` (tab bar) | Not migrated — tab bar icon deferred |
| `nitya` | Feather `sunrise` | `app/(tabs)/bhakti.tsx` "More devotion" list; `app/(tabs)/index.tsx` practices list | Migrated to `SacredIcon` |
| `panchang` | Feather (various, screen-level header icon in `app/panchang.tsx`) | `app/panchang.tsx` | Not migrated — screen-level, deferred |
| `vrat` | Feather (screen-level header icon in `app/vrat.tsx`) | `app/vrat.tsx` | Not migrated — screen-level, deferred |
| `shloka` | Feather (screen-level icon in `app/shloka.tsx`) | `app/shloka.tsx` | Not migrated — screen-level, deferred |
| `dharmveer` | Feather `shield` | `app/(tabs)/bhakti.tsx` "More devotion" list; `app/(tabs)/index.tsx` Dharm Veer card and practices list | Migrated to `SacredIcon` |
| `quiz` | Feather (varies by call site, server-driven glyph name from `/api/native/home-summary`) | `app/(tabs)/index.tsx` practices list (when Quiz is listed) | Migrated to `SacredIcon` (shared practices-list code path) |
| `mood` | No native screen yet (see `docs/NATIVE_MOOD_PARITY_PLAN.md`) | None — Mood is not yet implemented in native | N/A — nothing to migrate until Mood ships |
| `profile` | Feather (tab bar entry is `href: null`, reached via avatar) | `app/(tabs)/profile.tsx` header | Not migrated — deferred |

5 of 12 names now render through `SacredIcon` at every call site the Home
and Bhakti screens use (`japa`, `nitya`, `dharmveer`, `pathshala`, `quiz` —
the last two only where the shared practices-list row renders them). 7
remain on direct `Feather` calls, listed above as deferred.

## What changed this pass

1. **New file** `components/ui/SacredIcon.tsx` — a `SacredIconName` union of
   all 12 required names, a component that renders from a name-keyed
   `ICON_ASSETS` map (currently empty) and falls back to a required
   `fallbackGlyph` Feather name when no asset exists. Zero visual change
   today: every call site still renders the exact same Feather glyph it did
   before, because `ICON_ASSETS` has no entries yet.
2. **`app/(tabs)/index.tsx`** — 3 call sites converted from raw `<Feather>`
   to `<SacredIcon>`: the next-practice hero card icon well, the practices
   list icon well (shared row renderer, covers Japa/Nitya/Pathshala/Quiz/
   Dharm Veer depending on server data), and the Dharm Veer card icon well.
3. **`app/(tabs)/bhakti.tsx`** — 2 call sites converted: the primary Japa
   card icon well, and the "More devotion" list icon well (now carries an
   explicit `id: SacredIconName` field per item instead of only `icon`, so
   Nitya Karma and Dharm Veer resolve to `'nitya'`/`'dharmveer'`).

No other files were touched. No dependency changes, no asset files added
(`ICON_ASSETS` is intentionally empty), no changes to `lib/constants.ts` or
any other screen.

## What remains (deferred, not started)

- Populate `ICON_ASSETS` once real static icon art exists for any of the 12
  names — purely additive, no call-site changes needed.
- Migrate the remaining 7 icon call sites: tab bar (`bhakti`, `pathshala`,
  `mandali` tab icons — `japa`/`nitya`/`dharmveer` tab-bar-adjacent instances
  are already covered via the Home/Bhakti screens, but the tab bar itself in
  `_layout.tsx` was not touched), `panchang.tsx`, `vrat.tsx`, `shloka.tsx`
  screen-level icons, and `profile.tsx`'s header icon.
- `COLORS.brandGold` → theme-aware token sweep across 30 files (200
  occurrences) — needs per-screen review, not a blanket replace, since some
  usages are on fixed-dark auth surfaces where the flat value is correct.
- The 9 remaining raw `rgba(...)` UI-chrome literals — 4 are the
  already-known bottom-sheet-scrim debt (`kosh.tsx`, `tirtha.tsx`,
  `japa.tsx`, `profile.tsx`); a shared scrim token should absorb all four
  plus the `japa.tsx:578` variant. The other 4 (`nitya-karma.tsx` x2,
  `sankalpa.tsx` x2) duplicate the existing `COLORS.homeSoftLight`/
  `homeSoftDark` token pair and should switch to it rather than staying as
  literals.
- Cards/surfaces consistency audit and a fresh typography-scale-usage
  re-check were not re-run this pass (typography was already covered by an
  earlier dedicated audit); flagged here only as unfinished scope items if
  the next slice wants to re-verify them.
- Task #75 in the project's own tracker ("Sweep native screens for
  hardcoded values that should use updated tokens") is the same class of
  work as the two bullets above and remains open — this pass did not fold
  it in, per this task's own "implement only the first safe slice" / "do
  not sweep the whole app in one commit" instructions.

## Verification performed

- `npm run typecheck` — clean, no errors.
- `rg -n "backgroundColor: '#|color: '#|borderColor: '#|as any|TouchableOpacity|elevation:" app components lib` — zero matches (confirms the app has no inline hex style literals, no legacy touchables, no legacy elevation shadows, and no `as any` casts, before or after this change).
- Manual re-derivation of the `COLORS.brandGold` (200/30 files), raw `rgba(` (96 total / 9 real UI-chrome), and raw hex (21 total / 2 false-positive comments, 19 legitimate content data) counts via targeted `rg` passes, cross-checked against file contents to exclude data files (`lib/mala-skins.ts`, `lib/dharm-veer.ts`) and comments from the debt totals.
- Screenshots: not available. This session runs in a sandboxed environment with no Android Virtual Device or iOS Simulator attached, so no on-device visual verification could be captured. The change is icon-well-content-only (same container, same size, same color prop) and is covered by the typecheck pass plus manual reasoning that `ICON_ASSETS` being empty makes every affected render path identical to its pre-change output.
