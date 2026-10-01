export type ApiDiagnosticMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OTHER';
export type ApiDiagnosticOutcome =
  | 'http_failure'
  | 'network_failure'
  | 'timeout'
  | 'client_failure'
  | 'owner_mismatch'
  | 'retry_recovered'
  | 'auth_recovered'
  | 'slow_success';

export type ApiRequestDiagnostic = {
  clientEventId: string;
  endpoint: string;
  method: ApiDiagnosticMethod;
  outcome: ApiDiagnosticOutcome;
  firstStatus: number | null;
  finalStatus: number | null;
  attemptCount: number;
  durationMs: number;
  serverRequestId: string | null;
  retryServerRequestId: string | null;
  timestamp: number;
};

export const API_DIAGNOSTIC_SLOW_MS = 3_000;
export const API_DIAGNOSTIC_MAX_DURATION_MS = 180_000;

const DYNAMIC_SEGMENT_AFTER = new Set([
  'profile', 'profiles', 'user', 'users', 'post', 'posts', 'comment', 'comments',
  'member', 'members', 'mandali', 'vrat', 'festival', 'path', 'paths', 'lesson',
  'lessons', 'definition', 'definitions', 'occurrence', 'occurrences', 'kul', 'thread',
  'object', 'objects', 'bucket', 'buckets',
]);
const STATIC_SEGMENTS = new Set([
  'api', 'native', 'admin', 'upcoming', 'current', 'today', 'feed', 'nearby',
  'pending', 'register-token', 'home-summary', 'home-live', 'progress-summary',
  'recommendations', 'discover', 'context', 'paths', 'comments', 'posts',
  'questions', 'answer', 'vote', 'stats', 'observe', 'occurrence', 'roster',
  'usage', 'clear', 'batch', 'read', 'complete', 'reflection', 'recommend',
]);

/**
 * A low-cardinality route label safe for diagnostics. Query strings are always
 * removed, and resource identifiers are replaced before anything is persisted.
 */
export function normalizeApiEndpoint(path: string): string {
  const pathname = path.split(/[?#]/, 1)[0];
  const rawSegments = pathname.split('/').filter(Boolean);
  if (rawSegments[0]?.toLowerCase() !== 'api') return '/api/unknown';

  const segments: string[] = [];
  for (let index = 0; index < rawSegments.length; index += 1) {
    const raw = rawSegments[index];
    const segment = raw.toLowerCase();
    const previous = segments[index - 1];
    const looksLikeOpaqueId = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(raw)
      || /^\d{1,20}$/.test(raw)
      || raw.length > 48
      || /[@%]/.test(raw);
    const followsResource = previous ? DYNAMIC_SEGMENT_AFTER.has(previous) : false;
    const value = looksLikeOpaqueId || (followsResource && !STATIC_SEGMENTS.has(segment))
      ? ':id'
      : segment.replace(/[^a-z0-9_-]/g, '_');
    segments.push(value);
  }

  return `/${segments.slice(0, 8).join('/')}`.slice(0, 120);
}

/** Stable Supabase transport path; origin and all query values are discarded. */
export function normalizeSupabaseEndpoint(input: RequestInfo | URL, supabaseUrl: string): string | null {
  try {
    const rawUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    const base = new URL(supabaseUrl);
    const parsed = new URL(rawUrl, base);
    if (parsed.origin !== base.origin) return null;
    if (/^\/storage\/v1\/object(?:\/|$)/i.test(parsed.pathname)) {
      return '/supabase/storage/v1/object';
    }

    const segments = parsed.pathname.split('/').filter(Boolean).map((raw, index, current) => {
      const segment = raw.toLowerCase();
      const previous = current[index - 1]?.toLowerCase();
      const looksLikeOpaqueId = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(raw)
        || /^\d{1,20}$/.test(raw)
        || raw.length > 48
        || /[@%]/.test(raw);
      const followsResource = previous ? DYNAMIC_SEGMENT_AFTER.has(previous) : false;
      return looksLikeOpaqueId || (followsResource && !STATIC_SEGMENTS.has(segment))
        ? ':id'
        : segment.replace(/[^a-z0-9_-]/g, '_');
    });
    return `/supabase/${segments.slice(0, 7).join('/')}`.slice(0, 120);
  } catch {
    return null;
  }
}

export function normalizeApiDiagnosticMethod(method: string | undefined): ApiDiagnosticMethod {
  const normalized = (method ?? 'GET').toUpperCase();
  return normalized === 'GET' || normalized === 'POST' || normalized === 'PUT' || normalized === 'PATCH' || normalized === 'DELETE'
    ? normalized
    : 'OTHER';
}

export type ApiDiagnosticDecisionInput = {
  statuses: number[];
  finalStatus: number | null;
  durationMs: number;
  hadRetryableFailure?: boolean;
  terminalError?: 'network_failure' | 'timeout' | 'client_failure' | 'owner_mismatch' | 'cancelled';
};

/** Returns null for healthy, fast requests and intentional cancellations. */
export function classifyApiDiagnostic(input: ApiDiagnosticDecisionInput): ApiDiagnosticOutcome | null {
  if (input.terminalError === 'cancelled') return null;
  if (input.terminalError) return input.terminalError;

  const firstFailed = input.statuses.find((status) => status < 200 || status >= 400);
  if (input.hadRetryableFailure && input.finalStatus !== null && input.finalStatus >= 200 && input.finalStatus < 300) {
    return 'retry_recovered';
  }
  if (firstFailed !== undefined && input.finalStatus !== null && input.finalStatus >= 200 && input.finalStatus < 300) {
    return firstFailed === 401 ? 'auth_recovered' : 'retry_recovered';
  }
  if (input.finalStatus !== null && (input.finalStatus < 200 || input.finalStatus >= 400)) return 'http_failure';
  if (input.durationMs >= API_DIAGNOSTIC_SLOW_MS) return 'slow_success';
  return null;
}
