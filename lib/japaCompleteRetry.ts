/**
 * Japa completion's bounded retry attempt -- no React Native imports, same
 * reasoning as lib/moodCheckinRetry.ts/lib/sankalpaCheckinRetry.ts.
 *
 * Unlike Sankalpa (queue-and-resume outbox), Japa completion stays a
 * bounded inline retry, not a persisted outbox: a completed mala round
 * needs the server's fresh streak/karma context back immediately to update
 * the UI mid-session, which a "fire it and find out later" outbox can't
 * give -- the same reasoning already applied to Mood check-in.
 *
 * Safe to retry verbatim: POST /api/japa/complete requires a client-
 * generated `clientCompletionId` and the backend's complete_japa_session()
 * Postgres function (supabase/migrations/
 * 20260831060651_atomic_idempotent_japa_completion.sql, backend repo) is
 * atomic (single SECURITY DEFINER function call, one transaction) and
 * idempotent (a `for update` lock on the profile row before the
 * client_completion_id existence check closes the race a plain
 * check-then-insert would have -- a concurrent duplicate call always sees
 * the first call's committed row and returns `idempotentReplay: true`
 * instead of double-counting karma or streak).
 */
import { classifyFailure, nextBackoffMs } from './retryPolicy';
import { isFetchCancelled } from './fetch-error';

export const JAPA_COMPLETE_RETRY_STAGES = 2;

export type JapaCompleteFetch = (path: string, options: { method: string; body: string }) => Promise<Response>;
export type RetryOutcomeLabel = 'success' | 'retry' | 'permanent_failure';

/**
 * Returns the settled Response (ok or a definitive non-retryable failure,
 * e.g. a 400 validation error the caller can still read `.error` from), or
 * null if every attempt failed with a network exception / the retry window
 * was exhausted with no response at all.
 */
export async function attemptJapaCompleteWithRetry(
  fetchImpl: JapaCompleteFetch,
  body: string,
  onOutcome: (outcome: RetryOutcomeLabel, attempts: number) => void = () => {},
  delay: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
): Promise<Response | null> {
  for (let attempt = 0; attempt <= JAPA_COMPLETE_RETRY_STAGES; attempt++) {
    try {
      const res = await fetchImpl('/api/japa/complete', { method: 'POST', body });
      if (res.ok) {
        onOutcome('success', attempt);
        return res;
      }
      const outcome = classifyFailure(res.status, res.headers.get('Retry-After'));
      if (outcome.kind === 'permanent_failure' || attempt === JAPA_COMPLETE_RETRY_STAGES) {
        onOutcome(outcome.kind === 'permanent_failure' ? 'permanent_failure' : 'retry', attempt);
        return res;
      }
      await delay(nextBackoffMs(attempt) ?? outcome.afterMs);
    } catch (err) {
      if (isFetchCancelled(err)) return null;
      if (attempt === JAPA_COMPLETE_RETRY_STAGES) {
        console.error('Failed to persist japa completion', err);
        onOutcome('permanent_failure', attempt);
        return null;
      }
      await delay(nextBackoffMs(attempt) ?? 2000);
    }
  }
  return null;
}
