/**
 * Post/comment reaction bounded retry attempt -- no React Native imports
 * (same reasoning as lib/moodCheckinRetry.ts / lib/sankalpaCheckinRetry.ts).
 *
 * Unlike Sankalpa/Mood check-in, reactions go straight through the
 * Supabase client (post_upvotes/comment_upvotes upsert-on-conflict, delete-
 * by-match in lib/mandali.ts) rather than an HTTP API route, so there's no
 * Response/status to classify -- classification instead looks at the
 * thrown PostgrestError's `code`. Both the set (upsert on
 * (post_id,user_id)/(comment_id,user_id)) and remove (delete-by-match)
 * paths are naturally idempotent, so a retried attempt is always safe to
 * resend verbatim.
 */
import { RETRY_BACKOFF_MS, nextBackoffMs } from './retryPolicy';

export const REACTION_RETRY_STAGES = 2;

export type ReactionAction = () => Promise<void>;
export type RetryOutcomeLabel = 'success' | 'retry' | 'permanent_failure';

// Postgres error classes that can never succeed by resending the same
// write -- everything else (network failures, timeouts, 5xx-shaped
// PostgREST errors, or an error with no code at all) is treated as
// transient and worth retrying.
const PERMANENT_PG_ERROR_CODES = new Set([
  '23503', // foreign_key_violation -- referenced post/comment no longer exists
  '23502', // not_null_violation
  '22P02', // invalid_text_representation -- malformed id/enum value
  '42501', // insufficient_privilege -- RLS rejected the write
  '42703', // undefined_column
  '23514', // check_violation -- e.g. an invalid reaction_type
]);

function isPermanentFailure(error: unknown): boolean {
  const code = (error as { code?: string } | null | undefined)?.code;
  return typeof code === 'string' && PERMANENT_PG_ERROR_CODES.has(code);
}

export async function attemptReactionActionWithRetry(
  action: ReactionAction,
  onOutcome: (outcome: RetryOutcomeLabel, attempts: number) => void = () => {},
  delay: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
): Promise<boolean> {
  for (let attempt = 0; attempt <= REACTION_RETRY_STAGES; attempt++) {
    try {
      await action();
      onOutcome('success', attempt);
      return true;
    } catch (err) {
      const permanent = isPermanentFailure(err);
      if (permanent || attempt === REACTION_RETRY_STAGES) {
        if (!permanent) console.error('Failed to apply reaction change', err);
        onOutcome(permanent ? 'permanent_failure' : 'retry', attempt);
        return false;
      }
      await delay(nextBackoffMs(attempt) ?? RETRY_BACKOFF_MS[0]);
    }
  }
  return false;
}
