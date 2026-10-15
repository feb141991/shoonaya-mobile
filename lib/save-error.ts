/**
 * Turns whatever a save path threw into a message a person can act on.
 *
 * The onboarding save used to show `error.message` when the thrown value was an `Error` and
 * a generic line otherwise. Supabase database errors are plain objects, not `Error`s, so the
 * real reason ("date/time field value out of range") never reached the screen and the generic
 * line was all anyone saw. Raw provider text must not reach the UI either (it can carry
 * table, column and query detail), so this maps by SQLSTATE / status and never echoes it.
 */
import { InvalidDateInputError, describeDateInputFailure } from './date-input';

export type SaveErrorKind =
  | 'invalid_date'
  | 'invalid_value'
  | 'permission'
  | 'session'
  | 'conflict'
  | 'network'
  | 'unknown';

export interface ClassifiedSaveError {
  kind: SaveErrorKind;
  /** SQLSTATE or HTTP status when one was present; safe to show as a support reference. */
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
export function describeSaveError(error: unknown, language: 'en' | 'hi' = 'en'): string {
  const hi = language === 'hi';
  const { kind, code } = classifySaveError(error);
  const ref = code ? (hi ? ` (संदर्भ ${code})` : ` (ref ${code})`) : '';

  switch (kind) {
    case 'invalid_date': {
      const reason = error instanceof InvalidDateInputError ? error.reason : 'calendar';
      return describeDateInputFailure(reason, language);
    }
    case 'invalid_value':
      return (hi ? 'कोई जानकारी सही रूप में नहीं है। कृपया अपने उत्तर जाँचकर फिर कोशिश करें।' : 'One of your answers is not in a form we can save. Please check them and try again.') + ref;
    case 'conflict':
      return (hi ? 'यह जानकारी पहले से सहेजी हुई है। कृपया फिर कोशिश करें।' : 'This was already saved. Please try again.') + ref;
    case 'permission':
      return (hi ? 'आपके खाते को यह बदलाव सहेजने की अनुमति नहीं मिली। कृपया सहायता से संपर्क करें।' : 'Your account could not save this change. Please contact support.') + ref;
    case 'session':
      return hi ? 'आपका सत्र समाप्त हो गया है। जारी रखने के लिए कृपया फिर से साइन इन करें।' : 'Your session has expired. Please sign in again to finish setup.';
    case 'network':
      return hi ? 'इंटरनेट से जुड़ नहीं सके। कनेक्शन जाँचकर फिर कोशिश करें, आपके उत्तर सुरक्षित हैं।' : 'Could not reach the internet. Check your connection and try again; your answers are kept.';
    case 'unknown':
    default:
      return (hi ? 'ऑनबोर्डिंग सहेजने में असमर्थ। कृपया पुनः प्रयास करें।' : 'Unable to save onboarding. Please try again.') + ref;
  }
}
