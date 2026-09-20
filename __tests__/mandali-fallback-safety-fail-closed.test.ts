import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const mandali = readFileSync(new URL('../app/(tabs)/mandali.tsx', import.meta.url), 'utf8');

// F12 (docs/PERFORMANCE_RESEARCH_AND_EXECUTION_PLAN.md): the direct-Supabase
// fallback (used when /api/mandali/feed itself fails) fetched posts/comments/
// members using a safety-exclusion set from fetchSafetyState -- but if THAT
// lookup failed, its .catch() substituted an empty exclusion set and the
// code proceeded to fetch and render content anyway, exactly the leak the
// surrounding comment warns against (a blocked/muted member's posts,
// comments, and profile row visible to the person who blocked/muted them).
describe('Mandali fallback feed fails closed when the safety lookup itself fails', () => {
  it('tracks whether the safety lookup succeeded, not just its (possibly empty) result', () => {
    assert.match(mandali, /let safetyStateAvailable = true;/);
    assert.match(mandali, /safetyStateAvailable = false;/);
  });

  it('never fetches posts or members using an exclusion set it could not verify', () => {
    // The old bug: mandaliId assigned unconditionally from myProfile right
    // after the safety catch, regardless of whether the catch fired.
    assert.doesNotMatch(mandali, /const mandaliId = myProfile\?\.mandali_id \?\? null;/);
    // The fix: mandaliId (which gates both the posts query and, via the
    // members query's own .eq('mandali_id', mandaliId) filter, the members
    // query too) is null whenever the safety lookup failed -- reusing the
    // same "no mandaliId -> no content fetched" path that already exists
    // for a user with no mandali, rather than adding a second parallel gate.
    assert.match(mandali, /const mandaliId = safetyStateAvailable \? \(myProfile\?\.mandali_id \?\? null\) : null;/);
  });
});
