import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// Reliability plan item 6: Quiz and Seva now paint from a disk cache
// instead of always blocking on SacredLoader while the network round trip
// resolves. app/quiz.tsx and app/seva.tsx import react-native, so they
// cannot be loaded by `tsx --test` -- this is a structural check (same
// convention as __tests__/app-identity-ownership*.test.ts), verified
// non-vacuous by diffing against `git show HEAD` before the migration.
test('Quiz reads/writes its cache and clears loading on a cache hit before the network call resolves', () => {
  const quiz = fs.readFileSync(path.join(process.cwd(), 'app/quiz.tsx'), 'utf8');

  assert.match(quiz, /readQuizCache\(/);
  assert.match(quiz, /writeQuizCache\(/);

  // The cache-hit branch must call setLoading(false) itself, not rely
  // solely on the effect's trailing .finally() -- otherwise the full-screen
  // loader still flashes for the async gap before the network call settles.
  const cacheHitIndex = quiz.indexOf('if (cached) {');
  assert.ok(cacheHitIndex > -1, 'expected a cache-hit branch');
  const cacheHitBlockEnd = quiz.indexOf('\n    }', cacheHitIndex);
  const cacheHitBlock = quiz.slice(cacheHitIndex, cacheHitBlockEnd);
  assert.match(cacheHitBlock, /setLoading\(false\)/, 'cache-hit branch must clear loading itself');

  // The wrapping effect must not force loading=true before every run --
  // that would re-introduce the exact flash the cache-hit fast path exists
  // to remove.
  const effectIndex = quiz.indexOf("if (appIdentity.kind === 'loading') return;\n    const { isCurrent } = captureAppIdentity();\n    loadQuiz()");
  assert.ok(effectIndex > -1, 'expected the mount effect to call loadQuiz() without an unconditional setLoading(true) first');
});

test('Seva reads/writes its cache and clears loading on a cache hit before the network call resolves', () => {
  const seva = fs.readFileSync(path.join(process.cwd(), 'app/seva.tsx'), 'utf8');

  assert.match(seva, /readSevaCache\(/);
  assert.match(seva, /writeSevaCache\(/);

  const cacheHitIndex = seva.indexOf('if (cached) {');
  assert.ok(cacheHitIndex > -1, 'expected a cache-hit branch');
  const cacheHitBlockEnd = seva.indexOf('\n    }', cacheHitIndex);
  const cacheHitBlock = seva.slice(cacheHitIndex, cacheHitBlockEnd);
  assert.match(cacheHitBlock, /setLoading\(false\)/, 'cache-hit branch must clear loading itself');

  // Guest has no network call at all, so it should never sit behind
  // SacredLoader either.
  const guestIndex = seva.indexOf('if (guest) {');
  const guestBlockEnd = seva.indexOf('\n    }', guestIndex);
  const guestBlock = seva.slice(guestIndex, guestBlockEnd);
  assert.match(guestBlock, /setLoading\(false\)/, 'guest branch must clear loading synchronously, not wait on a network call it never makes');
});

test('Sign-out and account-switch clearing sweeps the new caches, in both the inline route handler and the AuthCoordinator config', () => {
  const layout = fs.readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8');

  const clearQuizCount = (layout.match(/void clearQuizCache\(\);/g) ?? []).length;
  const clearSevaCount = (layout.match(/void clearSevaCache\(\);/g) ?? []).length;

  // 4 sites: inline sign-out, inline account-switch, AuthCoordinator
  // clearAllPrivateCachesForSignOut, AuthCoordinator clearAllPrivateCachesForSwitch
  // -- mirroring clearJapaContextCache's own call-site count exactly, so the
  // two implementations behind USE_AUTH_COORDINATOR stay in parity.
  const clearJapaCount = (layout.match(/void clearJapaContextCache\(\);/g) ?? []).length;
  assert.equal(clearQuizCount, clearJapaCount, 'clearQuizCache should be wired at every site clearJapaContextCache is');
  assert.equal(clearSevaCount, clearJapaCount, 'clearSevaCache should be wired at every site clearJapaContextCache is');
  assert.ok(clearQuizCount >= 4, `expected at least 4 clear sites, found ${clearQuizCount}`);
});
