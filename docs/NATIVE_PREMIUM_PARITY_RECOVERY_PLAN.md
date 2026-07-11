# Native Premium Parity Recovery Plan

Date: 2026-07-11

Goal: bring the native app back to PWA-quality parity without drifting into
one-off cosmetic patches.

## Non-negotiable guardrail

Native owns experience. Shared platform owns truth.

- Calendar, panchang, sacred text, completion truth, and content rotation must
  come from shared packages, Supabase, or web API routes.
- Native screens may improve layout, movement, haptics, and presentation, but
  must not invent a second date/content engine.
- Each slice must end with typecheck and a concrete final report.

## Current critical findings

| Area | Finding | Correction |
| --- | --- | --- |
| Calendar | Nag Panchami 2026 had three competing dates: stale fallback `2026-07-28`, live DB `2026-07-18`, and verified panchang source `2026-08-17`. | Shared calendar rule now needs the later Shravana Shukla Panchami candidate; DB row needs migration. |
| Navigation | `Panchang`, `Rashiphal`, and `Kundali` routes exist, but they are not clearly surfaced as one Jyotish/Panchang access area. | Add a concise hub/menu entry without overloading bottom nav. |
| Shloka | Native page is functional but not PWA-level: carded, plain, and less ceremonial. | Rebuild as seamless sacred reader with ceremony, share, source, and soft motion. |
| Nitya | Native hub has raw phase gradients and a detached hero style. | Rebuild around the Home visual system: borderless phase scene, better cards, tokenized colors. |
| Dharm Veer | Poster is still emoji-first and does not feel like artwork. | Replace with richer tradition-aware poster art using SVG/gradient motifs and better detail hierarchy. |
| Tokens | Several screens still use local color decisions instead of Home-level tokens. | Sweep screen-by-screen, not blanket replace. |
| Motion | Motion exists in pockets but not as a consistent native system. | Add reusable motion/haptic patterns and apply them to key screens. |

## Execution slices

### Slice 1 — Calendar correctness

Status: complete and live-DB verified.

- Fix Nag Panchami rule selection in the shared calendar engine.
- Correct stale fallback data.
- Add and push a Supabase migration for the already-materialized 2026 row.
- Verify live DB row after push.

Evidence:

- Web commit `5551678` updates the calendar rule engine to choose the later
  Shravana Shukla Panchami candidate for Nag Panchami 2026.
- Supabase migration
  `20260711155207_fix_nag_panchami_2026_date.sql` was applied with
  `supabase db push`.
- Live `observance_occurrences` and legacy `festivals` rows now show
  `2026-08-17`, reviewed/verified/high confidence.

### Slice 2 — Jyotish/Panchang access

Status: complete.

- Add a clear native access surface for `Panchang`, `Rashiphal`, and `Kundali`.
- Do not add a sixth bottom tab.
- Keep route resolution typed and verified.

Evidence:

- Native commit `d52a5dd` adds a Home `Jyotish & Panchang` row linking to
  `/panchang`, `/rashiphala`, and `/kundali`.
- The bottom tab hierarchy is unchanged.
- Native typecheck passes.

### Slice 3 — Shloka premium rebuild

Status: complete at code/build level; authenticated visual QA still pending.

- Match PWA sacred reading hierarchy: seamless surface, source, meaning,
  transliteration, streak/seva, share, and completion ceremony.
- Use existing `ConfettiOverlay`, `ShoonayaShareCard`, haptics, and tokens.
- Remove the "basic card page" feel.

Evidence:

- Native commit `a349d2b` rebuilds `app/shloka.tsx` with a borderless
  ambient surface, source/meaning/transliteration hierarchy, streak row,
  confetti celebration, haptics, and PNG share card capture.
- Native typecheck passes and local release APK builds.

### Slice 4 — Nitya premium rebuild

Status: complete at code/build level; authenticated visual QA still pending.

- Replace raw phase color literals with named tokens or a small phase palette.
- Make the hero borderless and seamless with the page background.
- Improve dincharya/ashrama cards and completion affordances.

Evidence:

- Native commit `dc2017f` rebuilds `app/nitya-karma.tsx` around the Home visual
  system: borderless ambient backdrop, tokenized phase content, larger
  practice card, progress ring, and premium secondary rows.
- Native typecheck passes and local release APK builds.

### Slice 5 — Dharm Veer artwork rebuild

Status: complete at code/build level; authenticated visual QA still pending.

- Upgrade `DharmVeerPoster` away from emoji-first rendering.
- Add tradition/person-relevant motifs where available from roster metadata.
- Keep the canonical roster and route-by-id behavior intact.

Evidence:

- Native commit `d0c81da` upgrades `components/dharm-veer/DharmVeerPoster.tsx`
  with tradition-aware gradients, grain/vignette, nested borders, and
  hero-relevant vector motifs such as bow, peacock, sun, Sikh light lines,
  lotus, Buddhist mountain/path, and mandala.
- Route-by-id files remain intact and native typecheck passes.

### Slice 6 — App-wide token and animation sweep

Status: partially complete; broader sweep remains.

- Screen-by-screen token adoption for routes that still look dull or old.
- Add reusable motion primitives for card entrance, press, success, and sheets.
- Respect reduced motion and keep animation meaningful.

Evidence:

- Native commit `a5a9050` aligns Home quick rows, Rashiphala, and Kundali with
  existing premium/PWA-derived tokens.
- Shloka and Nitya now use meaningful press/celebration motion locally.

Remaining:

- Broader token/motion cleanup is still needed for screens outside this pass,
  especially My Progress subpages, Ashrama, Mandali/Tirtha sheet scrims, and
  some content-data accent palettes.
- No reusable motion primitive has been adopted app-wide yet.

### Slice 7 — Local build and AVD QA

Status: partially complete.

- `npm run typecheck`
- `npx expo-doctor`
- local release APK build
- install on AVD
- visually smoke Home, Shloka, Nitya, Dharm Veer, Panchang/Jyotish routes.

Evidence:

- `npm run typecheck` passes.
- `npx expo-doctor` passes `21/21`.
- Local release build succeeds:
  `android/app/build/outputs/apk/release/app-release.apk`.
- APK SHA256:
  `9fd82f746e111a6373db0bdccb73ef1606ac7f08719f497e818d5ed8d04a63c7`.
- The APK installed once on `emulator-5554`, launched successfully, and logcat
  showed no app fatal crash.
- Captured login screenshot:
  `/tmp/shoonaya-qa/native-start.png`.

Remaining:

- Authenticated visual smoke for Home, Shloka, Nitya, Dharm Veer, and
  Panchang/Jyotish routes is still unverified because the AVD has no signed-in
  session and subsequent AVD restarts did not attach reliably to `adb`.

## Deferred explicitly

- No EAS build unless requested.
- No bottom-nav restructuring toward Kul until Kul exists natively.
- No new calendar source unless it becomes part of the shared calendar audit.
