/**
 * Mood check-in's bounded retry loop, factored out of lib/mood.ts with no
 * React Native imports (deliberately, unlike lib/mood.ts itself, which
 * pulls in ./api and transitively react-native) -- this is what makes it
 * directly unit-testable under a plain node:test runner without a React
 * Native/Expo test environment. Same reasoning as this codebase's own
 * HomeSummaryCoordinator, which takes an injectable fetchApi for the
 * identical reason.
 *
 * See lib/mood.ts's startMoodCheckin for why this is a bounded inline
 * retry rather than a persisted outbox: app/mood.tsx's wizard needs the
 * checkin_id back synchronously, and MoodPulseSheet.tsx already discards
 * the return value -- neither benefits from a queue-and-resume-later
 * mechanism the way Settings/Notifications' own mutations do.
 */
import { classifyFailure, nextBackoffMs } from './retryPolicy';
import { isFetchCancelled } from './fetch-error';

export const MOOD_RETRY_STAGES = 2;

export type MoodCheckinFetch = (path: string, options: { method: string; body: string }) => Promise<Response>;
export type RetryOutcomeLabel = 'success' | 'retry' | 'permanent_failure';

export async function attemptMoodCheckinWithRetry(
  fetchImpl: MoodCheckinFetch,
  body: string,
  onOutcome: (outcome: RetryOutcomeLabel, attempts: number) => void = () => {},
  delay: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
): Promise<string | null> {
  for (let attempt = 0; attempt <= MOOD_RETRY_STAGES; attempt++) {
    try {
      const res = await fetchImpl('/api/mood/checkin', { method: 'POST', body });
      if (res.ok) {
        const data = await res.json();
        onOutcome('success', attempt);
        return data.checkin_id;
      }
      const outcome = classifyFailure(res.status, res.headers.get('Retry-After'));
      if (outcome.kind === 'permanent_failure' || attempt === MOOD_RETRY_STAGES) {
        onOutcome(outcome.kind === 'permanent_failure' ? 'permanent_failure' : 'retry', attempt);
        return null;
      }
      await delay(nextBackoffMs(attempt) ?? outcome.afterMs);
    } catch (err) {
      if (isFetchCancelled(err)) return null;
      if (attempt === MOOD_RETRY_STAGES) {
        console.error('Failed to start mood checkin', err);
        onOutcome('permanent_failure', attempt);
        return null;
      }
      await delay(nextBackoffMs(attempt) ?? 2000);
    }
  }
  return null;
}
