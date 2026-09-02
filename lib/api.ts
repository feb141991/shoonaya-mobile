import { API_BASE } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { isFetchCancelled } from './fetch-error';
import { DEFAULT_API_TIMEOUT_MS } from './api-policy';

export { isFetchCancelled };

export type ApiFetchOptions = RequestInit & {
  /** Override the default request deadline for legitimately long-running APIs. */
  timeoutMs?: number;
};

let cachedAccessToken: string | null | undefined;

export function setApiAccessTokenFromSession(session: Session | null) {
  cachedAccessToken = session?.access_token ?? null;
}

async function getApiAccessToken({ forceRefresh = false }: { forceRefresh?: boolean } = {}): Promise<string | null> {
  if (!forceRefresh && cachedAccessToken) {
    return cachedAccessToken;
  }

  const result = forceRefresh
    ? await supabase.auth.refreshSession()
    : await supabase.auth.getSession();
  const session = result.data.session;

  setApiAccessTokenFromSession(session);
  return session?.access_token ?? null;
}

function canReplayBody(body: BodyInit | null | undefined): boolean {
  return body == null || typeof body === 'string' || body instanceof URLSearchParams;
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const { timeoutMs = DEFAULT_API_TIMEOUT_MS, ...fetchOptions } = options;
  const headers = new Headers(options.headers ?? {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const controller = fetchOptions.signal ? null : new AbortController();
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  const requestWithToken = async (accessToken: string | null) => {
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
