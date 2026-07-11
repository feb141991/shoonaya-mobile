#!/usr/bin/env bash
# Android APK smoke checklist for Shoonaya native (Expo) app.
#
# Repeatable smoke test: builds a local release APK signed with the debug
# keystore, installs it on a connected device/emulator, launches it, prompts
# for manual tap checks, and checks logcat for crash signatures. Does NOT
# redesign or modify app code — this is a QA harness only.
#
# Requirements to run this on your machine (not available in the sandbox
# this script may have been authored in):
#   - Android SDK installed, with `adb` on PATH (adb devices must show a
#     connected device or running emulator)
#   - JDK 17+ (Gradle 9.x requires JVM 17 or later)
#   - `rg` (ripgrep) on PATH for the crash-log check
#
# Usage:
#   cd /Users/Business(C)/shoonaya-mobile
#   ./scripts/android-smoke-checklist.sh
#
# Optional:
#   SHOONAYA_SKIP_BUILD=1 ./scripts/android-smoke-checklist.sh
#     Reuse an existing APK at android/app/build/outputs/apk/release/app-release.apk
#     instead of rebuilding it. Useful when the APK was just built and only the
#     device visual QA needs to be repeated.
#
# Exit code is 0 only if every automated and manual check passes. Manual
# smoke paths (login screen visible, Google/WhatsApp button taps, back
# navigation) require a human to watch the device/emulator screen — this
# script pauses and prompts for those, and captures a screenshot for the
# record.

set -uo pipefail

APP_ID="com.shoonaya.app"
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
REPORT_DIR="smoke-reports/$(date +%Y%m%d-%H%M%S)"
LOGCAT_FILE="$REPORT_DIR/logcat.txt"
SCREENSHOT_FILE="$REPORT_DIR/launch-screenshot.png"
PARITY_DIR="$REPORT_DIR/parity-screenshots"
RESULTS_FILE="$REPORT_DIR/results.md"
FAILURES=0

pass_fail() { # $1 = label, $2 = 0/1
  if [ "$2" -eq 0 ]; then echo "PASS  $1"; else echo "FAIL  $1"; fi
}

record_check() { # $1 = label, $2 = 0/1
  local label="$1"
  local code="$2"
  pass_fail "$label" "$code" | tee -a "$RESULTS_FILE"
  if [ "$code" -ne 0 ]; then
    FAILURES=$((FAILURES + 1))
  fi
}

capture_screen() { # $1 = output path
  local output="$1"
  adb -s "$DEVICE_ID" exec-out screencap -p > "$output" 2>/dev/null
  [ -s "$output" ]
}

capture_checkpoint() { # $1 = filename, $2 = title, $3 = pass criteria
  local filename="$1"
  local title="$2"
  local criteria="$3"
  local output="$PARITY_DIR/$filename"
  log ""
  log "### $title"
  log "Criteria: $criteria"
  echo ""
  echo "Navigate the device/emulator to: $title"
  echo "Check: $criteria"
  read -r -p "Press Enter when this screen is ready to capture..."
  if capture_screen "$output"; then
    log "PASS  Captured $output"
  else
    log "FAIL  Screenshot capture failed for $title"
    FAILURES=$((FAILURES + 1))
  fi
  read -r -p "Does this screen pass the criteria above? [y/n] " SCREEN_PASS
  record_check "$title visual parity" "$( [ "$SCREEN_PASS" = "y" ] && echo 0 || echo 1 )"
}

mkdir -p "$REPORT_DIR"
mkdir -p "$PARITY_DIR"
: > "$RESULTS_FILE"
log() { echo "$1" | tee -a "$RESULTS_FILE"; }

log "# Android Smoke Checklist — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
log ""

# ── 0. Preconditions ─────────────────────────────────────────────────────────
log "## Preconditions"

if ! command -v adb >/dev/null 2>&1; then
  log "FAIL  adb not found on PATH — install Android SDK platform-tools before running this checklist."
  exit 1
fi

