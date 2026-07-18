import { API_BASE } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

let cachedAccessToken: string | null | undefined;

export function setApiAccessTokenFromSession(session: Session | null) {
  cachedAccessToken = session?.access_token ?? null;
}

async function getApiAccessToken() {
  if (cachedAccessToken !== undefined) {
    return cachedAccessToken;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  setApiAccessTokenFromSession(session);
  return cachedAccessToken;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers ?? {});
  const accessToken = await getApiAccessToken();

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const controller = options.signal ? null : new AbortController();
  const timeout = controller ? setTimeout(() => controller.abort(), 15000) : null;

  try {
    return await fetch(`${API_BASE}${normalizedPath}`, {
      ...options,
      headers,
      signal: options.signal ?? controller?.signal,
    });
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
