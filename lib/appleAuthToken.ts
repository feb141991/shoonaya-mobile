export type ApiFetchLike = (path: string, options?: RequestInit) => Promise<Response>;

let defaultFetcher: ApiFetchLike | null = null;

async function getDefaultFetcher(): Promise<ApiFetchLike> {
  if (!defaultFetcher) {
    const { apiFetch } = await import('@/lib/api');
    defaultFetcher = apiFetch;
  }
  return defaultFetcher;
}

/**
 * Transmits the one-time Apple authorization code to the backend immediately
 * after a successful authenticated session is established.
 *
 * Requirements (Apple TN3194 / App Store Review Guidelines):
 * 1. Sent only once, over authenticated HTTPS with Bearer token derived from session.
 * 2. Never persisted in AsyncStorage, device storage, logs, or analytics.
 * 3. Non-blocking: a network failure does not block or revert user sign-in.
 */
export async function transmitAppleAuthorizationCode(
  authorizationCode: string | null | undefined,
  customFetcher?: ApiFetchLike
): Promise<boolean> {
  if (!authorizationCode || typeof authorizationCode !== 'string' || !authorizationCode.trim()) {
    return false;
  }

  try {
    const fetcher = customFetcher ?? (await getDefaultFetcher());
    const response = await fetcher('/api/auth/apple/store-token', {
      method: 'POST',
      body: JSON.stringify({ authorizationCode }),
    });

    return response.ok;
  } catch (error) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[auth] Failed to transmit Apple authorization code for revocation custody:', error);
    }
    return false;
  }
}
