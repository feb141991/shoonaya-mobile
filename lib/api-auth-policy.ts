import type { Session } from '@supabase/supabase-js';

export const ACCESS_TOKEN_REFRESH_LEEWAY_MS = 60_000;

export function sessionHasUsableAccessToken(
  session: Pick<Session, 'access_token' | 'expires_at'> | null,
  nowMs = Date.now(),
  leewayMs = ACCESS_TOKEN_REFRESH_LEEWAY_MS,
): boolean {
  if (!session?.access_token) return false;
  if (typeof session.expires_at !== 'number') return true;
  return session.expires_at * 1000 > nowMs + leewayMs;
}

export function canRetryTransientTransportFailure(method: string | undefined): boolean {
  const normalized = (method ?? 'GET').toUpperCase();
  return normalized === 'GET' || normalized === 'HEAD' || normalized === 'OPTIONS';
}
