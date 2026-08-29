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

async function getApiAccessToken(): Promise<string | null> {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  setApiAccessTokenFromSession(session);
  return session?.access_token ?? null;
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const { timeoutMs = DEFAULT_API_TIMEOUT_MS, ...fetchOptions } = options;
  const headers = new Headers(options.headers ?? {});
  const accessToken = await getApiAccessToken();

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const controller = fetchOptions.signal ? null : new AbortController();
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    return await fetch(`${API_BASE}${normalizedPath}`, {
      ...fetchOptions,
      headers,
      signal: fetchOptions.signal ?? controller?.signal,
    });
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
