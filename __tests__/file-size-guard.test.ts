import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';

// AGENTS.md section 32. A hand-written source file stays small enough to
// review: 800 lines for a screen in app/, 600 for everything else. Files that
// were already over when this rule was written are listed with a ceiling equal
// to their size at the time. A ceiling only goes down: a change that has to add
// lines to a listed file takes at least as many out in the same change.
const ROOT = join(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'hooks', 'lib'];
const SCREEN_LIMIT = 800;
const OTHER_LIMIT = 600;
// A ceiling this far above the real size is slack someone could grow back into.
const CEILING_SLACK = 25;

export function limitFor(path: string): number {
  return path.startsWith('app/') ? SCREEN_LIMIT : OTHER_LIMIT;
}

// Generated snapshots are exempt by name and are rebuilt by their generator, never edited.
export function isChecked(path: string): boolean {
  return /\.(ts|tsx)$/.test(path) && !path.includes('.generated.');
}

export function findSizeViolations(files: Array<{ path: string; lines: number }>, ceilings: Record<string, number>): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const { path, lines } of files) {
    if (!isChecked(path)) continue;
    seen.add(path);
    const limit = limitFor(path);
    const ceiling = ceilings[path];
    if (ceiling === undefined) {
      if (lines > limit) {
        found.push(`${path}: ${lines} lines is over the ${limit}-line limit. Split it by responsibility (AGENTS.md section 32); do not add it to the list.`);
      }
      continue;
    }
    if (lines <= limit) {
      found.push(`${path}: now ${lines} lines, under its ${limit}-line limit. Delete its entry from the list.`);
    } else if (lines > ceiling) {
      found.push(`${path}: grew to ${lines} lines, over its ceiling of ${ceiling}. Move at least as many lines out in the same change; never raise the ceiling.`);
    } else if (ceiling - lines > CEILING_SLACK) {
      found.push(`${path}: shrank to ${lines} lines but its ceiling is still ${ceiling}. Lower the ceiling to ${lines} so it cannot grow back.`);
    }
  }
  for (const path of Object.keys(ceilings)) {
    if (!seen.has(path)) found.push(`${path}: listed but not found. Delete its entry from the list.`);
  }
  return found;
}

// Files over their limit on 2026-11-12, with their line counts then. This list may only shrink.
const OVER_LIMIT_CEILINGS: Record<string, number> = {
  'lib/dharm-veer.ts': 4048,
  'app/kul.tsx': 3699,
  'app/(tabs)/mandali.tsx': 2933,
  'app/(tabs)/index.tsx': 2910,
  'app/(tabs)/profile.tsx': 2197,
  'app/(auth)/onboarding.tsx': 2011,
  'app/settings/detail-screen.tsx': 1769,
  'app/pathshala/[pathId]/[lessonId].tsx': 1555,
  'components/reader/PanchatantraStorybookView.tsx': 1549,
  'app/(tabs)/tirtha.tsx': 1524,
  'app/(auth)/login.tsx': 1455,
  'app/sankalpa.tsx': 1431,
  'app/kul/sanskara.tsx': 1380,
  'app/mood.tsx': 1360,
  'app/_layout.tsx': 1342,
  'app/(tabs)/pathshala.tsx': 1234,
  'app/festival/[slug].tsx': 1223,
  'app/(tabs)/japa.tsx': 984,
  'lib/vrat-data.ts': 1149,
  'app/quiz.tsx': 1147,
  'app/panchang.tsx': 1100,
  'app/vrat/[slug].tsx': 1007,
  'components/tirtha/VirtualSanctumModal.tsx': 983,
  'app/name-story.tsx': 952,
  'app/dyuta.tsx': 947,
  'app/nitya-plans.tsx': 936,
  'lib/mandali.ts': 932,
  'lib/panchatantraArtwork.ts': 930,
  'app/ai-chat.tsx': 928,
  'app/dharm-veer/[id].tsx': 904,
  'components/home/DharmaMitraChatSheet.tsx': 898,
  'lib/homeCoordinator.ts': 876,
  'lib/telemetry.ts': 856,
  'components/reader/ReaderShell.tsx': 826,
  'app/shloka.tsx': 824,
  'lib/heroPreference.ts': 802,
  'components/ui/TimePickerField.tsx': 782,
  'lib/homeCache.ts': 780,
  'components/mandali/PostComments.tsx': 727,
  'components/kul/VanshGraphCanvas.tsx': 721,
  'lib/ashrama.ts': 701,
  'components/ui/CalendarDatePicker.tsx': 692,
  'components/tour/AppTourModal.tsx': 691,
  'components/settings/AccountDeletionSheet.tsx': 688,
  'lib/lineage-data.ts': 671,
  'components/sanskara/SanskaraNodeSheet.tsx': 645,
  'lib/diaspora-temples.ts': 622,
  'components/vrat/VratFastingCard.tsx': 611,
};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name === 'graphify-out') return [];
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function lineCount(text: string): number {
  return text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
}

