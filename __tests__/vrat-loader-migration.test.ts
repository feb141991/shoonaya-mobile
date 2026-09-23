import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// Reliability plan item 6 (Vrat's list screen), done together with item 5's
// auth-waterfall fix for the same load function -- app/vrat.tsx imports
// react-native, so this is a structural check (same convention as
// __tests__/app-identity-ownership*.test.ts and quiz-seva-loader-migration),
// verified non-vacuous by diffing against `git show HEAD` before the change.
test('Vrat consumes the root-published identity instead of independent isGuestMode()/getSession(), and caches profile geo/tradition', () => {
  const vrat = fs.readFileSync(path.join(process.cwd(), 'app/vrat.tsx'), 'utf8');

  assert.doesNotMatch(vrat, /isGuestMode\(/);
  assert.doesNotMatch(vrat, /supabase\.auth\.getSession\(/);
  assert.match(vrat, /readVratGeoCache\(/);
  assert.match(vrat, /writeVratGeoCache\(/);

  const cacheHitIndex = vrat.indexOf('if (cached) {');
  assert.ok(cacheHitIndex > -1, 'expected a cache-hit branch');
  const cacheHitBlockEnd = vrat.indexOf('\n    }', cacheHitIndex);
  const cacheHitBlock = vrat.slice(cacheHitIndex, cacheHitBlockEnd);
  assert.match(cacheHitBlock, /setLoading\(false\)/, 'cache-hit branch must clear loading itself, not wait on the profile query');

  const guestIndex = vrat.indexOf("if (appIdentity.kind !== 'authenticated') {");
  assert.ok(guestIndex > -1, 'expected a guest/unauthenticated branch');
  const guestBlockEnd = vrat.indexOf('\n    }', guestIndex);
  const guestBlock = vrat.slice(guestIndex, guestBlockEnd);
  assert.match(guestBlock, /setLoading\(false\)/, 'guest branch must clear loading synchronously -- it makes no network call');
});

test('Sign-out and account-switch clearing sweeps the Vrat geo cache, in both the inline route handler and the AuthCoordinator config', () => {
  const layout = fs.readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8');

  const clearVratCount = (layout.match(/void clearVratGeoCache\(\);/g) ?? []).length;
  const clearJapaCount = (layout.match(/void clearJapaContextCache\(\);/g) ?? []).length;
  assert.equal(clearVratCount, clearJapaCount, 'clearVratGeoCache should be wired at every site clearJapaContextCache is');
  assert.ok(clearVratCount >= 4, `expected at least 4 clear sites, found ${clearVratCount}`);
});
