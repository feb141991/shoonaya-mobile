# Native Latest PWA Comparison

Date: 2026-07-11

Scope: latest comparison between the Shoonaya PWA and the native app after the
premium parity recovery work. This is a code/build/contract comparison plus the
current device-verification status. It is not a claim that authenticated AVD
visual QA has passed.

Device QA checklist: `docs/NATIVE_DEVICE_VISUAL_QA_CHECKLIST.md`.
Automated harness: `scripts/android-smoke-checklist.sh`.

## Summary

The native app has caught up substantially in the core launch surfaces:

- Home now has the PWA-style hero structure, panchang/observance pills,
  Brahma Muhurta prompt, first-week guide, observance carousel, next-practice
  card, Dharm Veer, mood, Jyotish/Panchang access, Sadhana, and Community
  entry points.
- Shloka is no longer a basic card page. It now has a seamless sacred reader,
  completion state, confetti, haptics, streak/seva state, and PNG share-card
  support.
- Nitya has moved from a raw/basic hub toward a Home-aligned premium hub with
  a borderless phase scene, practice progress, and the existing detailed
  dincharya/ashrama subroutes.
- Dharm Veer uses the canonical roster and route-by-id behavior, with richer
  tradition-aware poster artwork.
- The main visual system has improved through shared tokens and the
  `PressableSurface` motion primitive.

The remaining gap is verification, not implementation: the latest APK build
succeeds, and the Android smoke harness now captures all required route
screenshots, but authenticated AVD visual comparison still requires a connected
device or working emulator.

## Evidence Matrix

| Area | PWA reference | Native implementation | Current status |
| --- | --- | --- | --- |
| Home shell and hero | `src/app/(main)/home/HomeDashboard.tsx`, `src/app/(main)/home/sections/HeroSection.tsx` | `app/(tabs)/index.tsx`, `components/home/HomeSkeleton.tsx` | Code parity is strong. Device visual QA pending. |
| Next Practice | `src/components/home/NextPracticeCard.tsx` | `app/(tabs)/index.tsx` with shared `PressableSurface` | Implemented with action-first card and motion. Device tactile QA pending. |
| Brahma Muhurta | `src/components/home/BrahmaMuhurtaCard.tsx` | `components/home/BrahmaMuhurtaPrompt.tsx` | Native port exists and uses the same source data/phase logic. |
| Observances / Vrat | `src/components/home/VratCarousel.tsx`, calendar routes | `components/home/ObservanceCarousel.tsx`, `/api/calendar/upcoming` | Implemented as native snap carousel. |
| First-week guide | PWA Home first-week logic | `components/home/FirstWeekGuide.tsx` | Implemented with AsyncStorage progress/dismissal. |
| Shloka | `src/lib/shlokas.ts`, PWA Home shloka and share-card logic | `app/shloka.tsx`, `components/share/ShoonayaShareCard.tsx` | Premium reader implemented. Share capture still needs device proof. |
| Nitya | `src/app/(main)/nitya-karma/NityaKarmaClient.tsx`, `src/components/nitya/NityaHeroBanner.tsx` | `app/nitya-karma.tsx`, `app/nitya-dincharya.tsx`, `app/nitya-ashrama.tsx`, `app/nitya-plans.tsx` | Hub rebuilt; detailed screens exist. Full PWA complexity is not all native yet. |
| Dharm Veer | `src/app/(main)/dharm-veer/[id]/DharmVeerClient.tsx`, DB-backed roster | `app/dharm-veer.tsx`, `app/dharm-veer/[id].tsx`, `components/dharm-veer/DharmVeerPoster.tsx` | Canonical roster and richer poster implemented. Device visual QA pending. |
| Calendar correctness | Shared calendar engine and Supabase rows | Native consumes web/API calendar data | Nag Panchami 2026 corrected and live-DB verified as `2026-08-17`. |
| Jyotish / Panchang access | PWA routes for Panchang, Rashiphal, Kundali | Home `Jyotish & Panchang` row to `/panchang`, `/rashiphala`, `/kundali` | Surfaced without adding a sixth tab. |
| Tokens / motion | PWA tokenized premium theme and motion expectations | `lib/constants.ts`, `components/ui/PressableSurface.tsx`, updated screen surfaces | Core launch surfaces improved. App-wide sweep remains ongoing. |

