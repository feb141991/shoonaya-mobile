/**
 * Turns whatever a save path threw into a message a person can act on.
 *
 * The onboarding save used to show `error.message` when the thrown value was an `Error` and
 * a generic line otherwise. Supabase database errors are plain objects, not `Error`s, so the
 * real reason ("date/time field value out of range") never reached the screen and the generic
 * line was all anyone saw. Raw provider text must not reach the UI either (it can carry
 * table, column and query detail), so this maps by SQLSTATE / status and never echoes it.
 */
import { InvalidDateInputError, describeDateInputFailure, type DateInputFailure } from './date-input';

export type SaveErrorKind =
  | 'invalid_date'
  | 'invalid_value'
  | 'permission'
  | 'session'
  | 'conflict'
  | 'network'
  | 'server'
  | 'unknown';

/** Which screen is saving. It only changes the wording of the fallback and session lines. */
export type SaveSubject = 'onboarding' | 'details';

const DATE_FAILURES: readonly DateInputFailure[] = ['empty', 'format', 'calendar', 'future', 'too_old'];

/**
 * A save that reached the server and was refused. Carries only the HTTP status and the API's own short code and
 * date reason (our routes return fixed strings such as INVALID_DATE_OF_BIRTH), never the response text.
 */
export class ApiSaveError extends Error {
  constructor(
    readonly status: number,
    readonly apiCode: string | null = null,
    readonly dateReason: DateInputFailure | null = null,
    /** The server's x-request-id for this response, if it sent one. Searchable in the server logs. */
    readonly requestId: string | null = null,
  ) {
    super(`save failed (HTTP ${status})`);
    this.name = 'ApiSaveError';
  }

  /** What a person can read out to support: the first eight characters of the request id, or null. */
  get supportReference(): string | null {
    return this.requestId ? this.requestId.slice(0, 8).toLowerCase() : null;
  }
}

/** Builds the error for a non-OK response. Reads only the fixed `code` and `reason` fields; the body is otherwise ignored. */
export async function saveErrorFromResponse(response: {
  status: number;
  json: () => Promise<unknown>;
  headers?: { get(name: string): string | null };
}): Promise<ApiSaveError> {
  let body: { code?: unknown; reason?: unknown } | null = null;
  try {
    const parsed = await response.json();
    if (parsed && typeof parsed === 'object') body = parsed as { code?: unknown; reason?: unknown };
  } catch { /* an HTML or empty error page: the status alone decides */ }
  const apiCode = typeof body?.code === 'string' && /^[A-Z_]{3,40}$/.test(body.code) ? body.code : null;
  const reason = DATE_FAILURES.find((r) => r === body?.reason) ?? null;
  let requestId: string | null = null;
  try {
    const header = response.headers?.get('x-request-id') ?? null;
    if (header && /^[A-Za-z0-9-]{8,64}$/.test(header)) requestId = header;
  } catch { /* no usable header: no reference is shown */ }
  return new ApiSaveError(response.status, apiCode, reason, requestId);
}

export interface ClassifiedSaveError {
  kind: SaveErrorKind;
  /** SQLSTATE or HTTP status when one was present. For logs and developers only: it is never shown to a person. */
  code: string | null;
}

interface ProviderErrorShape {
  code?: unknown;
  status?: unknown;
  message?: unknown;
  name?: unknown;
}

function asShape(error: unknown): ProviderErrorShape | null {
  return error && typeof error === 'object' ? (error as ProviderErrorShape) : null;
}

