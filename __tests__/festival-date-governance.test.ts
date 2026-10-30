import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../app/festival/[slug].tsx', import.meta.url), 'utf8');

test('festival detail never invents a Pitru Paksha occurrence date or verified status', () => {
  assert.doesNotMatch(source, /2026-09-27|computedDate/);
  assert.doesNotMatch(source, /reviewStatus:\s*['"]verified['"]/);
  assert.match(source, /setSelection\('unavailable'\)/);
});

test('dated series links wait for canonical occurrence resolution', () => {
  assert.match(source, /if \(params\.date\) return;/);
  assert.match(source, /const targetDate = params\.date \|\| today;/);
});
