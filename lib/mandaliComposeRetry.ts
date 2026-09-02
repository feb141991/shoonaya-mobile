/**
 * Mandali post/comment creation's bounded retry attempt -- no React Native
 * imports, same reasoning as lib/japaCompleteRetry.ts/lib/moodCheckinRetry.ts.
 *
 * Deliberately a bounded inline retry, not a persisted outbox: both call
 * sites (app/(tabs)/mandali.tsx's compose-post flow and its comment
 * composer) need the new row's id back synchronously to patch it into
 * local state and close the compose UI, the same reasoning that kept Mood
 * check-in and Japa completion on bounded-inline retry. A "queue it and
 * find out later" outbox would also mean the compose sheet/comment input
 * either closes optimistically before the write is confirmed (misleading
 * if it later fails) or stays open indefinitely -- a bigger UX commitment
 * than this pass is scoped for.
 *
 * Safe to retry verbatim: both POST /api/mandali/posts and
 * POST /api/mandali/comments now accept an optional clientOperationId
 * (backend repo migration 20260902170000_add_mandali_post_comment_
 * idempotency_keys.sql) -- a retry with the same id returns the original
 * row instead of creating a duplicate.
 */
import { classifyFailure, nextBackoffMs } from './retryPolicy';
import { isFetchCancelled } from './fetch-error';

export const MANDALI_COMPOSE_RETRY_STAGES = 2;

export type MandaliComposeFetch = (path: string, options: { method: string; body: string }) => Promise<Response>;
export type RetryOutcomeLabel = 'success' | 'retry' | 'permanent_failure';

/**
 * Returns the settled Response (ok, or a definitive non-retryable failure
 * the caller can still read `.error` from), or null if every attempt
 * failed with a network exception / the retry window was exhausted with
 * no response at all.
 */
export async function attemptMandaliComposeWithRetry(
  fetchImpl: MandaliComposeFetch,
  path: string,
  body: string,
  onOutcome: (outcome: RetryOutcomeLabel, attempts: number) => void = () => {},
  delay: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
): Promise<Response | null> {
  for (let attempt = 0; attempt <= MANDALI_COMPOSE_RETRY_STAGES; attempt++) {
    try {
      const res = await fetchImpl(path, { method: 'POST', body });
      if (res.ok) {
        onOutcome('success', attempt);
        return res;
      }
      const outcome = classifyFailure(res.status, res.headers.get('Retry-After'));
      if (outcome.kind === 'permanent_failure' || attempt === MANDALI_COMPOSE_RETRY_STAGES) {
        onOutcome(outcome.kind === 'permanent_failure' ? 'permanent_failure' : 'retry', attempt);
        return res;
      }
      await delay(nextBackoffMs(attempt) ?? outcome.afterMs);
    } catch (err) {
      if (isFetchCancelled(err)) return null;
      if (attempt === MANDALI_COMPOSE_RETRY_STAGES) {
        console.error('Failed to persist mandali compose action', path, err);
        onOutcome('permanent_failure', attempt);
        return null;
      }
      await delay(nextBackoffMs(attempt) ?? 2000);
    }
  }
  return null;
}
