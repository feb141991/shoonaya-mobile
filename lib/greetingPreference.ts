import AsyncStorage from '@react-native-async-storage/async-storage';

// A locked-in greeting word (from the tradition pool, or typed custom
// text) that replaces the daily-rotating tradition greeting. Device-local
// only — same rationale as lib/heroPreference.ts's hero backdrop pick:
// no new `profiles` column, no per-user DB storage.
const GREETING_PICK_KEY = 'shoonaya_greeting_pick';

export async function getGreetingPick(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(GREETING_PICK_KEY);
  } catch {
    return null;
  }
}

export async function setGreetingPick(text: string | null): Promise<void> {
  try {
    if (text && text.trim()) {
      await AsyncStorage.setItem(GREETING_PICK_KEY, text.trim());
    } else {
      await AsyncStorage.removeItem(GREETING_PICK_KEY);
    }
  } catch {
    // Best-effort, matching heroPreference.ts's own no-throw convention.
  }
}
