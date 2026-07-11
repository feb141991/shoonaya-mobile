# Native Device Visual QA Checklist

Date: 2026-07-11

Purpose: close the remaining PWA-quality parity proof after the local APK
build succeeds. This checklist must be run on a working Android AVD or physical
device because web preview is not a valid surface for this app.

Reference documents:

- `docs/NATIVE_LATEST_PWA_COMPARISON.md`
- `docs/NATIVE_PREMIUM_PARITY_RECOVERY_PLAN.md`
- `docs/NATIVE_ROUTE_SURFACING_MATRIX.md`

## Preconditions

1. `adb devices -l` shows a connected device or booted emulator.
2. If using an emulator, prefer a Google Play image so Google auth and push
   services behave like a real device.
3. Preferred: run the smoke harness. It builds or reuses the local APK,
   installs it, launches it, asks for manual auth checks, captures parity
   screenshots, and saves logcat evidence into `smoke-reports/<timestamp>/`.

```bash
cd "/Users/Business(C)/shoonaya-mobile"
./scripts/android-smoke-checklist.sh
```

If the APK has already been built and only the device QA needs repeating:

```bash
SHOONAYA_SKIP_BUILD=1 ./scripts/android-smoke-checklist.sh
```

4. Manual fallback: install the latest local APK:

```bash
cd "/Users/Business(C)/shoonaya-mobile"
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell monkey -p com.shoonaya.app 1
```

5. Confirm the installed APK hash matches the current build record:

```bash
shasum -a 256 android/app/build/outputs/apk/release/app-release.apk
```

Expected current hash:

```text
c729918f4ffb051e7968471654544158e4e537c75ccadd594695b9c457bd9ec8
```

6. Sign in with a real test account. Device visual parity cannot be closed from
   the logged-out screen.

## Required Screenshots

Create a run folder:

```bash
mkdir -p /tmp/shoonaya-device-qa
```

Capture these screenshots after each checkpoint:

```bash
adb exec-out screencap -p > /tmp/shoonaya-device-qa/01-home.png
adb exec-out screencap -p > /tmp/shoonaya-device-qa/02-shloka.png
adb exec-out screencap -p > /tmp/shoonaya-device-qa/03-nitya.png
adb exec-out screencap -p > /tmp/shoonaya-device-qa/04-dharm-veer.png
adb exec-out screencap -p > /tmp/shoonaya-device-qa/05-panchang.png
adb exec-out screencap -p > /tmp/shoonaya-device-qa/06-jyotish.png
adb exec-out screencap -p > /tmp/shoonaya-device-qa/07-my-progress.png
adb exec-out screencap -p > /tmp/shoonaya-device-qa/08-sankalpa.png
adb exec-out screencap -p > /tmp/shoonaya-device-qa/09-mandali.png
adb exec-out screencap -p > /tmp/shoonaya-device-qa/10-profile.png
adb exec-out screencap -p > /tmp/shoonaya-device-qa/11-notifications.png
```

Use the filenames exactly so future reviews can compare runs. The smoke script
uses the same names under `smoke-reports/<timestamp>/parity-screenshots/`.

## Route Checklist

| Route | How to reach | Must verify | Status |
| --- | --- | --- | --- |
| Home | Bottom tab / launch | Hero image occupies premium first-screen space, greeting/pills sit correctly, shloka is borderless/seamless, no duplicate static date/day, next-practice card is not oversized/dull, Jyotish/Panchang row is visible. | Pending |
| Shloka | Home shloka / Bhakti Shloka | Sacred reader feels PWA-like, completion works, confetti appears, haptic fires, share-card PNG is not blank. | Pending |
| Nitya Karma | Home Next Practice or Bhakti | Borderless phase hero, sequence order, progress ring, detail routes, completion sync back to Home. | Pending |
| Dharm Veer | Home card and Bhakti | Home card opens the same hero id, poster looks like artwork rather than generic emoji, detail text renders, share card is nonblank. | Pending |
| Panchang | Jyotish row / Bhakti | Tithi/date/vrat pills are correct, Nag Panchami 2026 appears as 2026-08-17 where relevant, visual tokens match Home. | Pending |
| Rashiphala | Jyotish row | Route opens, no placeholder crash, visual tokens match Home. | Pending |
| Kundali | Jyotish row | Route opens, no placeholder crash, visual tokens match Home. | Pending |
| My Progress | Profile / Home progress | Dashboard cards use premium tokens, no flat/dull cards, taps work. | Pending |
| Sankalpa | Home | Card/ring spacing and press motion feel coherent with Home. | Pending |
| Mandali | Bottom tab / Community | Header, feed, filters, comments, joins, and empty states are usable and visually coherent. | Pending |
| Profile | Bottom tab | Profile completion/progress/share/settings affordances render without oversized or dull surfaces. | Pending |
| Notifications | Bell | Inbox opens, unread dot behavior is coherent, send-test failure is visible if the backend rejects it. | Pending |

## Visual Pass Criteria

Use these criteria instead of "it opens":

- Typography feels close to PWA Home: readable, premium, not oversized inside
  compact cards, and no tiny sub-11dp utility labels on primary surfaces.
- Cards use the warm ivory/gold/ink system, not flat grey/default app cards.
- Primary action hierarchy is obvious: the next action is visually stronger
  than secondary metrics.
- Sacred reading surfaces are borderless or softly integrated where PWA is
  seamless.
- Pressing cards gives a subtle native response; no dead-looking tap zones.
- Dark mode does not show light-theme shadows, borders, or unreadable text.
- No visible raw placeholder copy such as "coming soon" on launch-critical
  routes unless the route is intentionally deferred in the route matrix.

## Logcat Check

After the manual pass:

```bash
adb logcat -d -v time > /tmp/shoonaya-device-qa/logcat.txt
rg -i "FATAL EXCEPTION|AndroidRuntime|NoClassDefFoundError|Unable to load script|ReactNativeJS.*Error" /tmp/shoonaya-device-qa/logcat.txt
```

Pass means there are no relevant crash/runtime matches during the route pass.

## Completion Rule

The parity goal is not complete until this checklist has real device evidence:

- screenshots saved for the required routes,
- logcat crash sweep saved,
- any visual/functionality defects fixed or explicitly moved into a follow-up
  with a product reason.

Static typecheck, Expo Doctor, and release APK build are necessary but not
sufficient for this goal.
