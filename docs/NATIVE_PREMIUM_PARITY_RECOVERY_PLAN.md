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

- Fix Nag Panchami rule selection in the shared calendar engine.
- Correct stale fallback data.
- Add and push a Supabase migration for the already-materialized 2026 row.
- Verify live DB row after push.

### Slice 2 — Jyotish/Panchang access

- Add a clear native access surface for `Panchang`, `Rashiphal`, and `Kundali`.
- Do not add a sixth bottom tab.
- Keep route resolution typed and verified.

### Slice 3 — Shloka premium rebuild

- Match PWA sacred reading hierarchy: seamless surface, source, meaning,
  transliteration, streak/seva, share, and completion ceremony.
- Use existing `ConfettiOverlay`, `ShoonayaShareCard`, haptics, and tokens.
- Remove the "basic card page" feel.

### Slice 4 — Nitya premium rebuild

- Replace raw phase color literals with named tokens or a small phase palette.
- Make the hero borderless and seamless with the page background.
- Improve dincharya/ashrama cards and completion affordances.

### Slice 5 — Dharm Veer artwork rebuild

- Upgrade `DharmVeerPoster` away from emoji-first rendering.
- Add tradition/person-relevant motifs where available from roster metadata.
- Keep the canonical roster and route-by-id behavior intact.

### Slice 6 — App-wide token and animation sweep

- Screen-by-screen token adoption for routes that still look dull or old.
- Add reusable motion primitives for card entrance, press, success, and sheets.
- Respect reduced motion and keep animation meaningful.

### Slice 7 — Local build and AVD QA

- `npm run typecheck`
- `npx expo-doctor`
- local release APK build
- install on AVD
- visually smoke Home, Shloka, Nitya, Dharm Veer, Panchang/Jyotish routes.

## Deferred explicitly

- No EAS build unless requested.
- No bottom-nav restructuring toward Kul until Kul exists natively.
- No new calendar source unless it becomes part of the shared calendar audit.
