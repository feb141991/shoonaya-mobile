import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

/**
 * Stage 0 (docs/PERFORMANCE_RESEARCH_AND_EXECUTION_PLAN.md's reliability
 * plan) measured this bug via telemetry (recordDuplicateRequestDetected):
 * toggleComments and a separate useEffect both fetched a post's full
 * comment thread under the identical guard condition
 * (`expandedPostId && !fullyLoadedCommentPostIds.has(expandedPostId)`),
 * so every comment expansion fired the network request twice. Stage 3
 * fixes it by making toggleComments own only the expand/collapse state
 * transition; the useEffect is now the single place that decides whether
 * a fetch is needed.
 *
 * Reviewed 2026-09-22: the effect was further rewritten to add genuine
 * per-post single-flight (a second trigger for the same postId reuses the
 * in-flight request -- recordDuplicateRequestAvoided, not ...Detected,
 * since it is now actually caught), and patchNewComment's realtime
 * new-comment enrichment moved from re-fetching the whole thread
 * (fetchPostComments) to a dedicated single-comment lookup
 * (fetchSingleComment) -- see lib/mandali.ts and the backend's
 * loadSingleComment.
 *
 * This is a structural (source-text) test, not a rendered-component test,
 * matching the existing pattern in __tests__/mandali-post-card-layout.test.ts
 * -- app/(tabs)/mandali.tsx imports react-native and cannot be loaded by
 * this project's tsx --test runner.
 */

const mandaliScreen = readFileSync(new URL('../app/(tabs)/mandali.tsx', import.meta.url), 'utf8');

function extractFunctionBody(source: string, startMarker: string): string {
  const start = source.indexOf(startMarker);
  assert.ok(start > -1, `could not find marker: ${startMarker}`);
  // toggleComments and the mirroring useEffect are both short, single
  // top-level statements in this file -- slicing to the next occurrence of
  // `}, [` (their closing useCallback/useEffect dependency array) is
  // sufficient to isolate just this block without a full parser.
  const closeIndex = source.indexOf('}, [', start);
  assert.ok(closeIndex > -1, `could not find closing "}, [" after marker: ${startMarker}`);
  return source.slice(start, closeIndex);
}

describe('Mandali comment expansion: duplicate-fetch fix (Stage 3)', () => {
  it('toggleComments no longer calls fetchPostComments -- it only owns the expand/collapse state transition', () => {
    const toggleCommentsBody = extractFunctionBody(mandaliScreen, 'const toggleComments = useCallback((postId: string) => {');
    assert.doesNotMatch(toggleCommentsBody, /fetchPostComments\(/);
    assert.match(toggleCommentsBody, /setExpandedPostId\(\(current\) => \(current === postId \? null : postId\)\);/);
  });

  it('exactly one fetchPostComments call site exists for comment expansion, in the useEffect that reacts to expandedPostId', () => {
    const effectStart = mandaliScreen.indexOf('if (!expandedPostId || fullyLoadedCommentPostIds.has(expandedPostId)) return;');
    assert.ok(effectStart > -1, 'comment-expansion effect guard not found');
    const effectEnd = mandaliScreen.indexOf('}, [expandedPostId, fullyLoadedCommentPostIds, profile?.userId, appIdentity]);', effectStart);
    assert.ok(effectEnd > -1, 'comment-expansion effect close not found');
    const effectBody = mandaliScreen.slice(effectStart, effectEnd);
    const callCount = (effectBody.match(/fetchPostComments\(/g) ?? []).length;
    assert.equal(callCount, 1, 'the comment-expansion effect must fetch exactly once per expansion, not more');
  });

  it('the file has exactly one fetchPostComments call site (comment expansion) and one fetchSingleComment call site (realtime new-comment enrichment)', () => {
    // Stage 3 (2026-09-22): patchNewComment used to call fetchPostComments
    // (re-fetching the whole thread just to find one new comment) --
    // it now calls fetchSingleComment instead. A second fetchPostComments
    // call site reappearing here would mean the full-thread-refetch
    // regressed back in; a fetchSingleComment count other than 1 would
    // mean either that caller disappeared or a new one appeared unnoticed.
    assert.equal((mandaliScreen.match(/fetchPostComments\(/g) ?? []).length, 1);
    assert.equal((mandaliScreen.match(/fetchSingleComment\(/g) ?? []).length, 1);
  });

  it('per-post single-flight: a second trigger for a postId already being fetched reuses the in-flight request instead of calling fetchPostComments again', () => {
    const effectStart = mandaliScreen.indexOf('if (!expandedPostId || fullyLoadedCommentPostIds.has(expandedPostId)) return;');
    const effectEnd = mandaliScreen.indexOf('}, [expandedPostId, fullyLoadedCommentPostIds, profile?.userId, appIdentity]);', effectStart);
    const effectBody = mandaliScreen.slice(effectStart, effectEnd);
    assert.match(effectBody, /commentFetchInFlightRef\.current\.get\(postId\)/);
    assert.match(effectBody, /recordDuplicateRequestAvoided\(/);
    assert.doesNotMatch(effectBody, /recordDuplicateRequestDetected\(/, 'a reused in-flight request is an avoided duplicate, not a detected one');
  });
});
