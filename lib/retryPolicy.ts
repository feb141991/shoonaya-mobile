/**
 * Shared retry/backoff classification -- extracted here once a second
 * feature (notification actions) needed the exact same table Settings'
 * outbox already used. Unlike the per-feature cache envelopes (Home,
 * Mandali, Settings, Notifications), this genuinely is universal: how to
 * classify a failed write and how long to wait before retrying doesn't
 * vary by feature the way merge/freshness policy does.
 *
 * Policy: network errors and 5xx retry at 2s, 10s, 60s, 5m, then give up.
 * 429 honors Retry-After when present. Most 4xx are permanent failures --
 * retrying an already-rejected request wastes cycles and can't succeed
 * differently.
 */

export const RETRY_BACKOFF_MS = [2_000, 10_000, 60_000, 300_000];

/** Thrown by a failed apiFetch-backed action so a caller queueing it into
 * an outbox can classify the failure without re-parsing a Response it no
 * longer has access to. */
export class HttpError extends Error {
  status: number;
  retryAfterHeader: string | null;

  constructor(message: string, status: number, retryAfterHeader: string | null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.retryAfterHeader = retryAfterHeader;
  }
}

export type RetryOutcome =
  | { kind: 'retry'; afterMs: number }
  | { kind: 'permanent_failure' };

export function classifyFailure(status: number, retryAfterHeader: string | null): RetryOutcome {
  if (status === 429) {
    const parsed = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : NaN;
    return { kind: 'retry', afterMs: Number.isFinite(parsed) && parsed > 0 ? parsed * 1000 : RETRY_BACKOFF_MS[0] };
  }
  if (status >= 500 || status === 0) {
    return { kind: 'retry', afterMs: RETRY_BACKOFF_MS[0] };
  }
  return { kind: 'permanent_failure' };
}

/** Next backoff stage for a retry-eligible failure; null once exhausted (caller marks 'failed'). */
export function nextBackoffMs(attempts: number): number | null {
  return attempts < RETRY_BACKOFF_MS.length ? RETRY_BACKOFF_MS[attempts] : null;
}
