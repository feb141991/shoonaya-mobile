/**
 * Shared guard for route-open telemetry lifecycle correctness -- extracted
 * after 3 related bugs were found in Pathshala's first cut of this
 * instrumentation (see __tests__/route-open-attribution.test.ts for the
 * regressions each of these exists to prevent):
 *
 * 1. Reading "who is the current user" AFTER a request completes, instead
 *    of capturing it at request START, misattributes a measurement to
 *    whichever account happens to be signed in by the time a slow request
 *    resolves -- not the account the request was actually made for.
 * 2. A screen that can be left and reopened before its first load finishes
 *    has no way to tell "is this completion still the load I actually
 *    care about" -- without a generation guard, an interrupted-then-
 *    retried open double-counts as two separate "first opens".
 *
 * Neither of these needs a React import or any screen-specific knowledge,
 * so this stays a plain, directly-testable module -- the same reasoning
 * PanchangRetryController and the telemetry Server-Timing parser already
 * follow in this codebase.
 */

export type AttributionIdentity =
  | { kind: 'guest' }
  | { kind: 'authenticated'; userId: string }
  | { kind: 'unauthenticated' }
  | { kind: 'loading' };

/**
 * Tracks which load attempt is the most recent one for a given screen.
 * `start()` returns a token; a completion's `isCurrent(token)` is false if
 * a newer `start()` call has happened since -- i.e. this completion has
 * been superseded (e.g. the user left and reopened the screen) and must
 * not be recorded.
 */
export class LoadGenerationGuard {
  private currentGeneration = 0;

  start(): number {
    return ++this.currentGeneration;
  }

  isCurrent(token: number): boolean {
    return token === this.currentGeneration;
  }
}

/** True if two identity snapshots refer to different accounts (or a
 * guest/authenticated/unauthenticated/loading transition) -- used to
 * discard a measurement whose account changed between request start and
 * completion, rather than misattribute it. */
export function identityChanged(start: AttributionIdentity, end: AttributionIdentity): boolean {
  if (start.kind !== end.kind) return true;
  if (start.kind === 'authenticated' && end.kind === 'authenticated') {
    return start.userId !== end.userId;
  }
  return false;
}

/**
 * The combined check a route-open completion should run before recording:
 * only record when this is still the most recent load attempt (per
 * `guard`/`token`) AND the identity captured at request start still
 * matches the identity now.
 */
export function shouldRecordRouteOpen(
  guard: LoadGenerationGuard,
  token: number,
  identityAtStart: AttributionIdentity,
  identityNow: AttributionIdentity,
): boolean {
  return guard.isCurrent(token) && !identityChanged(identityAtStart, identityNow);
}
