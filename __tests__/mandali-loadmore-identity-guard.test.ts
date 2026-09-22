import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

/**
 * Mandali feed pagination identity-generation guard (reviewed 2026-09-22,
 * docs/PERFORMANCE_RESEARCH_AND_EXECUTION_PLAN.md's reliability plan,
 * item 5 of the Mandali backend/request work).
 *
 * loadMorePosts (the infinite-scroll "load next page" handler) used to
 * apply its response unconditionally. A user scrolling to trigger it, then
 * signing out or switching accounts before the response landed, would
 * append the PREVIOUS account's posts/comments/reactions onto whatever the
 * new identity's feed had already loaded -- a real cross-identity data
 * leak (AGENTS.md's cache-isolation rules prohibit exactly this). The fix
 * reuses loadMandali's own mandaliLoadGenerationRef/isCurrentLoad pattern
 * rather than inventing a second mechanism.
 *
 * Structural (source-text) test, not a rendered-component test --
 * app/(tabs)/mandali.tsx imports react-native and cannot be loaded by this
 * project's tsx --test runner (same constraint as the other Mandali
 * structural tests in this suite).
 */

const mandaliScreen = readFileSync(new URL('../app/(tabs)/mandali.tsx', import.meta.url), 'utf8');

describe('Mandali loadMorePosts: identity-generation guard', () => {
  function extractLoadMorePosts(): string {
    const start = mandaliScreen.indexOf('const loadMorePosts = useCallback(async () => {');
    assert.ok(start > -1, 'loadMorePosts not found');
    const end = mandaliScreen.indexOf('}, [loadingMore, nextCursor]);', start);
    assert.ok(end > -1, 'loadMorePosts close not found');
    return mandaliScreen.slice(start, end);
  }

  it('captures the current load generation and identity before awaiting the network response', () => {
    const body = extractLoadMorePosts();
    assert.match(body, /const loadGeneration = mandaliLoadGenerationRef\.current;/);
    assert.match(body, /const identityAtStart = getAppIdentity\(\);/);
  });

  it('checks isCurrentLoad() immediately after each of the two await boundaries (the fetch, and parsing its response)', () => {
    const body = extractLoadMorePosts();
    // Exactly two guards: one right after `await apiFetch(...)` (a stale
    // identity must not even read response.ok, let alone parse the body),
    // one right after `await response.json()` (parsing succeeding is not
    // enough -- the identity could have changed while that awaited too).
    // A guard existing "somewhere earlier in the function" is not the
    // claim being tested here -- each await boundary must have its own.
    const afterFetch = body.indexOf('const response = await apiFetch(');
    const afterJson = body.indexOf('const page = await response.json()');
    assert.ok(afterFetch > -1 && afterJson > afterFetch, 'expected await boundaries not found in order');

    const guardAfterFetch = body.indexOf('if (!isCurrentLoad()) return;', afterFetch);
    assert.ok(
      guardAfterFetch > -1 && guardAfterFetch < afterJson,
      'no isCurrentLoad() guard between the apiFetch await and the response.json() await'
    );

    const setPostsIndex = body.indexOf('setPosts(');
    const guardAfterJson = body.indexOf('if (!isCurrentLoad()) return;', afterJson);
    assert.ok(
      guardAfterJson > -1 && guardAfterJson < setPostsIndex,
      'no isCurrentLoad() guard between the response.json() await and the first state mutation (setPosts)'
    );

    const totalGuards = (body.match(/if \(!isCurrentLoad\(\)\) return;/g) ?? []).length;
    assert.equal(totalGuards, 2, 'expected exactly one guard per await boundary, not zero and not a third, redundant one');
  });

  it('does not reset setLoadingMore(false) for a superseded (stale) load -- matches loadMandali\'s own "if (active)" convention', () => {
    const body = extractLoadMorePosts();
    assert.match(body, /finally \{\s*\n\s*if \(isCurrentLoad\(\)\) setLoadingMore\(false\);/);
  });

  it('reuses mandaliLoadGenerationRef (loadMandali\'s own counter) rather than introducing a second one', () => {
    const body = extractLoadMorePosts();
    assert.doesNotMatch(body, /new(Load)?GenerationRef|loadMoreGenerationRef/i, 'should not introduce a separate generation counter');
    assert.match(body, /mandaliLoadGenerationRef/);
  });
});
