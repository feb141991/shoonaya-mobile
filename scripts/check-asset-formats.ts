/**
 * Image asset integrity check (see lib/assetFormat.ts for the rules and why).
 *
 *   npm run check:assets
 *
 * Scans every tracked-or-new (not git-ignored) raster image and exits non-zero
 * if any file's real format differs from its extension, is a damaged PNG, or is
 * cut-out art without real transparency. The Android build scripts run this
 * first: an Android build can sit in the EAS queue for hours before failing on
 * exactly this, so it must fail here, in a second, instead.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { MISMATCH_ADVICE, checkImageAsset, formatFromExtension, type AssetProblem } from '../lib/assetFormat';

/** Repo-relative paths of images that are tracked or new-but-not-ignored. */
export function listCandidateImages(root: string): string[] {
  const output = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: root,
    maxBuffer: 64 * 1024 * 1024,
  }).toString('utf8');
  return output
    .split('\0')
    .filter((file) => file && !file.startsWith('node_modules/') && !file.startsWith('graphify-out/') && formatFromExtension(file) !== null);
}

export function scanAssets(root: string): { scanned: number; problems: AssetProblem[] } {
  const files = listCandidateImages(root);
  const problems: AssetProblem[] = [];
  for (const file of files) {
    let bytes: Uint8Array;
    try {
      bytes = readFileSync(path.join(root, file));
    } catch {
      continue; // listed by git but deleted in the working tree
    }
    problems.push(...checkImageAsset(file, bytes));
  }
  return { scanned: files.length, problems };
}

function main(): void {
  const root = path.resolve(__dirname, '..');
  const { scanned, problems } = scanAssets(root);
  if (problems.length === 0) {
    console.log(`Image asset check passed: ${scanned} images scanned.`);
    return;
  }
  console.error(`Image asset check FAILED: ${problems.length} problem(s) in ${scanned} images scanned.\n`);
  for (const problem of problems) {
    console.error(`  ${problem.code.padEnd(15)} ${problem.path}`);
    console.error(`  ${' '.repeat(15)} ${problem.message}\n`);
  }
  if (problems.some((problem) => problem.code === 'FORMAT_MISMATCH')) console.error(`${MISMATCH_ADVICE}\n`);
  console.error('Fix the files above (see AGENTS.md section 11), then run `npm run check:assets` again.');
  process.exitCode = 1;
}

if (require.main === module) main();
