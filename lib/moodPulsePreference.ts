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
const MOOD_PULSE_DISMISSED_KEY = 'shoonaya_mood_pulse_dismissed';

export function getMoodSpiritualDate(date: Date = new Date()): string {
  const base = date.getHours() < 4 ? new Date(date.getTime() - 24 * 60 * 60 * 1000) : date;
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, '0');
  const day = String(base.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function getMoodPulseDismissedDate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(MOOD_PULSE_DISMISSED_KEY);
  } catch {
    return null;
  }
}

export async function setMoodPulseDismissedDate(date: string): Promise<void> {
  try {
    await AsyncStorage.setItem(MOOD_PULSE_DISMISSED_KEY, date);
  } catch {
    // Best-effort, matching lib/greetingPreference.ts's own no-throw convention.
  }
}
