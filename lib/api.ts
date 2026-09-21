import { API_BASE } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { isFetchCancelled } from './fetch-error';
import { DEFAULT_API_TIMEOUT_MS } from './api-policy';
import { waitForAuthReady } from './authReadyGate';

export { isFetchCancelled };

export type ApiFetchOptions = RequestInit & {
  /** Override the default request deadline for legitimately long-running APIs. */
  timeoutMs?: number;
  /** Bind durable private writes to their original owner, including 401 replay. */
  expectedUserId?: string;
  /**
   * Assert no user is signed in at the actual send moment -- the guest-side
   * counterpart to expectedUserId. Without this, a guest-owned request has
   * no send-time owner check at all: if a sign-in completes while this
   * call's own internal awaits are still in flight, the request goes out
   * carrying whatever session is now current, silently attaching the
   * guest-captured body to a real user's Bearer token. Throws the same way
   * expectedUserId's mismatch does, caught by the caller same as any other
   * apiFetch rejection.
   */
  expectedGuest?: boolean;
};

let cachedAccessToken: string | null | undefined;

export function setApiAccessTokenFromSession(session: Session | null) {
  cachedAccessToken = session?.access_token ?? null;
}

async function getApiAccessToken({ forceRefresh = false }: { forceRefresh?: boolean } = {}): Promise<string | null> {
  if (!forceRefresh && cachedAccessToken) {
    return cachedAccessToken;
  }

  try {
    const result = forceRefresh
      ? await supabase.auth.refreshSession()
      : await supabase.auth.getSession();
    const session = result.data.session;

    setApiAccessTokenFromSession(session);
    return session?.access_token ?? null;
  } catch {
    // If Supabase auth is temporarily unreachable or network dropped, fail safe to cached token
    return cachedAccessToken ?? null;
  }
}

function canReplayBody(body: BodyInit | null | undefined): boolean {
  return body == null || typeof body === 'string' || body instanceof URLSearchParams;
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  // Cold start: every screen mounts before app/_layout.tsx has finished
  // determining whether a session exists, so an unguarded call here can
  // race Supabase's session restore and fire without a token. Resolves
  // immediately once _layout.tsx calls markAuthReady() -- a one-time wait
  // per app launch, not a per-request cost.
  await waitForAuthReady();

  const { timeoutMs = DEFAULT_API_TIMEOUT_MS, expectedUserId, expectedGuest, ...fetchOptions } = options;
  const headers = new Headers(options.headers ?? {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const controller = fetchOptions.signal ? null : new AbortController();
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  const requestWithToken = async (accessToken: string | null) => {
    if (expectedUserId) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id !== expectedUserId) {
        throw new Error('Japa completion owner is no longer signed in');
      }
      accessToken = session.access_token;
    } else if (expectedGuest) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        throw new Error('Guest request owner signed in before send');
      }
      accessToken = null;
    }
    const requestHeaders = new Headers(headers);
    if (accessToken) requestHeaders.set('Authorization', `Bearer ${accessToken}`);
    else requestHeaders.delete('Authorization');

    return fetch(`${API_BASE}${normalizedPath}`, {
      ...fetchOptions,
      headers: requestHeaders,
      signal: fetchOptions.signal ?? controller?.signal,
    });
  };

  try {
    const accessToken = await getApiAccessToken();
    const response = await requestWithToken(accessToken);

    // React Native pauses Supabase's refresh timer while backgrounded. A
    // request can therefore carry an expired cached JWT even though the user
    // is still signed in. A 401 is safe to retry because the route did not
    // execute its protected handler. Restrict retries to replayable bodies.
    if (response.status !== 401 || !accessToken || !canReplayBody(fetchOptions.body)) {
      return response;
    }

    const refreshedToken = await getApiAccessToken({ forceRefresh: true });
    if (!refreshedToken || refreshedToken === accessToken) return response;

    return requestWithToken(refreshedToken);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
