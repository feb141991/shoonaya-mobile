#!/usr/bin/env bash
# Safe replacement for `cd android && ./gradlew clean` on this project.
#
# `./gradlew clean` is currently broken here: it deletes the React Native
# New Architecture codegen output under
# node_modules/<autolinked-module>/android/build/generated/source/codegen/jni/
# for every autolinked native module, then Gradle's own
# :app:externalNativeBuildCleanDebug task tries to re-run CMake's own
# "clean" (via ninja), which fails immediately because it references those
# same now-deleted directories:
#
#   CMake Error at .../Android-autolinking.cmake:9 (add_subdirectory):
#     add_subdirectory given source
#     ".../android/build/generated/source/codegen/jni/"
#     which is not an existing directory.
#
# This is a chicken-and-egg ordering bug between Gradle's clean lifecycle
# and CMake/codegen, not a duplicate-class/dex problem, and not fixed by
# retrying -- it reproduces every time `clean` runs on its own, standalone
# or combined with another task in the same invocation (`clean assembleX`
# hits the same failure, since :app:externalNativeBuildCleanDebug still
# runs before other modules' codegen tasks regenerate their output).
#
# The fix: delete the same directories `clean` would have removed
# ourselves, WITHOUT going through Gradle's native-clean task at all. A
# subsequent normal build (assembleDebug/assembleRelease) then does a
# genuine from-scratch CMake configure, at which point each module's own
# codegen task has already run as a real dependency of that build (not of
# a bare `clean`), so the paths CMake needs actually exist.
#
# Usage:
#   ./scripts/android-clean.sh
#   ./scripts/android-clean.sh && (cd android && ./gradlew assembleRelease)
#
# Verified: reproduced this failure on 2026-09-03 (both `gradlew clean` and
# `gradlew clean assembleRelease`), fixed with this exact procedure, then
# confirmed with a genuinely fresh `assembleRelease` (BUILD SUCCESSFUL,
# dex merge + CMake both clean) installed and launched on two emulators
# with no crash.

set -euo pipefail

cd "$(dirname "$0")/.."

echo "Removing android/build, android/app/build, android/app/.cxx ..."
rm -rf android/build android/app/build android/app/.cxx

echo "Removing autolinked native modules' own android/build and android/.cxx ..."
find node_modules -maxdepth 4 -type d -path "*/android/build" -exec rm -rf {} + 2>/dev/null || true
find node_modules -maxdepth 4 -type d -path "*/android/.cxx" -exec rm -rf {} + 2>/dev/null || true

echo "Done. Do NOT run './gradlew clean' next -- it will just recreate this"
echo "failure. Instead run a real build directly, e.g.:"
echo "  (cd android && ./gradlew assembleRelease)"
