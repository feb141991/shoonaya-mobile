import { API_BASE } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { isFetchCancelled } from './fetch-error';
import { DEFAULT_API_TIMEOUT_MS } from './api-policy';
import { waitForAuthReady } from './authReadyGate';
import { sessionHasUsableAccessToken } from './api-auth-policy';
import { createSingleFlight } from './async-single-flight';

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
let cachedSession: Session | null = null;
const refreshSingleFlight = createSingleFlight<Session | null>();

export function setApiAccessTokenFromSession(session: Session | null) {
  cachedSession = session;
  cachedAccessToken = session?.access_token ?? null;
}

async function refreshApiSession(): Promise<Session | null> {
  return refreshSingleFlight.run(async () => {
    const result = await supabase.auth.refreshSession();
    if (result.error) throw result.error;
    setApiAccessTokenFromSession(result.data.session);
    return result.data.session;
  });
}

async function getApiAccessToken(): Promise<string | null> {
  if (sessionHasUsableAccessToken(cachedSession)) return cachedSession!.access_token;

  const result = await supabase.auth.getSession();
  if (result.error) throw result.error;
  setApiAccessTokenFromSession(result.data.session);

  if (!result.data.session) return null;
  if (sessionHasUsableAccessToken(result.data.session)) return result.data.session.access_token;
  return (await refreshApiSession())?.access_token ?? null;
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
  const { timeoutMs = DEFAULT_API_TIMEOUT_MS, expectedUserId, expectedGuest, ...fetchOptions } = options;
  const headers = new Headers(options.headers ?? {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const controller = new AbortController();
  const callerSignal = fetchOptions.signal;
  const forwardAbort = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) forwardAbort();
  else callerSignal?.addEventListener('abort', forwardAbort, { once: true });
  const timeout = setTimeout(() => {
    const error = new Error('API request timed out');
    error.name = 'AbortError';
    controller.abort(error);
  }, timeoutMs);

  const abortable = async <T>(operation: Promise<T>): Promise<T> => {
    if (controller.signal.aborted) throw controller.signal.reason;
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener('abort', onAbort, { once: true });
      operation.then(
        (value) => {
          controller.signal.removeEventListener('abort', onAbort);
          resolve(value);
        },
        (error) => {
          controller.signal.removeEventListener('abort', onAbort);
          reject(error);
        },
      );
    });
  };

  const requestWithToken = async (accessToken: string | null) => {
    if (expectedUserId) {
      const { data: { session }, error } = await abortable(supabase.auth.getSession());
      if (error) throw error;
      if (session?.user.id !== expectedUserId) {
        throw new Error('Japa completion owner is no longer signed in');
      }
      accessToken = session.access_token;
    } else if (expectedGuest) {
      const { data: { session }, error } = await abortable(supabase.auth.getSession());
      if (error) throw error;
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
      signal: controller.signal,
    });
  };

  try {
    // The deadline covers the startup auth gate, session lookup/refresh,
    // owner verification and transport instead of starting only at fetch().
    await abortable(waitForAuthReady());
    const accessToken = await abortable(getApiAccessToken());
    const response = await requestWithToken(accessToken);

    // React Native pauses Supabase's refresh timer while backgrounded. A
    // request can therefore carry an expired cached JWT even though the user
    // is still signed in. A 401 is safe to retry because the route did not
    // execute its protected handler. Restrict retries to replayable bodies.
    if (response.status !== 401 || !accessToken || !canReplayBody(fetchOptions.body)) {
      return response;
    }

    // Another concurrent request may already have refreshed the token while
    // this rejected request was in flight. Prefer that token before starting
    // one shared forced refresh.
    const alreadyRotatedToken = sessionHasUsableAccessToken(cachedSession)
      && cachedAccessToken !== accessToken
      ? cachedAccessToken
      : null;
    const refreshedToken = alreadyRotatedToken ?? (await abortable(refreshApiSession()))?.access_token ?? null;
    if (!refreshedToken || refreshedToken === accessToken) return response;

    return requestWithToken(refreshedToken);
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', forwardAbort);
  }
}