## What Is Now Close Enough At Code Level

### Home

Native Home now carries the same product shape as PWA Home: sacred first screen,
date/panchang intelligence, next action, Brahma Muhurta timing, observances,
Sankalpa, Dharm Veer, mood, Jyotish/Panchang, Sadhana, and Community. The latest
Home card work also centralized press feedback through `PressableSurface`.

Remaining Home risk: visual rhythm still needs a signed-in AVD/device pass
against the PWA because source parity does not prove perceived density,
scroll feel, or tap feedback.

### Shloka

Native Shloka now matches the PWA intent much more closely: the page is a sacred
reading experience rather than a plain utility screen. It includes completion,
streak/seva, confetti, haptics, and social share-card support.

Remaining Shloka risk: PNG capture/share must be proven on a real Android/iOS
runtime. This is especially important because prior share-card issues included
blank captured cards.

### Nitya

Native Nitya has a premium hub and retains deeper Nitya destinations. The
canonical native API sequence work is already in place, and the hub presentation
no longer looks detached from Home.

Remaining Nitya risk: PWA still has more depth in analytics, customization, and
some advanced states. Native launch can treat the current hub as a strong first
slice, but not as complete PWA Nitya parity.

### Dharm Veer

Native Dharm Veer no longer relies on generic/flat presentation. It uses the
same canonical roster direction, supports detail routing by hero id, and renders
richer artwork through `DharmVeerPoster`.

Remaining Dharm Veer risk: visual quality and route consistency need a device
tap-through from Home card -> `/dharm-veer/[id]` -> share.

## Build Verification

Latest local native build evidence:

- `npm run typecheck`: clean.
- `npx expo-doctor`: clean, `21/21`.
- `git diff --check`: clean.
- Local release APK build: successful after the Shloka/Profile/Settings/Tirtha
  API-route migrations.
- APK path:
  `android/app/build/outputs/apk/release/app-release.apk`.
- APK SHA256:
  `c729918f4ffb051e7968471654544158e4e537c75ccadd594695b9c457bd9ec8`.

No EAS build was run for this comparison, per current instruction.

## AVD / Device Verification Status

Authenticated visual QA is not yet complete.

Commands showed no attached Android device:

```bash
adb devices -l
```

Result:

```text
List of devices attached
```

Recent checks still show no attached ADB device. Earlier emulator attempts
exited before ADB attach; the current required path is to run the smoke harness
on a stable AVD or a physical Android device.

## Remaining Goal Blockers

The goal is not fully achieved until these are done:

1. Run `scripts/android-smoke-checklist.sh` on a working AVD or physical
   Android device.
2. Install the latest local APK and sign in with a real test account.
3. Verify Home visually against the PWA: hero height, pills, shloka transition,
   next-practice scale, Brahma Muhurta, observance carousel, Jyotish/Panchang
   row, and bottom navigation.
4. Open Shloka, mark complete, confirm confetti/haptics, and confirm PNG share
   card capture is nonblank.
5. Open Nitya hub and detailed Nitya flow, confirm the hero feels seamless and
   the sequence/progress state updates Home.
6. Open Dharm Veer from Home and from Bhakti, confirm the same hero/id opens and
   the artwork is not generic/dismal.
7. Verify Panchang, Rashiphal, Kundali, My Progress, Sankalpa, Mandali,
   Profile, and Notifications for token/theme consistency after the latest
   sweep.
8. Repeat at least one dark-mode pass.

## Decision

Do not mark the parity goal complete yet. The code/build work and screenshot
harness are in a good state, but the latest comparison must be closed with real
device screenshots and a logcat sweep from `smoke-reports/<timestamp>/`.
