// Reminder times are stored on the profile as 24-hour "HH:MM" strings in the
// user's profile timezone. Settings shows them on a 12-hour clock with AM/PM,
// so a value like "01:00" can never be entered thinking it means 1 PM.

export type Meridiem = 'AM' | 'PM';

export type ClockParts = {
  hour12: number; // 1-12
  minute: number; // 0-59
  meridiem: Meridiem;
};

/**
 * Night window used when a user has not set their own quiet hours. Mirrors
 * DEFAULT_QUIET_HOURS in the backend's src/lib/notification-delivery-policy.ts.
 * A time the user picks inside it is still sent; Settings only labels it.
 */
export const DEFAULT_QUIET_START_HOUR = 22;
export const DEFAULT_QUIET_END_HOUR = 6;

export const REMINDER_HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
export const REMINDER_MINUTES = [0, 15, 30, 45] as const;

const CLOCK_RE = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;

export function isValidClock(value: string): boolean {
  return CLOCK_RE.test(value);
}

/** Minutes since midnight, or null for anything that is not a strict "HH:MM". */
export function clockToMinutes(value: string): number | null {
  const match = CLOCK_RE.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function toClockParts(value: string): ClockParts | null {
  const total = clockToMinutes(value);
  if (total === null) return null;
  const hour24 = Math.floor(total / 60);
  return {
    hour12: hour24 % 12 === 0 ? 12 : hour24 % 12,
    minute: total % 60,
    meridiem: hour24 < 12 ? 'AM' : 'PM',
  };
}

export function fromClockParts({ hour12, minute, meridiem }: ClockParts): string {
  const hour24 = (hour12 % 12) + (meridiem === 'PM' ? 12 : 0);
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** "17:05" -> "5:05 PM". Returns the input unchanged if it is not a valid clock. */
export function formatClock12(value: string): string {
  const parts = toClockParts(value);
  if (!parts) return value;
  return `${parts.hour12}:${String(parts.minute).padStart(2, '0')} ${parts.meridiem}`;
}

/** True between 22:00 and 05:59, the default night window. */
export function isNightClock(value: string): boolean {
  const total = clockToMinutes(value);
  if (total === null) return false;
  const hour = Math.floor(total / 60);
  return hour >= DEFAULT_QUIET_START_HOUR || hour < DEFAULT_QUIET_END_HOUR;
}

/** Inclusive range check on "HH:MM" strings; open-ended when a bound is omitted. */
export function isClockWithin(value: string, min?: string, max?: string): boolean {
  const total = clockToMinutes(value);
  if (total === null) return false;
  const lower = min ? clockToMinutes(min) : 0;
  const upper = max ? clockToMinutes(max) : 23 * 60 + 59;
  if (lower === null || upper === null) return false;
  return total >= lower && total <= upper;
}

/**
 * Minute choices to offer: the quarter hours, plus the stored minute when it is
 * not one of them, so an existing "07:10" is shown as it is instead of snapped.
 */
export function minuteOptions(currentMinute: number): number[] {
  const options: number[] = [...REMINDER_MINUTES];
  if (!options.includes(currentMinute)) options.push(currentMinute);
  return options.sort((a, b) => a - b);
}
