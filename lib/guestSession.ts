import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_MODE_KEY = 'shoonaya_guest_mode';

let inMemoryGuestMode = false;
let guestModeLoaded = false;

// Eagerly load from storage at module startup
AsyncStorage.getItem(GUEST_MODE_KEY)
  .then((val) => {
    inMemoryGuestMode = val === 'true';
    guestModeLoaded = true;
  })
  .catch(() => {});

export async function isGuestMode(): Promise<boolean> {
  if (guestModeLoaded) {
    return inMemoryGuestMode;
  }
  try {
    const val = await AsyncStorage.getItem(GUEST_MODE_KEY);
    inMemoryGuestMode = val === 'true';
  } catch {
    inMemoryGuestMode = false;
  }
  guestModeLoaded = true;
  return inMemoryGuestMode;
}

export function isGuestModeSync(): boolean {
  return inMemoryGuestMode;
}

export async function setGuestMode(active: boolean): Promise<void> {
  try {
    if (active) {
      await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
    } else {
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
    }
    inMemoryGuestMode = active;
    guestModeLoaded = true;
  } catch (error) {
    console.error('Failed to set guest mode in storage:', error);
    throw error;
  }
}
