/**
 * Typed-date input contract.
 *
 * A date a person types is text; a `date` column accepts only a real calendar date in ISO
 * form. This module is the one place that turns the first into the second, so no screen
 * sends raw typed text to the database. Before it existed, "18081991" went straight to
 * `profiles.date_of_birth` and Postgres rejected it (22008, "date/time field value out of
 * range"), failing the last step of onboarding with a generic message.
 *
 * Entry convention is day-first (DD/MM/YYYY), matching how Shoonaya's audience writes
 * dates; ISO (YYYY-MM-DD) is also accepted so existing values and pasted text still work.
 */

export type DateInputFailure = 'empty' | 'format' | 'calendar' | 'future' | 'too_old';

export type DateInputResult = { ok: true; iso: string } | { ok: false; reason: DateInputFailure };

export interface DateInputOptions {
  /** "Today" for the future check; injectable for tests. */
  now?: Date;
  /** Dates after today are valid (events, reminders) when true. A birth date is not. */
  allowFuture?: boolean;
  /** Earliest accepted year. */
  minYear?: number;
}

const DEFAULT_MIN_YEAR = 1900;

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

/** True when y-m-d is a real calendar date (rejects 31 Feb, month 13, day 0, ...). */
function isRealDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

interface Candidate {
  year: number;
  month: number;
  day: number;
}

/**
 * Eight bare digits could be DDMMYYYY or YYYYMMDD. Both readings are offered and the first that
 * passes every check wins. For years 1900 to 2099 at most one can: read year-first, the month
 * would be "19" or "20". So "18081991" is 18 Aug 1991 and "19910818" is the same date typed as ISO.
 */
function candidatesFromEightDigits(digits: string): Candidate[] {
  const dayFirst: Candidate = { day: Number(digits.slice(0, 2)), month: Number(digits.slice(2, 4)), year: Number(digits.slice(4)) };
  const yearFirst: Candidate = { year: Number(digits.slice(0, 4)), month: Number(digits.slice(4, 6)), day: Number(digits.slice(6)) };
  return [dayFirst, yearFirst];
}

function candidatesFor(text: string): Candidate[] | null {
  const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text);
  if (iso) return [{ year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) }];

  const dayFirst = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(text);
  if (dayFirst) return [{ day: Number(dayFirst[1]), month: Number(dayFirst[2]), year: Number(dayFirst[3]) }];

  if (/^\d{8}$/.test(text)) return candidatesFromEightDigits(text);
  return null;
}

/** Parses typed text into an ISO `YYYY-MM-DD` date, or says exactly why it cannot. */
export function parseDateInput(raw: string, options: DateInputOptions = {}): DateInputResult {
  const text = (raw ?? '').trim();
  if (!text) return { ok: false, reason: 'empty' };

  const candidates = candidatesFor(text);
  if (!candidates) return { ok: false, reason: 'format' };

  const now = options.now ?? new Date();
  const minYear = options.minYear ?? DEFAULT_MIN_YEAR;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  // Every reading is held to every check. Picking the first real calendar date and only then
  // checking the year would reject "19011019" (1901-10-19) because its day-first reading is a
  // real date in the year 1019, and never try the reading that is valid.
  const failures: DateInputFailure[] = [];
  for (const c of candidates) {
    if (!isRealDate(c.year, c.month, c.day)) { failures.push('calendar'); continue; }
    if (c.year < minYear) { failures.push('too_old'); continue; }
    if (!options.allowFuture && Date.UTC(c.year, c.month - 1, c.day) > today) { failures.push('future'); continue; }
    return { ok: true, iso: `${pad(c.year, 4)}-${pad(c.month, 2)}-${pad(c.day, 2)}` };
  }
  // Nothing passed: report the most useful reason (a real date that is too new or too old
  // beats "not a real date").
  return { ok: false, reason: failures.find((reason) => reason !== 'calendar') ?? 'calendar' };
}

/**
 * Formats keystrokes as DD/MM/YYYY while typing ("18081991" -> "18/08/1991"). Text that is
 * clearly being typed as ISO ("1991-0...") is left alone so it is not mangled.
 */
export function maskDateInput(raw: string): string {
  const value = raw ?? '';
  if (/^\d{4}[-./]/.test(value)) return value.replace(/[^\d\-./]/g, '').slice(0, 10);
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Stored ISO (`1991-08-18`) as the day-first text a person types and expects to see (`18/08/1991`). */
export function isoToDisplayDate(iso: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

/** A person-readable reading of a parsed date, shown back so a misread is visible ("18 Aug 1991"). */
export function formatParsedDate(iso: string, language: 'en' | 'hi' = 'en'): string {
  const [year, month, day] = iso.split('-').map(Number);
  const when = new Date(Date.UTC(year, month - 1, day));
  return when.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

/** Field-level message for a failed parse, in the language of the screen. */
export function describeDateInputFailure(
  reason: DateInputFailure,
  language: 'en' | 'hi' = 'en',
  subject: 'birth' | 'event' = 'birth',
): string {
  const hi = language === 'hi';
  switch (reason) {
    case 'future':
      return hi ? 'जन्मतिथि आज से आगे की नहीं हो सकती।' : 'A date of birth cannot be in the future.';
    case 'too_old':
      return hi ? 'कृपया 1900 या उसके बाद का वर्ष लिखें।' : 'Please enter a year from 1900 onwards.';
    case 'calendar':
      return hi ? 'यह कैलेंडर की वैध तिथि नहीं है। दिन और महीना जाँचें।' : 'That is not a real calendar date. Check the day and month.';
    case 'format':
    case 'empty':
    default:
      return subject === 'event'
        ? (hi ? 'तिथि DD/MM/YYYY रूप में लिखें, जैसे 18/08/1991।' : 'Enter the date as DD/MM/YYYY, for example 18/08/1991.')
        : (hi ? 'जन्मतिथि DD/MM/YYYY रूप में लिखें, जैसे 18/08/1991।' : 'Enter your date of birth as DD/MM/YYYY, for example 18/08/1991.');
  }
}

export type TimeInputResult = { ok: true; value: string } | { ok: false; reason: 'empty' | 'format' | 'range' };

/** Typed 24-hour time ("6:30", "06.30", "0630", "06:30") as zero-padded `HH:MM`. */
export function parseTimeOfDay(raw: string): TimeInputResult {
  const text = (raw ?? '').trim();
  if (!text) return { ok: false, reason: 'empty' };
  const match = /^(\d{1,2})[:.](\d{2})$/.exec(text) ?? /^(\d{2})(\d{2})$/.exec(text);
  if (!match) return { ok: false, reason: 'format' };
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return { ok: false, reason: 'range' };
  return { ok: true, value: `${pad(hours, 2)}:${pad(minutes, 2)}` };
}

export function describeTimeFailure(reason: 'empty' | 'format' | 'range', language: 'en' | 'hi' = 'en'): string {
  const hi = language === 'hi';
  return reason === 'range'
    ? (hi ? 'समय 00:00 से 23:59 के बीच होना चाहिए।' : 'Time must be between 00:00 and 23:59.')
    : (hi ? 'समय 24-घंटे HH:MM रूप में लिखें, जैसे 06:30।' : 'Enter the time in 24-hour HH:MM form, for example 06:30.');
}

/** Thrown when a typed date reaches a save path without having been validated. */
export class InvalidDateInputError extends Error {
  readonly field: string;
  readonly reason: DateInputFailure;

  constructor(field: string, reason: DateInputFailure) {
    super(`Invalid ${field}: ${reason}`);
    this.name = 'InvalidDateInputError';
    this.field = field;
    this.reason = reason;
  }
}
