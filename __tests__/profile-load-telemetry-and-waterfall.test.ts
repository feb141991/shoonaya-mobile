import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const profile = readFileSync(new URL('../app/(tabs)/profile.tsx', import.meta.url), 'utf8');

describe('Profile loadProfile: route-open telemetry and kul waterfall (docs/PERFORMANCE_RESEARCH_AND_EXECUTION_PLAN.md)', () => {
  // F05: Profile recorded server-timing but never a route-open, so it never
  // appeared in the routes table (opens, cache-hit rate, avg/p95 duration)
  // at all -- confirmed by grepping for recordRouteOpen before this fix and
  // finding zero call sites in this file.
  it('records a route-open on both the cache-hit and network-resolved paths', () => {
    assert.match(profile, /import \{ recordServerTiming, parseServerTimingHeader, recordRouteOpen \} from '@\/lib\/telemetry';/);
    assert.match(profile, /profileRouteOpenRecordedForRef/);

    const occurrences = profile.match(/recordRouteOpen\(cacheIdentity, 'profile', \{ cacheHit: (true|false), durationMs: Date\.now\(\) - loadStartedAt \}\)/g) ?? [];
    assert.equal(occurrences.length, 2, 'expected one cacheHit: true (cache fast-path) and one cacheHit: false (network-resolved) call site');
    assert.ok(occurrences.some((o) => o.includes('cacheHit: true')));
    assert.ok(occurrences.some((o) => o.includes('cacheHit: false')));
  });

  it('does not record a second open for the same identity (background refresh must not double-count)', () => {
    assert.match(profile, /if \(profileRouteOpenRecordedForRef\.current !== identityKey\)\s*\{\s*\n\s*profileRouteOpenRecordedForRef\.current = identityKey;\s*\n\s*recordRouteOpen\(cacheIdentity, 'profile', \{ cacheHit: true/);
  });

  // F10: loadProfile awaited the progress-summary response, then a second,
  // direct profiles/kuls lookup before the profile was ever painted --
  // blocking every load on a network round-trip that exists purely to
  // fetch one relational display field.
  it('paints the main profile before the secondary kul lookup, not after', () => {
    const summaryIndex = profile.indexOf("setSummary(payload);");
    const earlyPaintIndex = profile.indexOf('F10 (docs/PERFORMANCE_RESEARCH_AND_EXECUTION_PLAN.md)');
    const kulLookupIndex = profile.indexOf("from('profiles')\n      .select('kul_id, kuls(name)')");
    const loaderReleaseIndex = profile.indexOf('setLoading(false);', earlyPaintIndex);

    assert.ok(summaryIndex > -1 && earlyPaintIndex > -1 && kulLookupIndex > -1, 'expected markers not found in source');
    assert.ok(
      summaryIndex < earlyPaintIndex && earlyPaintIndex < kulLookupIndex,
      'setProfile must be called (early paint) between the progress-summary response and the kul lookup, not only after it'
    );
    assert.ok(
      loaderReleaseIndex > earlyPaintIndex && loaderReleaseIndex < kulLookupIndex,
      'the full-screen loading gate must be released before optional kul enrichment begins',
    );
  });

  it('preserves previously-known kul fields across the early paint instead of blanking them', () => {
    assert.match(profile, /kul_id: cur && cur\.id === payload\.profile\.id \? cur\.kul_id : null,/);
    assert.match(profile, /kul_name: cur && cur\.id === payload\.profile\.id \? cur\.kul_name : null,/);
  });
});
