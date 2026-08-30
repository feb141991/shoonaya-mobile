# Antigravity Prompt: Expo 56 Release Dependency Alignment

Work only in `/Users/Business(C)/shoonaya-mobile`.

## Objective

Align every Expo package to the exact patch version expected by the currently
installed Expo SDK 56 release, regenerate native projects, and prove Android
and iOS release compatibility. This is dependency maintenance only.

## Important distinction

Hermes is React Native's JavaScript runtime, not Shoonaya application code.
Do not search for or remove "Hermes code" from the repository. Do not disable
Hermes and do not change JavaScript engines as a workaround.

The current `expo-doctor` result has two independent findings:

1. 15 Expo dependencies are behind their SDK 56 expected patch versions.
2. The Hermes version bundled with SDK 56 is affected by a known memory
   regression whose documented fix requires a later React Native/Expo SDK.

This prompt closes only finding 1 and produces evidence for finding 2. It must
not silently turn a patch-alignment task into an SDK 57 migration.

## Pre-flight

1. Read `AGENTS.md`, `package.json`, `package-lock.json`, `app.json`, and
   `eas.json`.
2. Record `git status --short` and preserve all existing unrelated changes,
   especially the in-progress startup-scene files and `scratch/`.
3. Run and save the baseline outputs:
   - `node --version`
   - `npm --version`
   - `npx expo-doctor`
   - `npx expo install --check`
   - `npm run typecheck`
   - `npm test`

## Required implementation

1. Use Expo's package manager command for the installed SDK, preferably
   `npx expo install --fix`, to align SDK 56 dependencies.
2. Do not hand-select arbitrary package versions when Expo can resolve them.
3. Keep Expo on SDK 56. Do not install Expo 57, React Native 0.86, prerelease
   packages, overrides, resolutions, or `--force`.
4. Do not alter app behavior, screens, tokens, permissions, credentials,
   bundle identifiers, EAS build numbers, environment values, or source code.
5. Run `npm install` only if required to produce a deterministic lockfile.
   Never delete or bypass `package-lock.json`.
6. Run `npx expo prebuild --clean --no-install` after dependency alignment and
   inspect generated Android/iOS output for plugin failures. Native folders are
   ignored and must not be committed.

## Verification

Run all of the following:

- `npx expo install --check` must report dependencies aligned.
- `npx expo-doctor` and report every remaining warning exactly. The Hermes
  regression may remain because this prompt forbids an SDK-major migration;
  do not claim 22/22 if it remains.
- `npm run typecheck`
- `npm test` with passed, failed and skipped counts
- `git diff --check`
- `git status --short`
- Local Android release compile or bundle task using the generated native
  project.
- Local iOS Simulator Debug build using the generated workspace.

## Negative checks

- No application `.ts`/`.tsx` file changed.
- `app.json` and `eas.json` unchanged.
- No runtime engine workaround was added.
- No secrets, `.env` files, native build products, `android/`, `ios/`, or
  `scratch/` files were staged.
- Existing startup-scene work remains byte-identical.

## Deliverable

Return:

1. Before/after dependency table.
2. Exact files changed.
3. Full verification receipt.
4. Remaining `expo-doctor` findings, explicitly separating the Hermes SDK
   migration decision from dependency alignment.
5. A scoped commit containing only `package.json` and `package-lock.json` if
   those are the only intended files. Do not push or trigger EAS builds.

