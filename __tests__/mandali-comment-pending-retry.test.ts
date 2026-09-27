import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const mandaliLib = readFileSync(new URL('../lib/mandali.ts', import.meta.url), 'utf8');
const mandaliScreen = readFileSync(new URL('../app/(tabs)/mandali.tsx', import.meta.url), 'utf8');
const postComments = readFileSync(new URL('../components/mandali/PostComments.tsx', import.meta.url), 'utf8');

// A comment send used to be a fire-and-forget: on failure the user saw a
// one-shot Alert with no way to retry, and a manual resend called
// createMandaliComment again, which minted a BRAND NEW clientOperationId --
// so if the original request had actually reached the server and only the
// response was lost (an ambiguous timeout), resubmitting created a genuine
// duplicate comment instead of resolving to the same idempotency key the
// backend already dedupes on (post_comments.client_operation_id).
describe('Mandali comment send shows pending/failed state and retries safely', () => {
  it('createMandaliComment accepts a caller-supplied clientOperationId instead of always minting a fresh one', () => {
    assert.match(mandaliLib, /clientOperationId\?: string/);
    assert.match(mandaliLib, /const clientOperationId = payload\.clientOperationId \?\? Crypto\.randomUUID\(\);/);
  });

  it('shows the comment optimistically with a sending status before the network call resolves', () => {
    assert.match(mandaliScreen, /await savePendingMandaliComment\(record\)/);
    assert.match(mandaliScreen, /renderPendingMandaliComment\(record\), pendingStatus: 'sending'/);
    // The durable operation is written before clearing the draft and sending.
    assert.match(mandaliScreen, /setComments\(\(current\) => \[\.\.\.current, optimisticComment\]\);\s*\n\s*void sendPendingComment\(/);
  });

  it('marks a failed send as failed in place, never a one-shot Alert that loses the message', () => {
    assert.match(mandaliScreen, /pendingStatus: 'failed'/);
    assert.doesNotMatch(mandaliScreen, /Alert\.alert\('Could not post comment'/);
  });

  it('retry reuses the SAME clientOperationId already on the failed row, never a fresh one', () => {
    const handleRetry = mandaliScreen.match(/const handleRetryComment = useCallback\([\s\S]*?\n  \}, \[[^\]]*\]\);/)?.[0];
    assert.ok(handleRetry, 'handleRetryComment should exist');
    assert.match(handleRetry!, /pending\.clientOperationId/);
    assert.doesNotMatch(handleRetry!, /Crypto\.randomUUID\(\)/);
  });

  it('a successful send clears pendingStatus and swaps in the real server id', () => {
    assert.match(mandaliScreen, /confirmPendingMandaliComment\(current, localId, newId!\)/);
  });

  it('dismissing a failed comment clears its saved retry operation and local bubble', () => {
    assert.match(mandaliScreen, /removePendingMandaliComment\(\{ userId: profile\.userId, clientOperationId: pending\.clientOperationId \}\)/);
    assert.match(mandaliScreen, /setComments\(\(current\) => current\.filter\(\(c\) => c\.id !== localId\)\)/);
  });

  it('PostComments renders distinct sending/failed rows with Retry and Delete, gated ahead of the normal action row', () => {
    assert.match(postComments, /comment\.pendingStatus === 'sending'/);
    assert.match(postComments, /comment\.pendingStatus === 'failed'/);
    assert.match(postComments, /onPress={\(\) => onRetryComment\(comment\.id\)}/);
    assert.match(postComments, /onPress={\(\) => onDismissFailedComment\(comment\.id\)}/);
  });
});
