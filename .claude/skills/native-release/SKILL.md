---
name: native-release
description: Procedure for shipping the Shoonaya Native app — choosing between an OTA update and a native build, running the gates, and reporting build identity. Use when asked to build, release, publish an update, ship to testers, or say whether a change is on a device.
---

# Native release procedure

Every step that leaves this machine (push, `eas build`, `eas update`, store submission) needs the founder's explicit
approval in the current conversation. Prepare everything, then ask.

## 1. OTA update or native build?

An OTA update can change JavaScript and bundled assets only. It **cannot** ship:
- a new or upgraded native module or Expo package with native code,
- `app.json` changes to permissions, intent filters, associated domains, entitlements, plugins, icons or splash,
- an Expo SDK upgrade.

If any of these changed since the installed build, it needs a native build. `runtimeVersion` uses the
`appVersion` policy, so an update only reaches builds with the same `expo.version`.

## 2. Gates (run locally, report every result)

```bash
npm run prebuild:verify
```

Assets, build metadata, typecheck and the full test suite. Report passed / failed / skipped.

For store builds and OTA updates, the release gate also checks the backend:

```bash
npm run prebuild:release
```

It fails if backend migrations are uncommitted and runs the backend's `verify:migrations:linked`. Set
`SHOONAYA_BACKEND_REPO` if the backend is not at `../Sanatan Sangam/Shoonaya`.

`git status --porcelain` must be clean or every dirty file explained: EAS builds the local working tree.

## 3. Commands (after approval)

| Target | Command | Channel |
|---|---|---|
| Android internal APK | `npm run eas:android:apk` | preview |
| Android dev client | `npm run eas:android:dev` | development |
| iOS Simulator build | `npm run eas:ios:simulator` | development |
| Play production AAB | `npm run eas:android:store` | production |
| App Store / TestFlight | `npm run eas:ios:store` | production |
| OTA update | `npm run eas:update -- --channel <channel> --message "<msg>"` | as given |

Never run bare `eas update` or `eas build`: the npm scripts run the gates first. Builds can sit in the EAS queue for
hours; a gate failure locally costs seconds.

## 4. Device verification

- Android: `./scripts/android-smoke-checklist.sh` (or `SHOONAYA_SKIP_BUILD=1 ...` to reuse the APK); evidence lands
  in `smoke-reports/<timestamp>/`. Checklist: `docs/NATIVE_DEVICE_VISUAL_QA_CHECKLIST.md`.
- Release journeys (guest, sign-in, account switch): `npx tsx scripts/e2e-release-journeys.ts`; record results in a
  copy of `docs/RELEASE_DEVICE_SMOKE_REPORT_TEMPLATE.md`.
- Check light and dark mode, large text, reduced motion, 3-button and gesture navigation on Android, and 44px
  touch targets on what changed.
- Push: real device only. The iOS Simulator proves nothing about remote push.

## 5. Report

Use the `shoonaya-release-gatekeeper` agent's format: the seven states, each with evidence, and the build or update
identity (build id, profile, commit, version/build number, update id and channel). Say what was not verified.
