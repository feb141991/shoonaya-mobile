/**
 * Extracted from app/(tabs)/japa.tsx so this reconciliation logic -- the
 * actual crux of correctness for the retry/quarantine behavior -- is
 * unit-testable. Importing anything from a .tsx file that pulls in
 * react-native breaks the plain `tsx --test` runner this project's other
 * lib tests use, so this stays a plain .ts module with no RN imports,
 * matching lib/japaCompleteRetry.ts and lib/japaPendingCompletion.ts.
 */
import {
  attemptJapaCompleteWithRetry,
  type JapaCompleteFetch,
  type JapaCompleteOutcome,
  type RetryOutcomeLabel,
} from './japaCompleteRetry';
import {
  clearPendingJapaCompletion,
  markPendingJapaCompletionFailed,
  type PendingJapaCompletion,
} from './japaPendingCompletion';

/**
 * Attempts one queued completion and reconciles the durable queue based on
 * the outcome -- shared by the recovery scan, the live in-session save
 * path, and a manual Retry from the failed-item review sheet, so all three
 * go through identical success/definitive_rejection/uncertain handling.
 * Manual retry reuses the original clientCompletionId embedded in
 * requestBody -- never a fresh one -- since this replays pendingCompletion
 * verbatim rather than constructing a new request.
 */
export async function attemptAndReconcilePendingCompletion(
  userId: string,
  pendingCompletion: PendingJapaCompletion,
  fetchImpl: JapaCompleteFetch,
  onOutcome: (label: RetryOutcomeLabel, attempts: number) => void = () => {},
  delay?: (ms: number) => Promise<void>
): Promise<JapaCompleteOutcome> {
  const outcome = await attemptJapaCompleteWithRetry(fetchImpl, pendingCompletion.requestBody, onOutcome, delay);
  if (outcome.kind === 'success') {
    try {
      await clearPendingJapaCompletion(userId, pendingCompletion.clientCompletionId);
    } catch {
      // Already succeeded server-side; a failed local cleanup is a
      // harmless future idempotent replay, not a lost or duplicated save.
    }
  } else if (outcome.kind === 'definitive_rejection') {
    try {
      await markPendingJapaCompletionFailed(userId, pendingCompletion.clientCompletionId);
    } catch {
      // Best-effort: worst case it's retried again next time instead of
      // staying quarantined.
    }
  }
  return outcome;
}

export function parsePendingCompletionMantra(requestBody: string): string | null {
  try {
    const parsed = JSON.parse(requestBody) as { mantra?: unknown };
    return typeof parsed.mantra === 'string' ? parsed.mantra : null;
  } catch {
    return null;
  }
}
