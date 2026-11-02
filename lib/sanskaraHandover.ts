/**
 * Where a managed child is in the hand-over at 18, from the birth date the server already sends.
 *
 * The server decides what is allowed: `sanskara_can` makes a person a manager before the 18th birthday and a former manager
 * from that day for 12 months, by the UTC date, and only a former manager may start a claim (`sanskara_start_claim`). This
 * file reproduces only that date arithmetic so the screen can say so in time; it grants nothing. Postgres does
 * `birth_date + interval '18 years'` (29 February becomes 28 February in a non-leap year) and
 * `+ interval '12 months'` (the day is kept, clamped to the end of the month). The vectors in
 * `__tests__/sanskara-handover-stage.test.ts` were produced by Postgres and pin these two functions to it.
 * Dates here are civil dates (YYYY-MM-DD) compared as UTC, like the server.
 */

/** How early the screen starts telling a manager that the child is about to turn 18. */
export const HANDOVER_APPROACH_DAYS = 90;
/** The two points at which the remaining time is called out. */
export const HANDOVER_CLOSING_DAYS = 30;
export const HANDOVER_LAST_WEEK_DAYS = 7;

export type HandoverUrgency = 'normal' | 'closing' | 'last_week';

export type HandoverStage =
  | { stage: 'minor' }
  | { stage: 'approaching'; adultOn: string; daysToAdult: number }
  | { stage: 'open'; adultOn: string; windowEndsOn: string; daysLeft: number; urgency: HandoverUrgency }
  | { stage: 'ended' }
  | { stage: 'unknown' };

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function parse(iso: string): { y: number; m: number; d: number } | null {
  const match = ISO.exec(iso);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
  return { y, m, d };
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const dayNumber = (p: { y: number; m: number; d: number }) => Date.UTC(p.y, p.m - 1, p.d) / 86_400_000;

/** Postgres `date + interval 'N months'`: the same day of the month, clamped to the end of the target month. */
function addMonths(iso: string, months: number): string | null {
  const p = parse(iso);
  if (!p) return null;
  const index = p.y * 12 + (p.m - 1) + months;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${pad(y, 4)}-${pad(m)}-${pad(Math.min(p.d, daysInMonth(y, m)))}`;
}

/** The civil date of the 18th birthday as the server computes it. */
export function adultOn(birthDate: string): string | null {
  return addMonths(birthDate, 18 * 12);
}

/** The first civil date on which a former manager's 12 months have ended. */
export function windowEndsOn(birthDate: string): string | null {
  const adult = adultOn(birthDate);
  return adult ? addMonths(adult, 12) : null;
}

/** Today as the server sees it (a UTC civil date). */
export function utcToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function handoverStage(birthDate: string, today: string = utcToday()): HandoverStage {
  const adult = adultOn(birthDate);
  const end = windowEndsOn(birthDate);
  const t = parse(today);
  const a = adult ? parse(adult) : null;
  const e = end ? parse(end) : null;
  if (!adult || !end || !t || !a || !e) return { stage: 'unknown' };

  const todayN = dayNumber(t);
  const adultN = dayNumber(a);
  const endN = dayNumber(e);
  if (todayN >= endN) return { stage: 'ended' };
  if (todayN >= adultN) {
    const daysLeft = endN - todayN;
    const urgency: HandoverUrgency = daysLeft <= HANDOVER_LAST_WEEK_DAYS ? 'last_week' : daysLeft <= HANDOVER_CLOSING_DAYS ? 'closing' : 'normal';
    return { stage: 'open', adultOn: adult, windowEndsOn: end, daysLeft, urgency };
  }
  const daysToAdult = adultN - todayN;
  if (daysToAdult <= HANDOVER_APPROACH_DAYS) return { stage: 'approaching', adultOn: adult, daysToAdult };
  return { stage: 'minor' };
}

/** Whether the hand-over can be started now: only from the 18th birthday, only inside the window (server rule). */
export function canStartHandover(birthDate: string, today: string = utcToday()): boolean {
  return handoverStage(birthDate, today).stage === 'open';
}
