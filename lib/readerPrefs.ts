import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReaderThemeKey } from '@/lib/constants';
import { clearAllReaderPositions } from '@/lib/readerPosition';

const READER_PINNED_KEY = '@shoonaya/reader_controls_pinned';
const READER_HINT_SEEN_KEY = '@shoonaya/reader_first_time_hint_seen';
const READER_THEME_KEY = '@shoonaya/reader_theme_choice';

/**
 * Retrieves whether the user has pinned reader controls permanently visible.
 */
export async function getReaderPinned(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(READER_PINNED_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Sets the reader controls pinned preference.
 */
export async function setReaderPinned(pinned: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(READER_PINNED_KEY, pinned ? 'true' : 'false');
  } catch {
    // Fail safe
  }
}

/**
 * Checks whether the user has seen the first-time reader tap hint.
 */
export async function hasSeenFirstTimeHint(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(READER_HINT_SEEN_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Marks that the user has seen the first-time reader tap hint.
 */
export async function markFirstTimeHintSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(READER_HINT_SEEN_KEY, 'true');
  } catch {
    // Fail safe
  }
}

/**
 * Retrieves the saved reader paper theme choice (if any).
 */
export async function getReaderThemeChoice(): Promise<ReaderThemeKey | null> {
  try {
    const val = await AsyncStorage.getItem(READER_THEME_KEY);
    if (val === 'bhojpatra' || val === 'sandhya' || val === 'templeNight') {
      return val;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Persists the reader paper theme choice.
 */
export async function setReaderThemeChoice(theme: ReaderThemeKey): Promise<void> {
  try {
    await AsyncStorage.setItem(READER_THEME_KEY, theme);
  } catch {
    // Fail safe
  }
}
/**
 * Clears reader preferences and stored positions upon sign-out or account switch.
 */
export async function clearReaderPrefs(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.multiRemove([
        READER_PINNED_KEY,
        READER_HINT_SEEN_KEY,
        READER_THEME_KEY,
      ]),
      clearAllReaderPositions(),
    ]);
  } catch {
    // Fail safe
  }
}
