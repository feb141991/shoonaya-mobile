/**
 * The lint gate (see lib/lintRatchet.ts and AGENTS.md, "Lint is a gate, and its warnings only ratchet down").
 *
 *   npm run check:lint              run ESLint over the repo and compare it with lint-baseline.json
 *   npm run check:lint -- --update  lower the baseline after fixing warnings (it can never raise it)
 *   npm run check:lint -- --init    write the first baseline (only when none exists)
 *
 * Fails on any ESLint error, on any rule with more warnings than its baseline, on a rule that is not in the
 * baseline, and on a baseline left more than 25 above the real count. CI runs it through `npm run prebuild:verify`.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { compareToBaseline, lowerBaseline, summarise, type EslintFileResult, type RuleCounts } from '../lib/lintRatchet';

const ROOT = path.join(__dirname, '..');
const BASELINE_PATH = path.join(ROOT, 'lint-baseline.json');

function runEslint(): EslintFileResult[] {
  const bin = path.join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');
  const run = spawnSync(process.execPath, [bin, '.', '--format', 'json'], { cwd: ROOT, maxBuffer: 512 * 1024 * 1024, encoding: 'utf8' });
  // Exit 0 = clean, 1 = lint errors found; anything else (2) is ESLint itself failing, such as a broken config.
  if (run.status !== 0 && run.status !== 1) {
    console.error(`ESLint failed to run (exit ${run.status}).\n${run.stderr || run.stdout}`);
    process.exit(1);
  }
  try {
    return JSON.parse(run.stdout) as EslintFileResult[];
  } catch {
    console.error(`ESLint printed output that is not JSON.\n${(run.stderr || run.stdout).slice(0, 2000)}`);
    process.exit(1);
  }
}

function readBaseline(): RuleCounts {
  return (JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as { rules: RuleCounts }).rules;
}

function writeBaseline(rules: RuleCounts) {
  const sorted = Object.fromEntries(Object.entries(rules).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify({ _note: 'Warnings per ESLint rule that the repo still has. May only go down: see AGENTS.md, "Lint is a gate, and its warnings only ratchet down". Lower it with `npm run check:lint -- --update`.', rules: sorted }, null, 2)}\n`,
  );
}

function main() {
  const args = process.argv.slice(2);
  const { errors, warnings } = summarise(runEslint(), `${ROOT}/`);
  const total = Object.values(warnings).reduce((a, b) => a + b, 0);

  if (errors.length > 0) {
    console.error(`Lint FAILED: ${errors.length} error(s).\n`);
    for (const line of errors.slice(0, 40)) console.error(`  ${line}`);
    if (errors.length > 40) console.error(`  ...and ${errors.length - 40} more (run \`npm run lint\`).`);
    process.exitCode = 1;
    return;
  }

  if (args.includes('--init')) {
    if (existsSync(BASELINE_PATH)) {
      console.error('lint-baseline.json already exists; use --update to lower it.');
      process.exitCode = 1;
      return;
    }
    writeBaseline(warnings);
    process.stdout.write(`Wrote lint-baseline.json: ${total} warnings in ${Object.keys(warnings).length} rules.\n`);
    return;
  }

  const baseline = readBaseline();
  if (args.includes('--update')) {
    const lowered = lowerBaseline(warnings, baseline);
    if (!lowered) {
      console.error('Refusing to update: a rule has more warnings than its baseline, or a new rule has warnings. Fix those first.');
      process.exitCode = 1;
      return;
    }
    writeBaseline(lowered);
    process.stdout.write(`Lowered lint-baseline.json to ${Object.values(lowered).reduce((a, b) => a + b, 0)} warnings.\n`);
    return;
  }

  const problems = compareToBaseline(warnings, baseline);
  if (problems.length === 0) {
    process.stdout.write(`Lint passed: 0 errors, ${total} warnings (all within lint-baseline.json).\n`);
    return;
  }
  console.error(`Lint FAILED: ${problems.length} problem(s) with the warning baseline.\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  console.error('\nSee AGENTS.md, "Lint is a gate, and its warnings only ratchet down".');
  process.exitCode = 1;
}

if (require.main === module) main();
