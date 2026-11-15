import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { BASELINE_SLACK, UNUSED_DISABLE_KEY, compareToBaseline, lowerBaseline, summarise } from '../lib/lintRatchet';

const ROOT = join(__dirname, '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

describe('summarise', () => {
  it('splits errors from warnings and counts warnings per rule', () => {
    const { errors, warnings } = summarise(
      [
        { filePath: '/r/a.tsx', messages: [{ ruleId: 'no-empty', severity: 1, line: 3, message: 'x' }, { ruleId: 'no-empty', severity: 1, line: 9, message: 'x' }, { ruleId: 'react-hooks/rules-of-hooks', severity: 2, line: 7, message: 'Hook in callback\nmore' }] },
        { filePath: '/r/b.ts', messages: [{ ruleId: null, severity: 1, message: 'Unused eslint-disable directive' }] },
      ],
      '/r/',
    );
    assert.deepEqual(warnings, { 'no-empty': 2, [UNUSED_DISABLE_KEY]: 1 });
    assert.deepEqual(errors, ['a.tsx:7  react-hooks/rules-of-hooks: Hook in callback']);
  });
});

describe('compareToBaseline', () => {
  const baseline = { 'no-empty': 42, 'react-hooks/refs': 476 };

  it('passes when every rule is at or just under its baseline', () => {
    assert.deepEqual(compareToBaseline({ 'no-empty': 42, 'react-hooks/refs': 470 }, baseline), []);
  });

  it('fails when a rule has more warnings than its baseline', () => {
    const problems = compareToBaseline({ 'no-empty': 43, 'react-hooks/refs': 476 }, baseline);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /no-empty: 43 warnings, over the baseline of 42/);
  });

  it('fails for a rule that is not in the baseline, so new kinds of debt cannot slip in', () => {
    const problems = compareToBaseline({ 'no-empty': 42, 'react-hooks/refs': 476, 'no-debugger': 1 }, baseline);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /no-debugger/);
  });

  it('asks for the baseline to be lowered once a rule drops by more than the slack, so it cannot grow back', () => {
    const problems = compareToBaseline({ 'no-empty': 42, 'react-hooks/refs': 476 - BASELINE_SLACK - 1 }, baseline);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /react-hooks\/refs: down to .* \bbaseline is still 476/);
  });

  it('treats a rule that reached zero like any other drop', () => {
    assert.equal(compareToBaseline({ 'react-hooks/refs': 476 }, baseline).length, 1);
    assert.deepEqual(compareToBaseline({ 'react-hooks/refs': 476 }, { 'react-hooks/refs': 476, 'tiny-rule': 3 }), []);
  });
});

describe('lowerBaseline', () => {
  it('lowers counts and drops rules that reached zero', () => {
    assert.deepEqual(lowerBaseline({ a: 3, b: 0 }, { a: 10, b: 4, c: 2 }), { a: 3 });
  });
  it('never raises a count or adds a rule', () => {
    assert.equal(lowerBaseline({ a: 11 }, { a: 10 }), null);
    assert.equal(lowerBaseline({ a: 5, z: 1 }, { a: 10 }), null);
  });
});

describe('the lint gate is wired in', () => {
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string>; devDependencies: Record<string, string>; dependencies: Record<string, string> };

  it('runs as part of the pre-build gate that CI and every release build run', () => {
    assert.match(pkg.scripts['prebuild:verify'], /npm run check:lint/);
    assert.equal(pkg.scripts['check:lint'], 'tsx scripts/check-lint-ratchet.ts');
    assert.equal(pkg.scripts.lint, 'eslint .');
    assert.match(read('.github/workflows/native-prebuild-gate.yml'), /npm run prebuild:verify/);
  });

  it('keeps ESLint a development dependency, on the major Expo supports', () => {
    assert.ok(pkg.devDependencies.eslint && pkg.devDependencies['eslint-config-expo']);
    assert.equal(pkg.dependencies.eslint, undefined);
    assert.equal(pkg.dependencies['eslint-config-expo'], undefined);
    assert.match(pkg.devDependencies.eslint, /\^?9\./, 'eslint-config-expo 57 supports ESLint 9, not 10');
  });

  it('makes the real bug classes errors and keeps the baseline file valid', () => {
    const config = read('eslint.config.js');
    assert.match(config, /'react-hooks\/rules-of-hooks': 'error'/);
    assert.match(config, /'react-hooks\/static-components': 'error'/);
    assert.ok(existsSync(join(ROOT, 'lint-baseline.json')));
    const baseline = JSON.parse(read('lint-baseline.json')) as { rules: Record<string, number> };
    for (const [rule, count] of Object.entries(baseline.rules)) {
      assert.ok(Number.isInteger(count) && count > 0, `${rule}: ${count}`);
    }
    // An error rule never also has a baseline: the baseline is only for warnings.
    assert.equal(baseline.rules['react-hooks/rules-of-hooks'], undefined);
    assert.equal(baseline.rules['react-hooks/static-components'], undefined);
  });
});
