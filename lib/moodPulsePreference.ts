import AsyncStorage from '@react-native-async-storage/async-storage';

// Native port of the PWA's MoodPulse gating (src/components/mood/MoodPulse.tsx
// + src/lib/mood/registry.ts's getMoodSpiritualDate). That helper wraps the
// same shared `localSpiritualDate(tz, 4)` used server-side everywhere else
// "today" is computed (daily_sadhana rollover, home-summary, etc.) — native
// has no access to that function (@sangam/panchang-engine, the shared
// package native imports, doesn't export it), so this reimplements the same
// "the spiritual day starts at 4am local time" rule directly rather than
// falling back to a plain calendar date that would quietly disagree with
// the rest of the app's definition of "today".
const MOOD_PULSE_DISMISSED_KEY_PREFIX = 'shoonaya.mood.pulse.dismissed.v2';

export function getMoodTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getMoodSpiritualDate(date: Date = new Date(), timeZone: string = getMoodTimeZone()): string {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
  } catch {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
  }
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? '';
  const year = Number(part('year'));
  const month = Number(part('month'));
  const day = Number(part('day'));
  const hour = Number(part('hour'));
  const base = hour < 4 ? new Date(Date.UTC(year, month - 1, day - 1)) : new Date(Date.UTC(year, month - 1, day));
  const baseYear = base.getUTCFullYear();
  const baseMonth = String(base.getUTCMonth() + 1).padStart(2, '0');
  const baseDay = String(base.getUTCDate()).padStart(2, '0');
  return `${baseYear}-${baseMonth}-${baseDay}`;
}

function dismissedDateKey(userId: string): string {
  return `${MOOD_PULSE_DISMISSED_KEY_PREFIX}:${encodeURIComponent(userId)}`;
}

export async function getMoodPulseDismissedDate(userId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(dismissedDateKey(userId));
  } catch {
    return null;
  }
}

export async function setMoodPulseDismissedDate(userId: string, date: string): Promise<void> {
  try {
    await AsyncStorage.setItem(dismissedDateKey(userId), date);
  } catch {
    // Best-effort, matching lib/greetingPreference.ts's own no-throw convention.
  }
}
