import { captureAppIdentity } from './appIdentity';
import { createGetRequestSingleFlight, getRequestKey } from './getRequestSingleFlight';
import { API_BASE } from '@/lib/constants';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { isFetchCancelled } from './fetch-error';
import { DEFAULT_API_TIMEOUT_MS } from './api-policy';
import { waitForAuthReady } from './authReadyGate';
import { sessionHasUsableAccessToken } from './api-auth-policy';
import { createSingleFlight } from './async-single-flight';
import { retryTransientReadOnce } from './api-503-retry';
import { classifyApiDiagnostic, normalizeApiDiagnosticMethod, normalizeApiEndpoint } from './apiDiagnosticPolicy';
import { recordApiRequestDiagnostic, recordAuthDiagnostic, type AuthDiagnosticCode, type AuthDiagnosticRoute } from './telemetry';

export { isFetchCancelled };

export type ApiFetchOptions = RequestInit & {
  /** Override the default request deadline for legitimately long-running APIs. */
  timeoutMs?: number;
  /** Disable sharing for streaming or deliberately independent GET reads. */
  dedupe?: boolean;
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

function authDiagnosticRoute(path: string): AuthDiagnosticRoute {
  const pathname = path.split(/[?#]/, 1)[0].replace(/\/$/, '');
  const routes: Record<string, AuthDiagnosticRoute> = {
    '/api/native/home-summary': 'native_home_summary',
    '/api/sankalpa': 'sankalpa',
    '/api/notifications/register-token': 'register_token',
    '/api/native/festival-quiz-seasons': 'festival_quiz_seasons',
    '/api/ai/chat/usage': 'ai_chat_usage',
    '/api/native/home-live': 'native_home_live',
    '/api/dharm-veer/submit': 'dharm_veer_submit',
  };
  return routes[pathname] ?? 'other';
}

function recordAuthOutcome(input: {
  path: string;
  requestId: string;
  initialStatus: number;
  finalStatus: number;
  authReadyWaitMs: number;
  hadAccessToken: boolean;
  refreshAttempted: boolean;
  refreshSucceeded: boolean;
  durationMs: number;
  response?: Response;
  finalResponse?: Response;
}) {
  const route = authDiagnosticRoute(input.path);
  if (route === 'other') return;
  const base = {
    requestId: input.response?.headers.get('x-request-id') ?? input.requestId,
    retryRequestId: input.response && input.finalResponse && input.response !== input.finalResponse
      ? input.finalResponse.headers.get('x-request-id')
      : null,
    route,
    initialStatus: input.initialStatus,
    finalStatus: input.finalStatus,
    authReadyWaitMs: input.authReadyWaitMs,
    hadAccessToken: input.hadAccessToken,
    refreshAttempted: input.refreshAttempted,
    refreshSucceeded: input.refreshSucceeded,
    durationMs: input.durationMs,
    timestamp: Date.now(),
  };
  const save = (authCode: AuthDiagnosticCode) => recordAuthDiagnostic({ ...base, authCode });
  if (!input.response) {
    if (input.initialStatus === 0) save('unknown');
    return;
  }
  void input.response.clone().json().then((body: unknown) => {
    const code = body && typeof body === 'object' && 'code' in body ? body.code : null;
    if (code === 'AUTH_REQUIRED' || code === 'AUTH_UNAVAILABLE') save(code);
    else if (input.initialStatus === 401 || input.initialStatus === 503) save('unknown');
  }).catch(() => {
    if (input.initialStatus === 401 || input.initialStatus === 503) save('unknown');
  });
}

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

const getRequests = createGetRequestSingleFlight();

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const lease = captureAppIdentity();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const { dedupe: _dedupe, ...requestOptions } = options;
  const isGet = (options.method ?? 'GET').toUpperCase() === 'GET';
  // Known-identity reads must not be sent or replayed under a later account.
  const guardedOptions = isGet && lease.identity.kind === 'authenticated'
    ? { ...requestOptions, expectedUserId: requestOptions.expectedUserId ?? lease.identity.userId }
    : requestOptions;
  const checkOwner = () => {
    if (lease.identity.kind !== 'loading' && !lease.isCurrent()) {
      throw Object.assign(new Error('Request identity changed'), { name: 'AbortError' });
    }
  };
  const send = async (signal?: AbortSignal | null) => {
    const response = await performApiFetch(normalizedPath, { ...guardedOptions, signal }, isGet ? checkOwner : undefined);
    if (isGet) checkOwner();
    return response;
  };
  // Do not share pre-identity bootstrap requests with post-restore consumers.
  const key = lease.identity.kind === 'loading' ? null
    : getRequestKey(String(lease.revision), normalizedPath, options);
  return key ? getRequests.run(key, send, options.signal) : send(options.signal);
}

async function performApiFetch(path: string, options: ApiFetchOptions = {}, checkOwner?: () => void) {
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
  const requestId = Crypto.randomUUID();
  const requestStartedAt = Date.now();
  const requestMethod = normalizeApiDiagnosticMethod(fetchOptions.method);
  let authReadyWaitMs = 0;
  let hadAccessToken = false;
  let initialAuthResponse: Response | undefined;
  let refreshAttempted = false;
  let refreshSucceeded = false;
  let requestSent = false;
  let attemptCount = 0;
  let finalResponse: Response | null = null;
  let terminalError: 'network_failure' | 'timeout' | 'client_failure' | 'owner_mismatch' | 'cancelled' | undefined;
  const responseHistory: Response[] = [];
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
    checkOwner?.();
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
    checkOwner?.();
    if (controller.signal.aborted) throw controller.signal.reason;
    const requestHeaders = new Headers(headers);
    requestHeaders.set('X-Request-ID', requestId);
    if (accessToken) requestHeaders.set('Authorization', `Bearer ${accessToken}`);
    else requestHeaders.delete('Authorization');

    requestSent = true;
    attemptCount += 1;
    const response = await fetch(`${API_BASE}${normalizedPath}`, {
      ...fetchOptions,
      headers: requestHeaders,
      signal: controller.signal,
    });
    responseHistory.push(response);
    finalResponse = response;
    return response;
  };

  try {
    // The deadline covers the startup auth gate, session lookup/refresh,
    // owner verification and transport instead of starting only at fetch().
    const authGateStartedAt = Date.now();
    await abortable(waitForAuthReady());
    authReadyWaitMs = Date.now() - authGateStartedAt;
    const accessToken = await abortable(getApiAccessToken());
    hadAccessToken = Boolean(accessToken);
    let response = await requestWithToken(accessToken);
    if (response.status === 401 || response.status === 503) initialAuthResponse = response;

    // Retry only a bodyless GET: a 503 from a write route may follow a partial
    // side effect, and replayable bytes alone do not make repeating it safe.
    response = await retryTransientReadOnce(
      response,
      () => requestWithToken(accessToken),
      fetchOptions.method,
      fetchOptions.body,
      () => abortable(new Promise<void>((resolve) => setTimeout(resolve, 500))),
    );
    finalResponse = response;

    // React Native pauses Supabase's refresh timer while backgrounded. A
    // request can therefore carry an expired cached JWT even though the user
    // is still signed in. A 401 is safe to retry because the route did not
    // execute its protected handler. Restrict retries to replayable bodies.
    if (response.status !== 401 || !accessToken || !canReplayBody(fetchOptions.body)) {
      if (initialAuthResponse) {
        recordAuthOutcome({
          path: normalizedPath, requestId, initialStatus: initialAuthResponse.status,
          finalStatus: response.status, authReadyWaitMs, hadAccessToken,
          refreshAttempted, refreshSucceeded, durationMs: Date.now() - requestStartedAt,
          response: initialAuthResponse,
          finalResponse: response,
        });
      }
      return response;
    }

    // Another concurrent request may already have refreshed the token while
    // this rejected request was in flight. Prefer that token before starting
    // one shared forced refresh.
    const alreadyRotatedToken = sessionHasUsableAccessToken(cachedSession)
      && cachedAccessToken !== accessToken
      ? cachedAccessToken
      : null;
    refreshAttempted = true;
    const refreshedToken = alreadyRotatedToken ?? (await abortable(refreshApiSession()))?.access_token ?? null;
    refreshSucceeded = Boolean(refreshedToken && refreshedToken !== accessToken);
    if (!refreshedToken || refreshedToken === accessToken) {
      recordAuthOutcome({
        path: normalizedPath, requestId, initialStatus: initialAuthResponse?.status ?? response.status,
        finalStatus: response.status, authReadyWaitMs, hadAccessToken,
        refreshAttempted, refreshSucceeded, durationMs: Date.now() - requestStartedAt,
        response: initialAuthResponse ?? response,
        finalResponse: response,
      });
      return response;
    }

    response = await requestWithToken(refreshedToken);
    finalResponse = response;
    recordAuthOutcome({
      path: normalizedPath, requestId, initialStatus: initialAuthResponse?.status ?? 401,
      finalStatus: response.status, authReadyWaitMs, hadAccessToken,
      refreshAttempted, refreshSucceeded, durationMs: Date.now() - requestStartedAt,
      response: initialAuthResponse,
      finalResponse: response,
    });
    return response;
  } catch (error) {
    if (!terminalError) {
      if (callerSignal?.aborted) terminalError = 'cancelled';
      else if (controller.signal.aborted) terminalError = 'timeout';
      else if (error instanceof TypeError) terminalError = 'network_failure';
      else if (error instanceof Error && /owner|identity changed/i.test(error.message)) terminalError = 'owner_mismatch';
      else terminalError = 'client_failure';
    }
    if (initialAuthResponse || !requestSent) {
      recordAuthOutcome({
        path: normalizedPath, requestId, initialStatus: initialAuthResponse?.status ?? 0,
        finalStatus: 0, authReadyWaitMs, hadAccessToken, refreshAttempted,
        refreshSucceeded, durationMs: Date.now() - requestStartedAt,
        response: initialAuthResponse,
        finalResponse: initialAuthResponse,
      });
    }
    throw error;
  } finally {
    try {
      const durationMs = Math.max(0, Date.now() - requestStartedAt);
      const outcome = classifyApiDiagnostic({
        statuses: responseHistory.map((response) => response.status),
        finalStatus: finalResponse?.status ?? null,
        durationMs,
        terminalError,
      });
      if (outcome) {
        const firstServerRequestId = responseHistory[0]?.headers.get('x-request-id') ?? null;
        const lastServerRequestId = responseHistory.at(-1)?.headers.get('x-request-id') ?? null;
        const isUuid = (value: string | null): value is string => Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
        const serverRequestId = isUuid(firstServerRequestId) ? firstServerRequestId : null;
        const latestRequestId = isUuid(lastServerRequestId) ? lastServerRequestId : null;
        recordApiRequestDiagnostic({
          clientEventId: Crypto.randomUUID(),
          endpoint: normalizeApiEndpoint(normalizedPath),
          method: requestMethod,
          outcome,
          firstStatus: responseHistory[0]?.status ?? null,
          finalStatus: finalResponse?.status ?? null,
          attemptCount,
          durationMs: Math.min(durationMs, 180_000),
          serverRequestId,
          retryServerRequestId: latestRequestId && latestRequestId !== serverRequestId ? latestRequestId : null,
          timestamp: Date.now(),
        });
      }
    } catch {
      // Diagnostics are best-effort and never change the request's result.
    }
    clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', forwardAbort);
  }
}
