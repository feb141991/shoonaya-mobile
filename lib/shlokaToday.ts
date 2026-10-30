// The Shloka screen needs one thing from the backend: today's sacred text.
// It used to call /api/native/home-summary and read only `sacredText`, so a
// slow calendar, observance or Dharm Veer slice (or a 503 while the database
// stalled) held an unrelated screen open (2026-10-30, AGENTS.md section 21).

export const SHLOKA_TODAY_PATH = '/api/native/shloka/today';

// A backend that predates the route answers 404. home-summary with the
// calendar skipped returns the same `sacredText` and is the closest thing it
// has, so an over-the-air update that ships before the backend deploy still
// works. This is a compatibility path, not a second source of truth.
export const SHLOKA_COMPAT_PATH = '/api/native/home-summary?skipCalendar=true';

type SacredTextFetcher = (path: string, options: { expectedUserId: string }) => Promise<Response>;

/**
 * Fetches today's sacred text for `userId`. Falls back only on 404 (route not
 * deployed yet): a 401/503 or a network failure is the real answer and must
 * reach the caller unchanged, never be retried against a heavier route.
 */
export async function fetchTodaySacredText(
  userId: string,
  fetcher: SacredTextFetcher,
): Promise<Response> {
  const response = await fetcher(SHLOKA_TODAY_PATH, { expectedUserId: userId });
  if (response.status !== 404) return response;
  return fetcher(SHLOKA_COMPAT_PATH, { expectedUserId: userId });
}
