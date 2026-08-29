import AsyncStorage from '@react-native-async-storage/async-storage';

// Native port of PWA's shoonaya-rashiphal-nudge-v1 dismiss preference
// (src/app/(main)/home/HomeDashboard.tsx).
const RASHIPHAL_NUDGE_KEY = 'shoonaya-rashiphal-nudge-v1';

export async function isRashiphalNudgeDismissed(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(RASHIPHAL_NUDGE_KEY);
    return Boolean(val);
  } catch {
    return false;
  }
}

export async function setRashiphalNudgeDismissed(): Promise<void> {
  try {
    await AsyncStorage.setItem(RASHIPHAL_NUDGE_KEY, 'true');
  } catch {
    // Best-effort, no-throw
  }
}
