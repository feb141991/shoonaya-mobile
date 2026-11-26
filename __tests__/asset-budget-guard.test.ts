import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

// AGENTS.md section 39. Every file in assets/ ships inside the app, and Play and the App Store charge the download for it:
// on 2026-11-19 an audit of the Android bundle found 83 MB of Panchatantra scenes (593 images, two of them unconverted
// JPEGs) making up about 80% of the download, with nothing in the repository to notice it growing. This guard gives each
// folder under assets/ a size ceiling equal to its size on that day (rounded up to 25 KB), caps any single new file, and
// caps the total. A ceiling only goes down: shrinking art means lowering its number here in the same change; growing it
// means shrinking something else, or a documented decision to download it instead of bundling it. Never raise a ceiling.
const ROOT = join(__dirname, '..');
const ASSETS = 'assets';
// No new file over this. Compress it (WebP, a sensible width) or fetch it at runtime. Listed files are the exceptions.
export const SINGLE_FILE_LIMIT = 500_000;
// A ceiling this far above the real size is slack someone could grow back into.
export const STALE_SLACK_BYTES = 250_000;
export const STALE_SLACK_RATIO = 0.05;

export type AssetFile = { path: string; bytes: number };

export function groupOf(path: string): string {
  const parts = path.split('/');
  return parts.length > 2 ? parts[1] : '(root)';
}

export function findAssetBudgetViolations(
  files: AssetFile[],
  folderCeilings: Record<string, number>,
  totalCeiling: number,
  bigFileCeilings: Record<string, number>,
): string[] {
  const problems: string[] = [];
  const sizes: Record<string, number> = {};
  let total = 0;
  for (const { path, bytes } of files) {
    const group = groupOf(path);
    sizes[group] = (sizes[group] ?? 0) + bytes;
    total += bytes;
    const exception = bigFileCeilings[path];
    if (exception !== undefined) {
      if (bytes > exception) problems.push(`${path}: ${bytes} bytes, over its listed ceiling of ${exception}. Compress it; never raise the ceiling.`);
    } else if (bytes > SINGLE_FILE_LIMIT) {
      problems.push(`${path}: ${bytes} bytes, over the ${SINGLE_FILE_LIMIT}-byte single-file limit. Compress it (WebP, a width the screen needs) or fetch it at runtime. Do not add it to the list.`);
    }
  }
  for (const [group, bytes] of Object.entries(sizes).sort(([a], [b]) => a.localeCompare(b))) {
    const ceiling = folderCeilings[group];
    if (ceiling === undefined) {
      problems.push(`assets/${group}: ${bytes} bytes in a folder with no ceiling. Add it to the list at its size (a new folder is a deliberate decision), not above it.`);
    } else if (bytes > ceiling) {
      problems.push(`assets/${group}: ${bytes} bytes, over its ceiling of ${ceiling}. Shrink something else or download it instead of bundling; never raise the ceiling.`);
    } else if (ceiling - bytes > Math.max(STALE_SLACK_BYTES, ceiling * STALE_SLACK_RATIO)) {
      problems.push(`assets/${group}: down to ${bytes} bytes but its ceiling is still ${ceiling}. Lower the ceiling (to ${Math.ceil(bytes / 25_000) * 25_000}) so it cannot grow back.`);
    }
  }
  for (const group of Object.keys(folderCeilings)) {
    if (!(group in sizes)) problems.push(`assets/${group}: listed, but it holds no files any more. Delete its entry.`);
  }
  if (total > totalCeiling) problems.push(`assets/ total: ${total} bytes, over the ceiling of ${totalCeiling}. Never raise it.`);
  else if (totalCeiling - total > Math.max(1_000_000, totalCeiling * STALE_SLACK_RATIO)) {
    problems.push(`assets/ total: down to ${total} bytes but the ceiling is still ${totalCeiling}. Lower it so it cannot grow back.`);
  }
  for (const path of Object.keys(bigFileCeilings)) {
    if (!files.some((file) => file.path === path)) problems.push(`${path}: listed as a large file but it no longer exists. Delete its entry.`);
    else if ((files.find((file) => file.path === path)?.bytes ?? 0) <= SINGLE_FILE_LIMIT) problems.push(`${path}: now under the single-file limit. Delete its entry.`);
  }
  return problems;
}

function walk(dir: string, out: AssetFile[] = []): AssetFile[] {
  for (const name of readdirSync(join(ROOT, dir))) {
    if (name === '.DS_Store') continue;
    const path = `${dir}/${name}`;
    const stat = statSync(join(ROOT, path));
    if (stat.isDirectory()) walk(path, out);
    else out.push({ path, bytes: stat.size });
  }
  return out;
}

