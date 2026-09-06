import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppIdentity, type AppIdentity } from './appIdentity';
import { resolveIdentityKey } from './homeDiscovery';

// Keep legacy constants for cleanup only. Never adopt another user's
// device-global progress into the current account.
export const FIRST_WEEK_STORAGE_KEY = 'shoonaya-first-week-guide';
export const FIRST_WEEK_DISMISS_KEY = 'shoonaya-first-week-dismissed';

export function getFirstWeekGuideKeys(identity: AppIdentity) {
  const owner = resolveIdentityKey(identity);
  return { progress: `${FIRST_WEEK_STORAGE_KEY}:${owner}`, dismissed: `${FIRST_WEEK_DISMISS_KEY}:${owner}` };
}

// Settings/Help "replay first-use tips" support. This clears local
// progress/dismissal only -- whether the card then actually reappears also
// depends on the backend's `firstWeek` eligibility flag (no shloka streak,
// no last-shloka-read date, no guided-path progress), which this cannot
// and should not override: it's what keeps a long-time user from seeing
// "your first week" again just because they asked to replay onboarding.
export async function resetFirstWeekGuideCue(identity: AppIdentity = getAppIdentity()): Promise<void> {
  const keys = getFirstWeekGuideKeys(identity);
  await Promise.all([
    AsyncStorage.removeItem(keys.progress),
    AsyncStorage.removeItem(keys.dismissed),
  ]);
}
