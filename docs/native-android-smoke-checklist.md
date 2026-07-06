# Android APK Smoke Checklist

Slice 8 device QA harness for the Shoonaya native app. This is a QA artifact only; it does not redesign or refactor app code.

Run this after native changes that touch auth, navigation, native modules, or release packaging, and before any wider tester distribution.

## Requirements

- Android SDK installed with `adb` on `PATH`
- `adb devices` shows a connected device or running emulator
- JDK 17 or newer
- `rg` on `PATH`
- `android/local.properties` points at a valid local Android SDK path

## Automated Run

```bash
cd "/Users/Business(C)/shoonaya-mobile"
./scripts/android-smoke-checklist.sh
```

The script runs typecheck, Expo Doctor, builds a fresh signed local release APK, installs it, launches it, captures a screenshot, prompts for manual tap checks, and scans logcat for crash signatures.

Each run writes artifacts to `smoke-reports/<timestamp>/`:

- `results.md`
- `logcat.txt`
- `launch-screenshot.png`
- raw typecheck, Expo Doctor, build, install, and launch logs

## Manual Commands

```bash
npm run typecheck
npx expo-doctor

cd android && NODE_ENV=production ./gradlew :app:assembleRelease --console=plain --no-daemon \
  -PSHOONAYA_UPLOAD_STORE_FILE=debug.keystore \
  -PSHOONAYA_UPLOAD_STORE_PASSWORD=android \
  -PSHOONAYA_UPLOAD_KEY_ALIAS=androiddebugkey \
  -PSHOONAYA_UPLOAD_KEY_PASSWORD=android

adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell monkey -p com.shoonaya.app 1
adb exec-out screencap -p > launch-screenshot.png
adb logcat -d -v time | rg -i "FATAL EXCEPTION|AndroidRuntime|NoClassDefFoundError"
```

## Pass Criteria

| Path | Pass criteria |
|---|---|
| App launch | `monkey -p com.shoonaya.app 1` returns without error |
| Login visible | Login screen renders within a few seconds, no blank screen |
| Google tap | Tapping "Continue with Google" does not crash the app |
| WhatsApp tap | Tapping "Continue with WhatsApp" does not crash the app |
| Back navigation | Back presses do not kill the app before returning to the first screen |
| Screenshot | Screenshot file is non-empty and shows the expected screen |
| Crash logs | No `FATAL EXCEPTION`, `AndroidRuntime`, or `NoClassDefFoundError` appears near the launch/tap window |

## Environment Note

This checklist cannot run inside a shell that lacks Android SDK, `adb`, an emulator/device, and JDK 17. Run it on a Mac or CI runner with Android tooling installed.
