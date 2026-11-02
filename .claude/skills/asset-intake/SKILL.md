---
name: asset-intake
description: Procedure for adding or replacing image assets in the Shoonaya Native app, including art copied from the backend or a generator — format checks, cut-outs, Android compile check, provenance and on-device viewing. Use whenever a PNG, JPEG or WebP is added, replaced or copied into assets/.
---

# Asset intake procedure

Origin: Android production build 46 (2026-10-06) failed after a ~3 hour EAS queue because eight JPEGs named `.png`,
with checkerboards baked in, were in `assets/relics/` (`AGENTS.md` section 11).

## 1. Check the real format

```bash
file <path>          # must match the extension
npm run check:assets
```

Never rename a file to change its format; re-export it. Art copied from the backend carries its defects: check it
again here.

## 2. Cut-out art (`assets/relics/`, `assets/icons/`)

Must be a real PNG or WebP with a true alpha channel. Prefer the generator's original export with alpha. If the art
arrived with a baked-in checkerboard, follow `scripts/relic-cutout/README.md` (macOS, Apple Vision) and do not commit
its `src/`, `out/`, `final/` or `venv/` folders.

## 3. Android compile check

```bash
$ANDROID_HOME/build-tools/<ver>/aapt2 compile --dir <res dir> -o /tmp/out.zip
```

AAPT2 is the only thing that rejects a mislabelled image; iOS and web accept it.

## 4. Look at it

Composite over bright magenta, a dark colour and cream, at full size and at the size it renders (~38px for relics).
No checker squares, no pale rim. Then view it in the app in light and dark mode on a device or simulator.

## 5. Provenance

Record tool, date and rights status of generated or third-party art (section 3). If unknown, say unknown; do not
guess.

## 6. Commit

`__tests__/asset-formats.test.ts` has a known-broken list that may only shrink: never add to it. Do not call an asset
"transparent" or "verified" in a commit message until steps 1–4 passed, and say which of them were done on a device.
