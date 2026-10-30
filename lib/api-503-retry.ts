import { addJitter, parseRetryAfterMs } from './retryPolicy';

export const DEFAULT_503_RETRY_BASE_MS = 2_000;

/**
 * Computes a bounded, jittered delay (in ms) for a 503 retry.
 * If the server sends a valid Retry-After header (e.g. "5"), it is honored
 * and jittered (+0% to +25%). Otherwise, falls back to defaultBaseMs (2000ms) with jitter.
 */
export function get503RetryDelayMs(
  retryAfterHeader: string | null | undefined,
  randomFn: () => number = Math.random,
  defaultBaseMs = DEFAULT_503_RETRY_BASE_MS
): number {
  const parsedMs = parseRetryAfterMs(retryAfterHeader);
  const baseMs = parsedMs ?? defaultBaseMs;
  return addJitter(baseMs, 0.25, randomFn);
}

/** Retry exactly once only for a bodyless GET after a transient 503. */
export async function retryTransientReadOnce<T extends { status: number; headers?: { get?(name: string): string | null } }>(
  response: T,
  send: () => Promise<T>,
  method: string | undefined,
  body: BodyInit | null | undefined,
  delay: (waitMs: number) => Promise<unknown>,
  randomFn?: () => number,
): Promise<T> {
  const isBodylessGet = (method ?? 'GET').toUpperCase() === 'GET' && body == null;
  if (response.status !== 503 || !isBodylessGet) return response;

  const retryAfterHeader = response.headers?.get ? response.headers.get('Retry-After') : null;
  const waitMs = get503RetryDelayMs(retryAfterHeader, randomFn);
  await delay(waitMs);
  return send();
}
