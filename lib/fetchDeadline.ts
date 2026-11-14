// Dependency-free, so the plain `tsx --test` runner can load it.
//
// Supabase's auth calls (token refresh, sign-in, sign-out) go through the
// client's global fetch, which had no deadline. auth-js shares one in-flight
// token refresh between every caller (`refreshingDeferred`), so a refresh whose
// connection hangs (for example across a laptop or phone sleep) holds every
// later `getSession()` behind it, and with it every signed-in apiFetch:
// each request then fails its 15-second sign-in preparation without ever
// reaching the network. That is what the iOS simulator showed on 2026-11-13
// ("Failed to persist japa completion", no request started from 11:06 to 11:23).
// A deadline makes a hung auth call fail, which releases the shared refresh so
// the next caller starts a fresh one.
import { abortReasonOf, abortWithReason } from './abort-reason';

export const SUPABASE_AUTH_FETCH_TIMEOUT_MS = 20_000;

export function isSupabaseAuthRequest(url: string): boolean {
  try {
    return new URL(url).pathname.startsWith('/auth/v1/');
  } catch {
    return false;
  }
}

export function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/**
 * Runs `fetchImpl` with a deadline when the caller did not supply its own
 * signal. Rejects with an AbortError marked `timeout: true` (lib/fetch-error.ts
 * classifies it as a timeout, not a cancellation), even if the underlying
 * fetch ignores the signal.
 */
export async function fetchWithDeadline(
  fetchImpl: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  if (init?.signal) return fetchImpl(input, init);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      abortWithReason(controller, Object.assign(new Error('Sign-in request timed out'), { name: 'AbortError', timeout: true as const }));
      reject(abortReasonOf(controller.signal));
    }, timeoutMs);
  });
  try {
    return await Promise.race([fetchImpl(input, { ...init, signal: controller.signal }), expired]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