export function classifySaveError(error: unknown): ClassifiedSaveError {
  if (error instanceof InvalidDateInputError) return { kind: 'invalid_date', code: null };

  if (error instanceof ApiSaveError) {
    const ref = String(error.status);
    if (error.apiCode === 'INVALID_DATE_OF_BIRTH' || error.apiCode === 'INVALID_TIME_OF_BIRTH') return { kind: 'invalid_date', code: ref };
    if (error.status === 401) return { kind: 'session', code: ref };
    if (error.status === 403) return { kind: 'permission', code: ref };
    if (error.status === 409) return { kind: 'conflict', code: ref };
    if (error.apiCode === 'INVALID_VALUE' || error.status === 400 || error.status === 422) return { kind: 'invalid_value', code: ref };
    if (error.status === 429 || error.status >= 500) return { kind: 'server', code: ref };
    return { kind: 'unknown', code: ref };
  }

  const shape = asShape(error);
  const code = shape && (typeof shape.code === 'string' || typeof shape.code === 'number') ? String(shape.code) : null;
  const status = shape && (typeof shape.status === 'number' || typeof shape.status === 'string') ? String(shape.status) : null;
  const ref = code ?? status;

  // SQLSTATE class 22 (data exception): 22007/22008 are bad dates, the rest bad values.
  if (code === '22007' || code === '22008') return { kind: 'invalid_date', code };
  if (code && (code.startsWith('22') || code === '23514' || code === '23502')) return { kind: 'invalid_value', code };
  if (code === '23505') return { kind: 'conflict', code };
  if (code === '42501' || status === '403') return { kind: 'permission', code: ref };
  if (code === 'PGRST301' || code === 'PGRST303' || status === '401') return { kind: 'session', code: ref };

  const message = shape && typeof shape.message === 'string' ? shape.message : '';
  const name = shape && typeof shape.name === 'string' ? shape.name : '';
  if (name === 'AbortError' || /network request failed|failed to fetch|network error|timed out|timeout/i.test(message)) {
    return { kind: 'network', code: null };
  }
  return { kind: 'unknown', code: ref };
}

/** The message shown to the user. Never contains provider text; may carry a short reference. */
export function describeSaveError(error: unknown, language: 'en' | 'hi' = 'en', subject: SaveSubject = 'onboarding'): string {
  const hi = language === 'hi';
  const details = subject === 'details';
  const { kind } = classifySaveError(error);
  // A person is only given a reference when there is nothing they can fix themselves and support can actually find
  // it: the server's request id. A status code or a database error code means nothing to them and finds nothing.
  const reference = (kind === 'server' || kind === 'unknown' || kind === 'permission') && error instanceof ApiSaveError
    ? error.supportReference
    : null;
  const ref = reference ? (hi ? ` सहायता संदर्भ: ${reference}।` : ` Support reference: ${reference}.`) : '';

  switch (kind) {
    case 'invalid_date': {
      const reason = error instanceof InvalidDateInputError ? error.reason : error instanceof ApiSaveError && error.dateReason ? error.dateReason : 'calendar';
      return describeDateInputFailure(reason, language);
    }
    case 'invalid_value':
      return (hi ? 'कोई जानकारी सही रूप में नहीं है। कृपया अपने उत्तर जाँचकर फिर कोशिश करें।' : 'One of your answers is not in a form we can save. Please check them and try again.') + ref;
    case 'conflict':
      return (hi ? 'यह जानकारी पहले से सहेजी हुई है। कृपया फिर कोशिश करें।' : 'This was already saved. Please try again.') + ref;
    case 'permission':
      return (hi ? 'आपके खाते को यह बदलाव सहेजने की अनुमति नहीं मिली। कृपया सहायता से संपर्क करें।' : 'Your account could not save this change. Please contact support.') + ref;
    case 'session':
      return hi
        ? 'आपका सत्र समाप्त हो गया है। जारी रखने के लिए कृपया फिर से साइन इन करें।'
        : details
          ? 'Your session has expired. Please sign in again, then save your details.'
          : 'Your session has expired. Please sign in again to finish setup.';
    case 'server':
      return (hi ? 'हमारी ओर से कोई समस्या हुई। कृपया थोड़ी देर बाद फिर कोशिश करें।' : 'Something went wrong on our side, not on your phone. Please try again in a moment.') + ref;
    case 'network':
      return hi ? 'इंटरनेट से जुड़ नहीं सके। कनेक्शन जाँचकर फिर कोशिश करें, आपके उत्तर सुरक्षित हैं।' : 'Could not reach the internet. Check your connection and try again; your answers are kept.';
    case 'unknown':
    default:
      return (details
        ? (hi ? 'आपका विवरण सहेजने में असमर्थ। कृपया पुनः प्रयास करें।' : 'Unable to save your details. Please try again.')
        : (hi ? 'ऑनबोर्डिंग सहेजने में असमर्थ। कृपया पुनः प्रयास करें।' : 'Unable to save onboarding. Please try again.')) + ref;
  }
}
