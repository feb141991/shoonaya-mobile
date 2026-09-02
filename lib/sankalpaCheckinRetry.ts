/**
 * Sankalpa check-in's bounded retry attempt -- no React Native imports
 * (same reasoning as lib/moodCheckinRetry.ts: this is what makes it
 * directly unit-testable under plain node:test, and lib/sankalpaOutbox.ts
 * imports this rather than duplicating the classification/backoff logic).
 *
 * Unlike mood check-in, this needs no client-operation-id: the backend
 * (POST /api/sankalpa/checkin) already upserts on
 * (user_id, sankalpa_id, checked_date) with ignoreDuplicates, so resending
 * the exact same {sankalpa_id} body is safe by construction -- a retry
 * either creates the one intended row or no-ops against the row a prior
 * attempt already created.
 */
import { classifyFailure, nextBackoffMs } from './retryPolicy';
import { isFetchCancelled } from './fetch-error';

export const SANKALPA_CHECKIN_RETRY_STAGES = 2;

export type SankalpaCheckinFetch = (path: string, options: { method: string; body: string }) => Promise<Response>;
export type RetryOutcomeLabel = 'success' | 'retry' | 'permanent_failure';

export async function attemptSankalpaCheckinWithRetry(
  fetchImpl: SankalpaCheckinFetch,
  sankalpaId: string,
  onOutcome: (outcome: RetryOutcomeLabel, attempts: number) => void = () => {},
  delay: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
): Promise<boolean> {
  const body = JSON.stringify({ sankalpa_id: sankalpaId });
  for (let attempt = 0; attempt <= SANKALPA_CHECKIN_RETRY_STAGES; attempt++) {
    try {
      const res = await fetchImpl('/api/sankalpa/checkin', { method: 'POST', body });
      if (res.ok) {
        onOutcome('success', attempt);
        return true;
      }
      const outcome = classifyFailure(res.status, res.headers.get('Retry-After'));
      if (outcome.kind === 'permanent_failure' || attempt === SANKALPA_CHECKIN_RETRY_STAGES) {
        onOutcome(outcome.kind === 'permanent_failure' ? 'permanent_failure' : 'retry', attempt);
        return false;
      }
      await delay(nextBackoffMs(attempt) ?? outcome.afterMs);
    } catch (err) {
      if (isFetchCancelled(err)) return false;
      if (attempt === SANKALPA_CHECKIN_RETRY_STAGES) {
        console.error('Failed to check in sankalpa', err);
        onOutcome('permanent_failure', attempt);
        return false;
      }
      await delay(nextBackoffMs(attempt) ?? 2000);
    }
  }
  return false;
}
