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

// A cancelled request isn't a failure worth logging as an error — it's the
// expected outcome of the screen that started it losing focus, backgrounding,
// or unmounting before the native layer finished the round trip (iOS surfaces
// this as `FetchRequestCanceledException` from Expo's own fetch module,
// distinct from apiFetch's own 15s-timeout AbortError). Callers that catch
// around apiFetch and log on failure should check this first and skip the
// log for a cancellation, since it's a completely benign race, not a real
// backend/network problem — logging it as an ERROR just creates noise (and,
// in production, false alarms in whatever's watching console.error).
export function isFetchCancelled(err: unknown): boolean {
  if (err instanceof Error && err.name === 'AbortError') return true;
  const message = err instanceof Error ? err.message : String(err);
  return /cancel/i.test(message);
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
