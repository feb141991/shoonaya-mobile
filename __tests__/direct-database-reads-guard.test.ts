import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

// AGENTS.md section 39. A screen that talks to the database directly decides for itself what a failed read means,
// and a screen that guesses wrong shows an empty state, a default tradition or the wrong day (section 18). New reads
// go through a function in lib/ that returns data or throws (and is tested), not a `supabase.from(...)` in a screen.
// The files below read the database directly on 2026-11-19, each with its number of calls then. A ceiling only goes
// down; never raise one or add a file. Storage calls (`supabase.storage.from`) are not counted.
const ROOT = join(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'hooks'];

export function countDirectQueries(text: string): number {
  return (text.match(/(?<!storage)\.from\('[a-z_]+'\)/g) ?? []).length;
}

export function findDirectQueryViolations(counts: Record<string, number>, ceilings: Record<string, number>): string[] {
  const problems: string[] = [];
  for (const [file, count] of Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))) {
    const ceiling = ceilings[file];
    if (count === 0) continue;
    if (ceiling === undefined) {
      problems.push(`${file}: ${count} direct database call(s) and the file is not in the list. Put the read in lib/ (data or throw, with a test). Do not add the file to the list.`);
    } else if (count > ceiling) {
      problems.push(`${file}: ${count} direct database calls, over its ceiling of ${ceiling}. Move the new ones into lib/; never raise the ceiling.`);
    } else if (count < ceiling) {
      problems.push(`${file}: down to ${count} direct database call(s) but its ceiling is still ${ceiling}. Lower it to ${count} (delete the entry at 0) so it cannot grow back.`);
    }
  }
  for (const file of Object.keys(ceilings)) {
    if (!counts[file]) problems.push(`${file}: listed, but it makes no direct database call any more. Delete its entry.`);
  }
  return problems;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(ROOT, dir))) {
    const path = `${dir}/${name}`;
    if (statSync(join(ROOT, path)).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

// Files that read the database directly on 2026-11-19. This list may only shrink.
const DIRECT_QUERY_CEILINGS: Record<string, number> = {
  'app/(auth)/onboarding.tsx': 4,
  'app/(tabs)/bhakti.tsx': 3,
  'app/(tabs)/mandali.tsx': 3,
  'app/(tabs)/profile.tsx': 3,
  'app/(tabs)/tirtha.tsx': 2,
  'app/_layout.tsx': 3,
  'app/auth/callback.tsx': 1,
  'app/bhakti/insights.tsx': 2,
  'app/bhakti/zen.tsx': 3,
  'app/dharm-veer.tsx': 1,
  'app/festival/[slug].tsx': 1,
  'app/japa-insights.tsx': 1,
  'app/kundali.tsx': 1,
  'app/live-darshan.tsx': 1,
  'app/mantras.tsx': 1,
  'app/name-story.tsx': 1,
  'app/nitya-ashrama.tsx': 2,
  'app/nitya-dincharya.tsx': 1,
  'app/nitya-karma.tsx': 1,
  'app/nitya-plans.tsx': 7,
  'app/panchang.tsx': 1,
  'app/quiz.tsx': 1,
  'app/rashiphala.tsx': 1,
  'app/settings/detail-screen.tsx': 1,
  'app/settings/personal-details.tsx': 1,
  'app/settings/personalisation.tsx': 1,
  'app/seva.tsx': 3,
  'app/shloka.tsx': 2,
  'app/vrat.tsx': 1,
  'app/vrat/[slug].tsx': 1,
  'components/sanskara/SanskaraBirthDateCard.tsx': 1,
  'hooks/useAiChat.ts': 1,
};

describe('screens do not add direct database reads', () => {
  const counts: Record<string, number> = {};
  for (const dir of SCAN_DIRS) for (const file of walk(dir)) counts[file] = countDirectQueries(readFileSync(join(ROOT, file), 'utf8'));

  it('scans the screen folders (a guard that scans nothing guards nothing)', () => {
    assert.ok(Object.keys(counts).length > 200, `only ${Object.keys(counts).length} files scanned`);
    assert.ok(Object.values(counts).reduce((a, b) => a + b, 0) > 40);
  });

  it('no file makes more direct calls than its ceiling, and no new file makes any', () => {
    const problems = findDirectQueryViolations(counts, DIRECT_QUERY_CEILINGS);
    assert.deepEqual(problems, [], `\n${problems.join('\n')}\n`);
  });
});

describe('the guard itself', () => {
  it('counts table reads and writes, across lines, but not storage calls', () => {
    assert.equal(countDirectQueries("supabase.from('profiles').select('a')"), 1);
    assert.equal(countDirectQueries("supabase\n  .from('seva_log')\n  .insert({})"), 1);
    assert.equal(countDirectQueries("supabase.storage.from('avatars').remove([p])"), 0);
    assert.equal(countDirectQueries("Array.from(new Set(x))"), 0);
  });
  it('rejects growth and new files, and asks for lowered ceilings', () => {
    const ceilings = { 'app/a.tsx': 2 };
    assert.deepEqual(findDirectQueryViolations({ 'app/a.tsx': 2 }, ceilings), []);
    assert.equal(findDirectQueryViolations({ 'app/a.tsx': 3 }, ceilings).length, 1);
    assert.equal(findDirectQueryViolations({ 'app/a.tsx': 2, 'app/b.tsx': 1 }, ceilings).length, 1);
    assert.equal(findDirectQueryViolations({ 'app/a.tsx': 1 }, ceilings).length, 1);
    assert.equal(findDirectQueryViolations({ 'app/a.tsx': 0 }, ceilings).length, 1);
    assert.equal(findDirectQueryViolations({}, ceilings).length, 1);
  });
});
