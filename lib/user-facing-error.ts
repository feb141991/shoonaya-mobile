/**
 * What a person is told when something fails.
 *
 * A screen must never show `error.message`. Our own code throws messages meant for developers ("Request failed
 * (status 500)"), the server's `error` strings are written for developers too ("Invalid request body", "Missing entry
 * id", "Internal Server Error"), and the runtime adds its own ("Network request failed", "JSON Parse error"). None of
 * that helps a person, some of it carries table or column detail, and "Check your connection" is wrong for most of it.
 *
 * Instead a screen throws `await requestErrorFromResponse(response)` when the server answers with a failure, and shows
 * `describeFailure(error, 'Could not create Sankalpa. Please try again.')` in its catch. The status decides the cause:
 * offline, signed out, not allowed, too many requests, server trouble; anything else gets the screen's own sentence.
 * A support reference (the first eight characters of the server's request id) is added only where nothing can be fixed
 * by the person and support can actually find it. Status codes and server text stay in the logs.
 *
 * `__tests__/user-facing-errors-guard.test.ts` fails if a screen puts an error's message on screen again.
 */
import type { DateInputFailure } from './date-input';

export type FailureKind = 'network' | 'session' | 'permission' | 'rate_limited' | 'server' | 'refused' | 'unknown';

const DATE_FAILURES: readonly DateInputFailure[] = ['empty', 'format', 'calendar', 'future', 'too_old'];

/**
 * A request that reached the server and was refused. Carries the HTTP status, the API's own short code and date
 * reason (our routes return fixed strings such as INVALID_DATE_OF_BIRTH) and the server's request id. It never carries
 * the response text unless the call site opted in because that route writes its message for people.
 */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly apiCode: string | null = null,
    readonly dateReason: DateInputFailure | null = null,
    /** The server's x-request-id for this response, if it sent one. Searchable in the server logs. */
    readonly requestId: string | null = null,
    /** A server message the call site chose to trust because that route writes it for people. */
    readonly userMessage: string | null = null,
  ) {
    super(`request failed (HTTP ${status})`);
    this.name = 'ApiRequestError';
  }

  /** What a person can read out to support: the first eight characters of the request id, or null. */
  get supportReference(): string | null {
    return this.requestId ? this.requestId.slice(0, 8).toLowerCase() : null;
  }
}

/**
 * Builds the error for a non-OK response. Reads only the fixed `code` and `reason` fields and the request id header.
 * The body text is ignored unless `trustServerMessage` is set, for the few routes whose `error` is written for people
 * (for example "you can only regenerate your name story once every 30 days").
 */
export async function requestErrorFromResponse(
  response: { status: number; json: () => Promise<unknown>; headers?: { get(name: string): string | null } },
  options: { trustServerMessage?: boolean; parsedBody?: unknown } = {},
): Promise<ApiRequestError> {
  let body: { code?: unknown; reason?: unknown; error?: unknown } | null = null;
  try {
    // A caller that already read the body passes it in: a response body can only be read once.
    const parsed = 'parsedBody' in options ? options.parsedBody : await response.json();
    if (parsed && typeof parsed === 'object') body = parsed as { code?: unknown; reason?: unknown; error?: unknown };
  } catch { /* an HTML or empty error page: the status alone decides */ }
  const apiCode = typeof body?.code === 'string' && /^[A-Z_]{3,40}$/.test(body.code) ? body.code : null;
  const reason = DATE_FAILURES.find((r) => r === body?.reason) ?? null;
  let requestId: string | null = null;
  try {
    const header = response.headers?.get('x-request-id') ?? null;
    if (header && /^[A-Za-z0-9-]{8,64}$/.test(header)) requestId = header;
  } catch { /* no usable header: no reference is shown */ }
  const trusted =
    options.trustServerMessage && typeof body?.error === 'string' && body.error.trim().length > 0 && body.error.length <= 240
      ? body.error.trim()
      : null;
  return new ApiRequestError(response.status, apiCode, reason, requestId, trusted);
}

/**
 * An error whose message our own code wrote for the person, such as "The family response was incomplete. Refresh and
 * try again." It is the only way a thrown message is allowed to reach the screen, and it must be deliberate.
 */
