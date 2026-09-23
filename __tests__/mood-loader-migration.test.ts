import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// Reliability plan item 6 (Mood): app/mood.tsx imports react-native, so
// this is a structural check (same convention as the other
// *-loader-migration test files), verified non-vacuous by diffing
// against `git show HEAD` before the change.
test('Mood reads/writes its cache and clears loading on a cache hit before the network call resolves', () => {
  const mood = fs.readFileSync(path.join(process.cwd(), 'app/mood.tsx'), 'utf8');

  assert.match(mood, /useAppIdentity\(\)/);
  assert.match(mood, /readMoodStatusCache\(/);
  assert.match(mood, /writeMoodStatusCache\(/);

  const cacheHitIndex = mood.indexOf('if (cached) {');
  assert.ok(cacheHitIndex > -1, 'expected a cache-hit branch');
  const cacheHitBlockEnd = mood.indexOf('\n    }', cacheHitIndex);
  assert.match(mood.slice(cacheHitIndex, cacheHitBlockEnd), /setLoading\(false\)/, 'cache-hit branch must clear loading itself');

  // A failed background reconcile must not blow away content already
  // painted from the cache -- the only setInitError(true) call left must
  // be guarded by !hadCache, either inline or as an `else if (!hadCache)`
  // branch immediately above it.
  const afterCacheRead = mood.slice(mood.indexOf('const cached = await readMoodStatusCache('));
  const setInitErrorCalls = [...afterCacheRead.matchAll(/setInitError\(true\);/g)];
  assert.equal(setInitErrorCalls.length, 1, 'expected exactly one setInitError(true) call after the cache read');
  const callIndex = setInitErrorCalls[0].index!;
  const precedingLine = afterCacheRead.slice(Math.max(0, callIndex - 80), callIndex);
  assert.match(precedingLine, /!hadCache/, 'the remaining setInitError(true) call must be guarded by !hadCache');
});

test('Sign-out and account-switch clearing sweeps the Mood status cache, in both the inline route handler and the AuthCoordinator config', () => {
  const layout = fs.readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8');

  const clearMoodCount = (layout.match(/void clearMoodStatusCache\(\);/g) ?? []).length;
  const clearJapaCount = (layout.match(/void clearJapaContextCache\(\);/g) ?? []).length;
  assert.equal(clearMoodCount, clearJapaCount, 'clearMoodStatusCache should be wired at every site clearJapaContextCache is');
  assert.ok(clearMoodCount >= 4, `expected at least 4 clear sites, found ${clearMoodCount}`);
});
