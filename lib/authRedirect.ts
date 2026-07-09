import { supabase } from '@/lib/supabase';

const pendingCodeExchanges = new Map<string, Promise<void>>();

export function getOAuthRedirectUri() {
  return 'shoonaya://auth/callback';
}

function paramsFromUrl(url: string) {
  const queryStart = url.indexOf('?');
  const hashStart = url.indexOf('#');

  if (queryStart === -1 && hashStart === -1) {
    return new URLSearchParams();
  }

  const paramStart = queryStart === -1 ? hashStart : hashStart === -1 ? queryStart : Math.min(queryStart, hashStart);
  const paramText = url.slice(paramStart + 1);
  return new URLSearchParams(paramText);
}

export function readOAuthRedirect(url: string) {
  const params = paramsFromUrl(url);
  const error = params.get('error_description') ?? params.get('error');
  const code = params.get('code');

  return { code, error };
}

export async function waitForStoredSession(timeoutMs = 2500) {
  const startedAt = Date.now();
  let lastError: unknown = null;

  while (Date.now() - startedAt <= timeoutMs) {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (session) {
      return session;
    }

    if (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  return null;
}

export async function exchangeOAuthCodeOnce(code: string) {
  const existing = pendingCodeExchanges.get(code);

  if (existing) {
    return existing;
  }

  const exchange = (async () => {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      await waitForStoredSession(1200);
      return;
    }

    const session = await waitForStoredSession(1600);

    if (!session) {
      throw error;
    }
  })().finally(() => {
    pendingCodeExchanges.delete(code);
  });

  pendingCodeExchanges.set(code, exchange);
  return exchange;
}

export async function exchangeOAuthUrlIfPresent(url: string) {
  const { code, error } = readOAuthRedirect(url);

  if (error) {
    throw new Error(error);
  }

  if (!code) {
    return false;
  }

  await exchangeOAuthCodeOnce(code);
  return true;
}
