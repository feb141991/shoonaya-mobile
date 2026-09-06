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
 * Three outcomes, not two -- collapsing "exhausted, might still succeed
 * later" into "definitively rejected" was the exact bug this replaces.
 * A network exception (or a 5xx/429 that never stopped being retryable)
 * says nothing about whether the request itself is invalid; only a
 * genuine non-retryable HTTP status (classifyFailure's own
 * 'permanent_failure', e.g. 400/401/403/404/409/422) means retrying
 * verbatim can never succeed.
 *
 * - success: the server acknowledged it (may be idempotentReplay).
 * - definitive_rejection: a real, non-retryable HTTP failure. Retrying
 *   this exact request will never succeed -- callers should quarantine
 *   it as a visibly failed operation, not keep it blocking recovery.
 * - uncertain: every attempt was a network exception, or a retryable-
 *   looking HTTP failure (5xx/429) that was still retryable when the
 *   bounded attempts ran out. This is NOT a rejection -- the original
 *   request may still succeed if retried later (network recovers, server
 *   recovers), so callers must leave it queued, not quarantine it.
 */
export type JapaCompleteOutcome =
  | { kind: 'success'; response: Response }
  | { kind: 'definitive_rejection'; response: Response }
  | { kind: 'uncertain'; response: Response | null };

export async function attemptJapaCompleteWithRetry(
  fetchImpl: JapaCompleteFetch,
  body: string,
  onOutcome: (outcome: RetryOutcomeLabel, attempts: number) => void = () => {},
  delay: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
): Promise<JapaCompleteOutcome> {
  for (let attempt = 0; attempt <= JAPA_COMPLETE_RETRY_STAGES; attempt++) {
    try {
      const res = await fetchImpl('/api/japa/complete', { method: 'POST', body });
      if (res.ok) {
        onOutcome('success', attempt);
        return { kind: 'success', response: res };
      }
      const classification = classifyFailure(res.status, res.headers.get('Retry-After'));
      if (classification.kind === 'permanent_failure') {
        onOutcome('permanent_failure', attempt);
        return { kind: 'definitive_rejection', response: res };
      }
      if (attempt === JAPA_COMPLETE_RETRY_STAGES) {
        onOutcome('retry', attempt);
        return { kind: 'uncertain', response: res };
      }
      await delay(nextBackoffMs(attempt) ?? classification.afterMs);
    } catch (err) {
      if (isFetchCancelled(err)) return { kind: 'uncertain', response: null };
      if (attempt === JAPA_COMPLETE_RETRY_STAGES) {
        console.error('Failed to persist japa completion', err);
        // Ambiguous and potentially recoverable, not a definitive
        // rejection -- a network exception proves nothing about whether
        // the request itself is invalid.
        onOutcome('retry', attempt);
        return { kind: 'uncertain', response: null };
      }
      await delay(nextBackoffMs(attempt) ?? 2000);
    }
  }
  return { kind: 'uncertain', response: null };
}
