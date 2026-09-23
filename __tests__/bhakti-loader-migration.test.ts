import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// Reliability plan item 6 (Bhakti's browse/katha-list/katha-detail/
// stotram-detail screens): these import react-native, so this is a
// structural check (same convention as the other *-loader-migration
// test files), verified non-vacuous by diffing against `git show HEAD`
// before the change.
test('Bhakti sacred-content screens read/write their cache and never blow away good cached content on a failed background reconcile', () => {
  const files = {
    browse: fs.readFileSync(path.join(process.cwd(), 'app/bhakti/browse.tsx'), 'utf8'),
    katha: fs.readFileSync(path.join(process.cwd(), 'app/bhakti/katha.tsx'), 'utf8'),
    stotramDetail: fs.readFileSync(path.join(process.cwd(), 'app/bhakti/stotram/[id].tsx'), 'utf8'),
    kathaDetail: fs.readFileSync(path.join(process.cwd(), 'app/bhakti/katha/[id].tsx'), 'utf8'),
  };

  for (const [name, src] of Object.entries(files)) {
    assert.match(src, /readBhaktiContentCache\(/, `${name} should read from the cache`);
    assert.match(src, /writeBhaktiContentCache\(/, `${name} should write to the cache`);

    // The cache-hit branch must call setLoading(false) itself, not rely
    // solely on the effect's trailing .finally() -- otherwise the loader
    // still flashes for the async gap before the network call settles.
    const cacheHitIndex = src.indexOf('if (cached) {');
    assert.ok(cacheHitIndex > -1, `${name}: expected a cache-hit branch`);
    const cacheHitBlockEnd = src.indexOf('\n    }', cacheHitIndex);
    assert.match(src.slice(cacheHitIndex, cacheHitBlockEnd), /setLoading\(false\)/, `${name}: cache-hit branch must clear loading itself`);

    // hadCache guards every setLoadError(true) call downstream of the
    // cache read -- a failed background reconcile must never replace
    // already-painted cached content with an error page. Scoped to the
    // portion of the file after the cache read itself: an early guard
    // before that point (e.g. a missing route param) has no cache to
    // protect and is legitimately unconditional.
    const cacheReadIndex = src.indexOf('readBhaktiContentCache(');
    assert.ok(cacheReadIndex > -1, `${name}: expected a readBhaktiContentCache call`);
    const afterCacheRead = src.slice(cacheReadIndex);
    const hadCacheGuardCount = (afterCacheRead.match(/if \(!hadCache\) setLoadError\(true\);/g) ?? []).length;
    const unconditionalErrorCount = (afterCacheRead.match(/^\s*setLoadError\(true\);\s*$/gm) ?? []).length;
    assert.ok(hadCacheGuardCount >= 1, `${name}: expected at least one !hadCache-guarded setLoadError(true)`);
    assert.equal(
      unconditionalErrorCount,
      0,
      `${name}: found an unconditional setLoadError(true) after the cache read that would blow away cached content on a background reconcile failure`
    );
  }
});
