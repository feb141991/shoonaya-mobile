import AsyncStorage from '@react-native-async-storage/async-storage';

// Plain storage module (no react-native UI imports) so it can be unit
// tested directly and imported from Settings without pulling in
// FirstWeekGuide.tsx's component tree. Keys are intentionally not
// identity-scoped, matching this card's existing (pre-existing, unchanged
// here) device-wide dismissal behavior.
export const FIRST_WEEK_STORAGE_KEY = 'shoonaya-first-week-guide';
export const FIRST_WEEK_DISMISS_KEY = 'shoonaya-first-week-dismissed';

// Settings/Help "replay first-use tips" support. This clears local
// progress/dismissal only -- whether the card then actually reappears also
// depends on the backend's `firstWeek` eligibility flag (no shloka streak,
// no last-shloka-read date, no guided-path progress), which this cannot
// and should not override: it's what keeps a long-time user from seeing
// "your first week" again just because they asked to replay onboarding.
export async function resetFirstWeekGuideCue(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(FIRST_WEEK_STORAGE_KEY),
    AsyncStorage.removeItem(FIRST_WEEK_DISMISS_KEY),
  ]);
}
