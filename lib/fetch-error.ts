// Deliberately dependency-free (no @/lib/api, no @/lib/supabase): pulling
// react-native-url-polyfill/@react-native-async-storage transitively through
// api.ts breaks the plain esbuild transform the __tests__/*.test.ts suite
// uses, for any test file that only needs this one pure check.

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