// Bytes per folder under assets/ as committed on 2026-11-19 (HEAD, not a working tree with uncommitted shrinks),
// rounded up to 25 KB. This list may only shrink.
const FOLDER_CEILINGS: Record<string, number> = {
  '(root)': 3_325_000,
  'audio': 800_000,
  'brand': 225_000,
  'data': 1_000_000,
  'dharm-veer': 4_825_000,
  'dyuta': 1_325_000,
  'heroes': 8_175_000,
  'icons': 1_550_000,
  'japa': 900_000,
  'onboarding': 475_000,
  'panchatantra': 86_000_000,
  'relics': 2_425_000,
  'startup-scenes': 2_100_000,
};
const TOTAL_CEILING = 113_000_000;
// Files already over the single-file limit on 2026-11-19, at their size then.
const BIG_FILE_CEILINGS: Record<string, number> = {
  'assets/data/panchatantra-expanded-snapshot.json': 997_280,
  'assets/dharm-veer/arjuna.jpg': 1_114_583,
  'assets/dharm-veer/chanakya.jpg': 1_064_116,
  'assets/dharm-veer/sri-krishna.jpg': 1_259_821,
  'assets/dharm-veer/sri-rama.jpg': 1_368_341,
  'assets/icon.png': 1_667_794,
  'assets/panchatantra/dove-king-and-net.jpg': 1_416_746,
  'assets/panchatantra/lion-and-rabbit.jpg': 815_793,
  'assets/splash-icon.png': 1_229_971,
};

describe('bundled assets stay inside their size budget', () => {
  const files = walk(ASSETS);

  it('scans the assets folder (a guard that scans nothing guards nothing)', () => {
    assert.ok(files.length > 500, `only ${files.length} files scanned`);
    assert.ok(files.some((file) => file.path.startsWith('assets/panchatantra/')));
  });

  it('no folder, no file and not the total grows past its ceiling', () => {
    const problems = findAssetBudgetViolations(files, FOLDER_CEILINGS, TOTAL_CEILING, BIG_FILE_CEILINGS);
    assert.deepEqual(problems, [], `\n${problems.join('\n')}\n`);
  });
});

describe('the guard itself', () => {
  const file = (path: string, bytes: number): AssetFile => ({ path, bytes });
  const ceilings = { a: 800_000, '(root)': 100_000 };
  const base = [file('assets/a/x.webp', 400_000), file('assets/a/y.webp', 390_000), file('assets/icon.png', 100_000)];

  it('groups files by folder, and root files together', () => {
    assert.equal(groupOf('assets/a/b/c.png'), 'a');
    assert.equal(groupOf('assets/icon.png'), '(root)');
  });

  it('accepts a tree at or just under its ceilings', () => {
    assert.deepEqual(findAssetBudgetViolations(base, ceilings, 1_000_000, {}), []);
    assert.deepEqual(findAssetBudgetViolations(base.concat(file('assets/a/z.webp', 10_000)), ceilings, 1_000_000, {}), []);
  });

  it('rejects a folder that grew, a new folder, and a total over its ceiling', () => {
    const grew = findAssetBudgetViolations(base.concat(file('assets/a/z.webp', 20_000)), ceilings, 1_000_000, {});
    assert.equal(grew.length, 1);
    assert.match(grew[0], /assets\/a: .*over its ceiling/);
    assert.ok(findAssetBudgetViolations(base.concat(file('assets/new/n.webp', 10)), ceilings, 1_000_000, {}).some((p) => p.includes('assets/new')));
    assert.ok(findAssetBudgetViolations(base, ceilings, 800_000, {}).some((p) => p.includes('total')));
  });

  it('rejects a new file over the single-file limit, but lets a listed one stay while it does not grow', () => {
    const big = file('assets/a/big.png', SINGLE_FILE_LIMIT + 1);
    const tree = [big, file('assets/icon.png', 100_000)];
    const small = { a: 525_000, '(root)': 100_000 };
    assert.ok(findAssetBudgetViolations(tree, small, 625_000, {}).some((p) => p.includes('single-file limit')));
    assert.deepEqual(findAssetBudgetViolations(tree, small, 625_000, { 'assets/a/big.png': SINGLE_FILE_LIMIT + 1 }), []);
    assert.equal(findAssetBudgetViolations([file('assets/a/big.png', SINGLE_FILE_LIMIT + 2), file('assets/icon.png', 100_000)], small, 625_000, { 'assets/a/big.png': SINGLE_FILE_LIMIT + 1 }).length, 1);
  });

  it('asks for the ceiling to be lowered after real savings, and for dead entries to go', () => {
    assert.ok(findAssetBudgetViolations([file('assets/a/x.webp', 100_000), file('assets/icon.png', 100_000)], ceilings, 1_000_000, {}).some((p) => p.includes('Lower the ceiling')));
    assert.ok(findAssetBudgetViolations([file('assets/icon.png', 100_000)], ceilings, 1_000_000, {}).some((p) => p.includes('holds no files')));
    assert.ok(findAssetBudgetViolations(base, ceilings, 1_000_000, { 'assets/a/gone.png': 600_000 }).some((p) => p.includes('no longer exists')));
  });
});
