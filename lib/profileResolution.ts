/**
 * Extracted from app/_layout.tsx's onboarding gate so the actual defect
 * this session fixed -- a missing/unreadable profile silently resolving
 * as "onboarding complete" -- has a real, directly-testable assertion
 * instead of only a source-pattern check on the .tsx file (which can't
 * import this logic without pulling in react-native, per this project's
 * `tsx --test` runner limitation used throughout this session).
 *
 * `onboarding_completed` is `NOT NULL DEFAULT false` in the database, so
 * a successfully read row is always definitively true or false. `null`
 * here means the row could not be read at all (missing, or the repair/
 * bootstrap attempt also failed) -- that is neither "complete" nor
 * "needs onboarding," and must never be treated as either.
 */
export type ProfileResolutionOutcome =
  | { kind: 'failed' }
  | { kind: 'needs_onboarding' }
  | { kind: 'complete' };

export function resolveProfileOutcome(
  profile: { onboarding_completed: boolean } | null
): ProfileResolutionOutcome {
  if (!profile) return { kind: 'failed' };
  return profile.onboarding_completed ? { kind: 'complete' } : { kind: 'needs_onboarding' };
}
