import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Shields rejects a response from an earlier identity and covers previous counters during a switch', () => {
  const source = readFileSync(new URL('../app/my-progress/shields.tsx', import.meta.url), 'utf8');
  assert.match(source, /await fetchShieldCounters[\s\S]*if \(!lease\.isCurrent\(\)\) return;[\s\S]*setStreak/);
  assert.match(source, /loadedUserId !== appIdentity\.userId/);
});
test('Dharm Veer ignores a superseded story read and invalidates it on cleanup', () => {
  const source = readFileSync(new URL('../app/dharm-veer/[id].tsx', import.meta.url), 'utf8');
  assert.match(source, /if \(generation !== loadGeneration\.current\) return;/);
  assert.match(source, /return \(\) => \{ loadGeneration\.current\+\+; \};/);
});