DEVICE_LINE=$(adb devices | sed -n '2p')
DEVICE_ID=$(echo "$DEVICE_LINE" | awk '{print $1}')
if [ -z "$DEVICE_ID" ]; then
  log "FAIL  No device/emulator connected — run 'adb devices' and connect one first."
  exit 1
fi
log "PASS  Device/emulator connected: $DEVICE_ID"
adb -s "$DEVICE_ID" shell getprop ro.build.version.release 2>/dev/null | xargs -I{} log "      Android version: {}"

# ── 1. typecheck ──────────────────────────────────────────────────────────────
log ""
log "## Static checks"
npm run typecheck > "$REPORT_DIR/typecheck.log" 2>&1
TC=$?
record_check "npm run typecheck" "$TC"

npx expo-doctor > "$REPORT_DIR/expo-doctor.log" 2>&1
DOC=$?
record_check "npx expo-doctor" "$DOC"

# ── 2. Build fresh signed local APK ──────────────────────────────────────────
log ""
log "## Build"
if [ "${SHOONAYA_SKIP_BUILD:-0}" = "1" ]; then
  if [ -f "$APK_PATH" ]; then
    log "PASS  SHOONAYA_SKIP_BUILD=1, reusing existing APK"
    BUILD_OK=0
  else
    log "FAIL  SHOONAYA_SKIP_BUILD=1 but $APK_PATH does not exist"
    BUILD_OK=1
  fi
  record_check "Reuse existing $APK_PATH" "$BUILD_OK"
else
  rm -f "$APK_PATH"
  (
    cd android && NODE_ENV=production ./gradlew :app:assembleRelease --console=plain --no-daemon \
      -PSHOONAYA_UPLOAD_STORE_FILE=debug.keystore \
      -PSHOONAYA_UPLOAD_STORE_PASSWORD=android \
      -PSHOONAYA_UPLOAD_KEY_ALIAS=androiddebugkey \
      -PSHOONAYA_UPLOAD_KEY_PASSWORD=android
  ) > "$REPORT_DIR/gradle-build.log" 2>&1
  BUILD_OK=$?
  record_check "Build fresh $APK_PATH" "$BUILD_OK"
fi
[ -f "$APK_PATH" ] && log "      APK: $(pwd)/$APK_PATH ($(du -h "$APK_PATH" | cut -f1))"

# ── 3. Install ────────────────────────────────────────────────────────────────
log ""
log "## Install"
adb -s "$DEVICE_ID" install -r "$APK_PATH" > "$REPORT_DIR/install.log" 2>&1
INSTALL_OK=$?
record_check "adb install -r $APK_PATH" "$INSTALL_OK"

# ── 4. Clear logcat, launch ───────────────────────────────────────────────────
log ""
log "## Launch"
adb -s "$DEVICE_ID" logcat -c
adb -s "$DEVICE_ID" shell monkey -p "$APP_ID" 1 > "$REPORT_DIR/monkey.log" 2>&1
LAUNCH_OK=$?
sleep 5
record_check "adb shell monkey -p $APP_ID 1" "$LAUNCH_OK"

adb -s "$DEVICE_ID" exec-out screencap -p > "$SCREENSHOT_FILE" 2>/dev/null
if [ -s "$SCREENSHOT_FILE" ]; then
  log "PASS  Screenshot captured: $SCREENSHOT_FILE"
else
  log "FAIL  Screenshot capture failed"
  FAILURES=$((FAILURES + 1))
fi

# ── 5. Manual smoke paths (require a human watching the screen) ─────────────
log ""
log "## Manual smoke paths — confirm on device, then answer y/n"
read -r -p "Login screen visible? [y/n] " LOGIN_VISIBLE
read -r -p "Tap 'Continue with Google' — did it crash? [y/n] (n = pass)" GOOGLE_CRASH
read -r -p "Tap 'Continue with WhatsApp' — did it crash? [y/n] (n = pass)" WHATSAPP_CRASH
read -r -p "Press device Back button repeatedly — did the app close unexpectedly before the first screen? [y/n] (n = pass)" BACK_UNEXPECTED

