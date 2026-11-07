import { parseDateInput, type DateInputFailure } from '@/lib/date-input';

/**
 * The child's side of an early Sanskāra hand-over (backend migration 20261104100000): the account that enters the code must have a date
 * of birth in its profile that equals the birth date the parents recorded. Without one the server answers the same "not found" it gives
 * for a wrong code, so a child with no date of birth saved would be told nothing useful. The code field therefore offers to save it first.
 *
 * Rules (AGENTS 12 and 18):
 *   - a stored date is never overwritten here: the card exists only for a profile that has none;
 *   - a failed read is not "no date of birth": it offers nothing, so a broken read can never lead to a write;
 *   - the date goes through the shared parser before it is sent, and the earliest allowed year matches the profile contract.
 */

export const BIRTH_DATE_MIN_YEAR = 1920;
export const BIRTH_DATE_MIN = `${BIRTH_DATE_MIN_YEAR}-01-01`;

export type BirthDateState = 'loading' | 'saved' | 'missing' | 'unknown';

type ProfileRead = { data: { date_of_birth: string | null } | null; error: unknown } | null;

/** What the profile read says. Only a successful read of an existing row with an empty date is "missing". */
export function birthDateState(read: ProfileRead): BirthDateState {
  if (read === null) return 'loading';
  if (read.error || !read.data) return 'unknown';
  const value = read.data.date_of_birth;
  return typeof value === 'string' && value.trim() !== '' ? 'saved' : 'missing';
}

export type BirthDateToSave = { ok: true; iso: string } | { ok: false; reason: DateInputFailure };

/** The only way a date from this card reaches the profile API. */
export function birthDateToSave(value: string | null | undefined, now: Date = new Date()): BirthDateToSave {
  return parseDateInput(value ?? '', { now, minYear: BIRTH_DATE_MIN_YEAR });
}

export const BIRTH_DATE_CARD_COPY = {
  title: 'Add your date of birth',
  body: 'If a parent or guardian started a hand-over before you turned 18, your date of birth must be saved in your profile and match the one they recorded. For a hand-over at 18 you can skip this.',
  field: 'Date of birth',
  placeholder: 'Select your date of birth',
  save: 'Save date of birth',
  saving: 'Saving…',
  invalid: 'Choose a real date of birth that is not in the future.',
  failure: 'Could not save your date of birth. Please try again.',
} as const;
