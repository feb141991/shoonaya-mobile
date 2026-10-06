import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { canRetryTransientTransportFailure } from '@/lib/api-auth-policy';
import { createSecureAuthStorage } from '@/lib/secureAuthStorage';
import { classifyApiDiagnostic, normalizeApiDiagnosticMethod, normalizeSupabaseEndpoint } from '@/lib/apiDiagnosticPolicy';
import { recordApiRequestDiagnostic } from '@/lib/telemetry';

const EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!EXPO_PUBLIC_SUPABASE_URL || !EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables are not configured for Shoonaya mobile.');
}

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainService: 'com.shoonaya.auth.v1',
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  requireAuthentication: false,
};
function isKeychainEntitlementError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('entitlement') ||
    message.includes('KeyChainException') ||
    message.includes('-34018') ||
    (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'ERR_SECURESTORE_KEYCHAIN_ERROR')
  );
}

let useFallbackStorage = false;

const fallbackSecureStore = {
  getItem: async (key: string) => AsyncStorage.getItem(`secure_fallback.${key}`),
  setItem: async (key: string, value: string) => AsyncStorage.setItem(`secure_fallback.${key}`, value),
  removeItem: async (key: string) => AsyncStorage.removeItem(`secure_fallback.${key}`),
};

const secureKeyValueStore = {
  getItem: async (key: string) => {
    if (useFallbackStorage) {
      return fallbackSecureStore.getItem(key);
    }
    try {
      return await SecureStore.getItemAsync(key, secureOptions);
    } catch (error) {
      if (isKeychainEntitlementError(error)) {
        useFallbackStorage = true;
        console.warn('[auth-storage] Native Keychain entitlement missing (iOS Simulator); using dev storage fallback.');
        return fallbackSecureStore.getItem(key);
      }
      throw error;
    }
  },
  setItem: async (key: string, value: string) => {
    if (useFallbackStorage) {
      return fallbackSecureStore.setItem(key, value);
    }
    try {
      await SecureStore.setItemAsync(key, value, secureOptions);
    } catch (error) {
      if (isKeychainEntitlementError(error)) {
        useFallbackStorage = true;
        console.warn('[auth-storage] Native Keychain entitlement missing (iOS Simulator); using dev storage fallback.');
        return fallbackSecureStore.setItem(key, value);
      }
      throw error;
    }
  },
  removeItem: async (key: string) => {
    if (useFallbackStorage) {
      return fallbackSecureStore.removeItem(key);
    }
    try {
      await SecureStore.deleteItemAsync(key, secureOptions);
    } catch (error) {
      if (isKeychainEntitlementError(error)) {
        useFallbackStorage = true;
        return fallbackSecureStore.removeItem(key);
      }
      throw error;
    }
  },
};

const authStorage = createSecureAuthStorage({
  legacy: AsyncStorage,
  secure: secureKeyValueStore,
  randomId: () => Crypto.randomUUID(),
  onDeferredCleanup: () => console.warn('[auth-storage] Secure migration or cleanup deferred; no credential values logged.'),
});

/**
 * Resilient fetch wrapper for Supabase client.
 * Retries on transient iOS socket drops (NSURLErrorNetworkConnectionLost = -1005)
 * when NSURLSession tries to reuse an idle keep-alive connection dropped by the server.
 */
const resilientFetch: typeof fetch = async (input, init) => {
  const maxRetries = 2;
  const mayRetry = canRetryTransientTransportFailure(init?.method);
  const startedAt = Date.now();
  const endpoint = normalizeSupabaseEndpoint(input, EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co');
  const requestMethod = normalizeApiDiagnosticMethod(
    init?.method ?? (typeof Request !== 'undefined' && input instanceof Request ? input.method : undefined),
  );
  const requestSignal = init?.signal ?? (typeof Request !== 'undefined' && input instanceof Request ? input.signal : null);
  const statuses: number[] = [];
  let attemptCount = 0;
  let hadRetryableFailure = false;

  const saveDiagnostic = (response: Response | null, terminalError?: 'network_failure' | 'timeout' | 'client_failure' | 'cancelled') => {
    try {
      if (!endpoint) return;
      const durationMs = Math.max(0, Date.now() - startedAt);
      const outcome = classifyApiDiagnostic({
        statuses,
        finalStatus: response?.status ?? null,
        durationMs,
        hadRetryableFailure,
        terminalError,
      });
      if (!outcome) return;

      const firstRequestId = statuses.length > 0 ? requestIds[0] ?? null : null;
      const lastRequestId = statuses.length > 0 ? requestIds.at(-1) ?? null : null;
      const isUuid = (value: string | null): value is string => Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
      const serverRequestId = isUuid(firstRequestId) ? firstRequestId : null;
      const latestRequestId = isUuid(lastRequestId) ? lastRequestId : null;
      recordApiRequestDiagnostic({
        clientEventId: Crypto.randomUUID(),
        endpoint,
        method: requestMethod,
        outcome,
        firstStatus: statuses[0] ?? null,
        finalStatus: response?.status ?? null,
        attemptCount,
        durationMs: Math.min(durationMs, 180_000),
        serverRequestId,
        retryServerRequestId: latestRequestId && latestRequestId !== serverRequestId ? latestRequestId : null,
        timestamp: Date.now(),
      });
    } catch {
      // Observability must never alter the request's network result.
    }
  };
  const requestIds: Array<string | null> = [];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      attemptCount += 1;
      const response = await fetch(input, init);
      statuses.push(response.status);
      requestIds.push(response.headers.get('x-request-id'));
      saveDiagnostic(response);
      return response;
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
        hadRetryableFailure = true;
        await new Promise((res) => setTimeout(res, 250 * (attempt + 1)));
        continue;
      }
      if (requestSignal?.aborted) saveDiagnostic(null, 'cancelled');
      else if (err instanceof Error && err.name === 'AbortError') saveDiagnostic(null, 'timeout');
      else if (isTransient) saveDiagnostic(null, 'network_failure');
      else saveDiagnostic(null, 'client_failure');
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
      storage: authStorage,
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
