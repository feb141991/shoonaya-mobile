/**
 * Rasterizes every source SVG in assets/icons/src/ into the PNG SacredIcon
 * actually loads from assets/icons/. Adding a new hand-drawn identity icon
 * to the app becomes: draw the SVG, run this script, register the name —
 * see the three-step checklist at the bottom of this file — instead of a
 * one-off manual export (how the current 15 icons were produced, with no
 * saved repeatable step).
 *
 *   npx tsx scripts/build-icons.ts
 *
 * Requires ImageMagick's `convert` on PATH (the same tool used to produce
 * every existing icon in assets/icons/ — brew install imagemagick / apt
 * install imagemagick). No new npm dependency added for something that
 * only runs during icon authoring, not at app build or runtime.
 *
 * Source SVG spec (matches all 15 existing icons — see assets/icons/src/):
 *   - viewBox="0 0 48 48", no width/height attrs
 *   - single flat fill (no `fill` attr needed — default black is fine,
 *     SacredIcon recolors via tintColor at render time)
 *   - no strokes on primary shapes; transparent cutouts only for negative-
 *     space accents (e.g. mood's eyes/mouth, dharmveer's flame emblem)
 *
 * Output: one 144x144 PNG per SVG (3x of the 48px viewBox — the density
 * every existing icon in assets/icons/ already renders at), same base
 * filename, written to assets/icons/.
 */
/// <reference types="node" />

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC_DIR = join(__dirname, '..', 'assets', 'icons', 'src');
const OUT_DIR = join(__dirname, '..', 'assets', 'icons');
const SIZE = 144; // 3x of the 48px source viewBox

function assertImageMagickAvailable() {
  try {
    execFileSync('convert', ['-version'], { stdio: 'ignore' });
  } catch {
    console.error(
      'ImageMagick `convert` not found on PATH. Install it first:\n' +
        '  macOS:  brew install imagemagick\n' +
        '  Linux:  apt install imagemagick\n'
    );
    process.exit(1);
  }
}

function main() {
  assertImageMagickAvailable();

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const svgFiles = readdirSync(SRC_DIR).filter((f: string) => f.endsWith('.svg'));
  if (svgFiles.length === 0) {
    console.error(`No .svg files found in ${SRC_DIR}`);
    process.exit(1);
  }

  let count = 0;
  for (const file of svgFiles) {
    const name = file.replace(/\.svg$/, '');
    const src = join(SRC_DIR, file);
    const out = join(OUT_DIR, `${name}.png`);

    execFileSync('convert', [
      '-background',
      'none',
      '-density',
      '300',
      '-resize',
      `${SIZE}x${SIZE}`,
      src,
      out,
    ]);

    console.log(`✓ ${name}.png`);
    count += 1;
  }

  console.log(`\nRasterized ${count} icon(s) to ${OUT_DIR}`);
  console.log(
    '\nTo wire a new icon into the app:\n' +
      '  1. Add its name to SacredIconName in components/ui/SacredIcon.tsx\n' +
      '  2. Add the require() to ICON_ASSETS in the same file\n' +
      '  3. Render it with <IconTile name="..." fallbackGlyph="..." color={...} />'
  );
}

main();