describe('source files stay small enough to review', () => {
  const files = SCAN_DIRS.flatMap((dir) => walk(join(ROOT, dir)))
    .map((full) => relative(ROOT, full))
    .filter(isChecked)
    .map((path) => ({ path, lines: lineCount(readFileSync(join(ROOT, path), 'utf8')) }));

  it('scans the source folders (a guard that scans nothing guards nothing)', () => {
    assert.ok(files.length > 300, `only ${files.length} files scanned`);
    assert.ok(files.some((f) => f.path === 'app/(tabs)/japa.tsx'));
    assert.ok(!files.some((f) => f.path.includes('.generated.')));
  });

  it('no file is over its limit or grew past its ceiling', () => {
    const violations = findSizeViolations(files, OVER_LIMIT_CEILINGS);
    assert.deepEqual(violations, [], `\n${violations.join('\n')}\n`);
  });

  it('every listed ceiling is for a file that is still over its limit', () => {
    for (const [path, ceiling] of Object.entries(OVER_LIMIT_CEILINGS)) {
      assert.ok(ceiling > limitFor(path), `${path}: ceiling ${ceiling} is not over its limit; delete the entry`);
    }
  });
});

describe('the guard itself', () => {
  const ok = (lines: number) => ({ path: 'components/x/Thing.tsx', lines });

  it('limits: 800 for screens in app/, 600 for everything else', () => {
    assert.equal(limitFor('app/(tabs)/index.tsx'), 800);
    assert.equal(limitFor('components/a.tsx'), 600);
    assert.equal(limitFor('hooks/useA.ts'), 600);
    assert.equal(limitFor('lib/a.ts'), 600);
  });

  it('accepts files at or under the limit', () => {
    assert.deepEqual(findSizeViolations([ok(600), ok(12)], {}), []);
    assert.deepEqual(findSizeViolations([{ path: 'app/x.tsx', lines: 800 }], {}), []);
  });

  it('rejects a new or unlisted file over the limit', () => {
    assert.equal(findSizeViolations([ok(601)], {}).length, 1);
    assert.equal(findSizeViolations([{ path: 'app/x.tsx', lines: 801 }], {}).length, 1);
  });

  it('rejects a listed file that grew past its ceiling', () => {
    const list = { 'components/x/Thing.tsx': 700 };
    assert.deepEqual(findSizeViolations([ok(700)], list), []);
    assert.equal(findSizeViolations([ok(701)], list).length, 1);
  });

  it('makes the ceiling follow the file down', () => {
    const list = { 'components/x/Thing.tsx': 700 };
    assert.deepEqual(findSizeViolations([ok(680)], list), []);
    assert.equal(findSizeViolations([ok(650)], list).length, 1);
  });

  it('asks for the entry to be deleted once the file is under its limit, or gone', () => {
    const list = { 'components/x/Thing.tsx': 700 };
    assert.equal(findSizeViolations([ok(500)], list).length, 1);
    assert.equal(findSizeViolations([], list).length, 1);
  });

  it('exempts generated snapshots and non-source files', () => {
    assert.deepEqual(findSizeViolations([{ path: 'lib/festival-content.generated.ts', lines: 18141 }, { path: 'lib/data.json', lines: 9000 }], {}), []);
  });
});