record_check "Login screen visible" "$( [ "$LOGIN_VISIBLE" = "y" ] && echo 0 || echo 1 )"
record_check "Google button tap does not crash" "$( [ "$GOOGLE_CRASH" = "n" ] && echo 0 || echo 1 )"
record_check "WhatsApp button tap does not crash" "$( [ "$WHATSAPP_CRASH" = "n" ] && echo 0 || echo 1 )"
record_check "Back navigation does not close unexpectedly" "$( [ "$BACK_UNEXPECTED" = "n" ] && echo 0 || echo 1 )"

# ── 6. Authenticated visual parity screenshots ───────────────────────────────
log ""
log "## Authenticated PWA parity visual checkpoints"
log "Sign in with a real test account before continuing. These screenshots are the remaining proof for the premium/PWA parity goal."
read -r -p "Are you signed in and on a stable authenticated screen? [y/n] " SIGNED_IN
if [ "$SIGNED_IN" = "y" ]; then
  capture_checkpoint "01-home.png" "Home" "Hero image has premium first-screen presence, greeting/pills are positioned correctly, shloka is seamless, no duplicate static date/day, next-practice is not oversized/dull, Jyotish row is visible."
  capture_checkpoint "02-shloka.png" "Shloka" "Sacred reader feels PWA-like, completion works, confetti/haptic behavior is present, share-card PNG is not blank."
  capture_checkpoint "03-nitya.png" "Nitya Karma" "Borderless phase hero, correct sequence order, progress ring, detail routes, and completion sync back to Home."
  capture_checkpoint "04-dharm-veer.png" "Dharm Veer detail" "Home card opens the same hero id, poster feels like artwork, detail text renders, share card is nonblank."
  capture_checkpoint "05-panchang.png" "Panchang" "Tithi/date/vrat pills are correct, Nag Panchami 2026 is 2026-08-17 where relevant, visual tokens match Home."
  capture_checkpoint "06-jyotish.png" "Rashiphala and Kundali" "Both routes open from the Jyotish/menu access without placeholder crashes and use the same premium token system."
  capture_checkpoint "07-my-progress.png" "My Progress" "Dashboard cards use premium tokens, no flat/dull cards, and the primary progress taps work."
  capture_checkpoint "08-sankalpa.png" "Sankalpa" "Card/ring spacing and press motion feel coherent with Home."
  capture_checkpoint "09-mandali.png" "Mandali" "Header, feed, filters, comments, joins, and empty states are usable and visually coherent."
  capture_checkpoint "10-profile.png" "Profile" "Profile completion, progress, share, and settings affordances render without oversized or dull surfaces."
  capture_checkpoint "11-notifications.png" "Notifications" "Inbox opens, unread state is coherent, and send-test failure is visible if the backend rejects it."
else
  log "FAIL  Authenticated visual parity screenshots skipped — sign-in is required to complete this goal."
  FAILURES=$((FAILURES + 1))
fi

# ── 7. Crash check ────────────────────────────────────────────────────────────
log ""
log "## Crash log check"
adb -s "$DEVICE_ID" logcat -d -v time > "$LOGCAT_FILE" 2>&1
if rg -i "FATAL EXCEPTION|AndroidRuntime|NoClassDefFoundError|Unable to load script|ReactNativeJS.*Error" "$LOGCAT_FILE" > "$REPORT_DIR/crash-matches.txt"; then
  log "FAIL    Crash signatures found — inspect $REPORT_DIR/crash-matches.txt."
  FAILURES=$((FAILURES + 1))
else
  log "PASS    No relevant crash/runtime signatures found in logcat."
fi

log ""
log "## Report artifacts"
log "  $REPORT_DIR/"
log ""
if [ "$FAILURES" -eq 0 ]; then
  log "Done: PASS"
  exit 0
fi

log "Done: FAIL ($FAILURES failed checks)"
exit 1