export class UserMessageError extends Error {
  constructor(readonly userMessage: string) {
    super(userMessage);
    this.name = 'UserMessageError';
  }
}

interface ErrorShape {
  code?: unknown;
  status?: unknown;
  message?: unknown;
  name?: unknown;
}

/** Why a request failed, as far as can be told. Never reads or returns server text. */
export function classifyFailure(error: unknown): { kind: FailureKind; status: number | null } {
  if (error instanceof ApiRequestError) {
    const status = error.status;
    if (status === 401) return { kind: 'session', status };
    if (status === 403) return { kind: 'permission', status };
    if (status === 429) return { kind: 'rate_limited', status };
    if (status >= 500) return { kind: 'server', status };
    if (status === 400 || status === 422) return { kind: 'refused', status };
    return { kind: 'unknown', status };
  }
  const shape: ErrorShape | null = error && typeof error === 'object' ? (error as ErrorShape) : null;
  const code = shape && (typeof shape.code === 'string' || typeof shape.code === 'number') ? String(shape.code) : '';
  const status = shape && typeof shape.status === 'number' ? shape.status : null;
  if (code === '42501' || status === 403) return { kind: 'permission', status };
  if (code === 'PGRST301' || code === 'PGRST303' || status === 401) return { kind: 'session', status };
  const message = shape && typeof shape.message === 'string' ? shape.message : '';
  const name = shape && typeof shape.name === 'string' ? shape.name : '';
  if (
    name === 'AbortError' ||
    error instanceof TypeError ||
    /network request failed|failed to fetch|network error|timed out|timeout/i.test(message)
  ) {
    return { kind: 'network', status: null };
  }
  // An answer that is not JSON (an HTML error page from a proxy, a cut-off body) is trouble on the server's side.
  if (/json parse error|unexpected (token|character|end of json)/i.test(message)) return { kind: 'server', status: null };
  return { kind: 'unknown', status };
}

const COPY = {
  network: {
    en: 'Could not reach the internet. Check your connection and try again.',
    hi: 'इंटरनेट से जुड़ नहीं सके। कनेक्शन जाँचकर फिर कोशिश करें।',
  },
  session: {
    en: 'Your session has expired. Please sign in again.',
    hi: 'आपका सत्र समाप्त हो गया है। कृपया फिर से साइन इन करें।',
  },
  permission: {
    en: 'Your account is not allowed to do that. Please contact support.',
    hi: 'आपके खाते को यह करने की अनुमति नहीं है। कृपया सहायता से संपर्क करें।',
  },
  rate_limited: {
    en: 'Too many attempts just now. Please wait a moment and try again.',
    hi: 'अभी बहुत अधिक प्रयास हो गए। कृपया थोड़ी देर रुककर फिर कोशिश करें।',
  },
  server: {
    en: 'Something went wrong on our side, not on your phone. Please try again in a moment.',
    hi: 'हमारी ओर से कोई समस्या हुई। कृपया थोड़ी देर बाद फिर कोशिश करें।',
  },
} as const;

/**
 * The sentence to show. `fallback` is the screen's own plain-language line for "this did not work", used whenever the
 * cause is not one of the generic ones above (a refused value, a missing item, anything unclassified).
 */
export function describeFailure(
  error: unknown,
  fallback: string,
  appLanguage: string = 'en',
  /** A screen's own sentence for a specific HTTP status, such as 409 "that username is taken". */
  byStatus: Readonly<Partial<Record<number, string>>> = {},
): string {
  if (error instanceof UserMessageError) return error.userMessage;
  if (error instanceof ApiRequestError) {
    if (error.userMessage) return error.userMessage;
    const own = byStatus[error.status];
    if (own) return own;
  }
  // Punjabi wording is not written yet, so it reads the English line rather than a wrong translation.
  const language: 'en' | 'hi' = appLanguage === 'hi' ? 'hi' : 'en';
  const { kind } = classifyFailure(error);
  const text = kind === 'refused' || kind === 'unknown' ? fallback : COPY[kind][language];
  const reference =
    (kind === 'server' || kind === 'permission' || kind === 'unknown') && error instanceof ApiRequestError
      ? error.supportReference
      : null;
  if (!reference) return text;
  return language === 'hi' ? `${text} सहायता संदर्भ: ${reference}।` : `${text} Support reference: ${reference}.`;
}
