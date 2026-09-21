import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { canRetryTransientTransportFailure } from '@/lib/api-auth-policy';

const EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!EXPO_PUBLIC_SUPABASE_URL || !EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables are not configured for Shoonaya mobile.');
}

/**
 * Resilient fetch wrapper for Supabase client.
 * Retries on transient iOS socket drops (NSURLErrorNetworkConnectionLost = -1005)
 * when NSURLSession tries to reuse an idle keep-alive connection dropped by the server.
 */
const resilientFetch: typeof fetch = async (input, init) => {
  const maxRetries = 2;
  const mayRetry = canRetryTransientTransportFailure(init?.method);
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes('network connection was lost') ||
        msg.includes('Network request failed') ||
        msg.includes('Internet connection appears to be offline');

      // A transport error does not prove that a mutation was rejected by the
      // server. Replaying POST/PATCH/PUT/DELETE here can duplicate a write.
      // Durable mutation retries belong to the feature's idempotent outbox.
      if (mayRetry && attempt < maxRetries && isTransient) {
        await new Promise((res) => setTimeout(res, 250 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  return fetch(input, init);
};

export const supabase = createClient(
  EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
    global: {
      fetch: resilientFetch,
    },
  }
);
