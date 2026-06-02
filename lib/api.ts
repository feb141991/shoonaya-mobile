import { API_BASE } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(options.headers ?? {});
  const accessToken = session?.access_token;

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return fetch(`${API_BASE}${normalizedPath}`, {
    ...options,
    headers,
  });
}
