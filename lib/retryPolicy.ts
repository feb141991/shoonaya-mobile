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
  | { kind: 'retry'; afterMs: number; serverSpecifiedDelay?: boolean }
  | { kind: 'permanent_failure' };

/**
 * Safely parses an RFC 9110 Retry-After header (either seconds integer/float
 * or HTTP-date). Returns milliseconds, clamped between 500ms and 300_000ms (5m).
 * Returns null if the header is absent or unparseable.
 */
export function parseRetryAfterMs(header: string | null | undefined): number | null {
  if (!header || typeof header !== 'string') return null;
  const trimmed = header.trim();
  if (!trimmed) return null;

  // Try integer / float seconds first
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(Math.max(Math.round(seconds * 1000), 500), 300_000);
  }

  // Try HTTP-date format
  const timestamp = Date.parse(trimmed);
  if (Number.isFinite(timestamp)) {
    const diff = timestamp - Date.now();
    return Math.min(Math.max(diff, 500), 300_000);
  }

  return null;
}

/**
 * Adds non-negative proportional jitter (+0% to +maxJitterFraction) to a base delay.
 * Prevents thundering herds when multiple clients receive identical retry headers.
 */
export function addJitter(
  baseMs: number,
  maxJitterFraction = 0.25,
  randomFn: () => number = Math.random
): number {
  if (baseMs <= 0) return 0;
  const fraction = Math.max(0, randomFn());
  const jitterMs = Math.round(baseMs * maxJitterFraction * fraction);
  return baseMs + jitterMs;
}

export function classifyFailure(
  status: number,
  retryAfterHeader: string | null,
  randomFn?: () => number
): RetryOutcome {
  const retryAfterMs = parseRetryAfterMs(retryAfterHeader);
  if (status === 429) {
    const base = retryAfterMs ?? RETRY_BACKOFF_MS[0];
    const afterMs = randomFn ? addJitter(base, 0.25, randomFn) : base;
    return { kind: 'retry', afterMs, serverSpecifiedDelay: retryAfterMs != null };
  }
  if (status >= 500 || status === 0) {
    const base = retryAfterMs ?? RETRY_BACKOFF_MS[0];
    const afterMs = randomFn ? addJitter(base, 0.25, randomFn) : base;
    return { kind: 'retry', afterMs, serverSpecifiedDelay: retryAfterMs != null };
  }
  return { kind: 'permanent_failure' };
}

/** Next backoff stage for a retry-eligible failure; null once exhausted (caller marks 'failed'). */
export function nextBackoffMs(attempts: number): number | null {
  return attempts < RETRY_BACKOFF_MS.length ? RETRY_BACKOFF_MS[attempts] : null;
}
