/**
 * Apple TN3194 — one-time authorization code transmission helper.
 *
 * Transmits the authorization code to the backend immediately after a
 * successful Apple Sign-In session is established.
 *
 * Requirements (Apple TN3194 / App Store Review Guidelines):
 *  1. Sent only once, over authenticated HTTPS with Bearer token from session.
 *  2. Never persisted in AsyncStorage, device storage, logs, or analytics.
 *  3. Non-blocking: a network failure does NOT block or revert user sign-in.
 *  4. No retry: authorization codes are one-time-use; sending a stale code
 *     would cause Apple to reject the exchange with invalid_grant.
 *
 * Return values (P1 fix — richer than boolean for testability):
 *  'ok'            — backend accepted and stored the token
 *  'no_code'       — authorizationCode was null/undefined/empty; nothing sent
 *  'http_error'    — backend returned a non-2xx status (401, 503, etc.)
 *  'network_error' — network or runtime exception
 */

export type ApiFetchLike = (path: string, options?: RequestInit) => Promise<Response>;
export type AppleTransmissionResult = 'ok' | 'no_code' | 'http_error' | 'network_error';

let defaultFetcher: ApiFetchLike | null = null;

async function getDefaultFetcher(): Promise<ApiFetchLike> {
  if (!defaultFetcher) {
    const { apiFetch } = await import('@/lib/api');
    defaultFetcher = apiFetch;
  }
  return defaultFetcher;
}

export async function transmitAppleAuthorizationCode(
  authorizationCode: string | null | undefined,
  customFetcher?: ApiFetchLike,
): Promise<AppleTransmissionResult> {
  if (!authorizationCode || typeof authorizationCode !== 'string' || !authorizationCode.trim()) {
    return 'no_code';
  }

  try {
    const fetcher = customFetcher ?? (await getDefaultFetcher());
    const response = await fetcher('/api/auth/apple/store-token', {
      method: 'POST',
      body: JSON.stringify({ authorizationCode }),
    });

    if (!response.ok) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(
          `[auth] Apple authorization code transmission failed: HTTP ${response.status}. ` +
          (response.status === 503
            ? 'Backend Apple env vars may not be configured.'
            : response.status === 401
            ? 'Session may not have been established before transmission.'
            : 'Check backend logs for details.'),
        );
      }
      return 'http_error';
    }

    return 'ok';
  } catch (error) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(
        '[auth] Apple authorization code network error (TN3194 custody):',
        error instanceof Error ? error.message : String(error),
      );
    }
    return 'network_error';
  }
}
