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
    const effectBody = extractFunctionBody(mandaliScreen, "if (expandedPostId && !fullyLoadedCommentPostIds.has(expandedPostId)) {");
    const callCount = (effectBody.match(/fetchPostComments\(/g) ?? []).length;
    assert.equal(callCount, 1, 'the comment-expansion effect must fetch exactly once per expansion, not more');
  });

  it('the file has exactly two fetchPostComments call sites total: comment expansion, and the unrelated realtime new-comment enrichment (patchNewComment)', () => {
    // A third call site reappearing here would mean either the duplicate
    // bug came back, or a genuinely new caller was added without updating
    // this regression test -- worth failing loudly either way.
    const totalCallSites = (mandaliScreen.match(/fetchPostComments\(/g) ?? []).length;
    assert.equal(totalCallSites, 2);
  });
});
