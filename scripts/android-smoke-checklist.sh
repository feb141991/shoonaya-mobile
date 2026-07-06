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

mkdir -p "$REPORT_DIR"
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

# ── 6. Crash check ────────────────────────────────────────────────────────────
log ""
log "## Crash log check"
adb -s "$DEVICE_ID" logcat -d -v time > "$LOGCAT_FILE" 2>&1
if rg -i "FATAL EXCEPTION|AndroidRuntime|NoClassDefFoundError" "$LOGCAT_FILE" > "$REPORT_DIR/crash-matches.txt"; then
  log "FAIL    Crash signatures found — inspect $REPORT_DIR/crash-matches.txt."
  FAILURES=$((FAILURES + 1))
else
  log "PASS    No matches for FATAL EXCEPTION|AndroidRuntime|NoClassDefFoundError in logcat."
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
