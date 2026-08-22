import AsyncStorage from '@react-native-async-storage/async-storage';

export type PromptKey = 'panchang_rashi' | 'kundali_jyotish' | 'sankalpa_gotra' | 'home_personalisation';
export type PromptAction = 'shown' | 'dismissed' | 'completed';

export const PROMPT_DISMISSAL_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface SimpleStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function promptStorageKey(userId: string, promptKey: PromptKey): string {
  return `shoonaya_prompt_dismissed:${userId}:${promptKey}`;
}

export type ProfileContext = {
  tradition?: string | null;
  rashi?: string | null;
  nakshatra?: string | null;
  gotra?: string | null;
  calendar_profile?: string | null;
  calendar_scope?: string | null;
  city?: string | null;
  life_stage?: string | null;
  onboarding_goal?: string | null;
};

/**
 * Pure evaluation of prompt eligibility given user profile and dismissal timestamp.
 */
export function isPromptEligible({
  promptKey,
  tradition,
  profile,
  dismissedAtMs,
  nowMs = Date.now(),
}: {
  promptKey: PromptKey;
  tradition?: string | null;
  profile: ProfileContext;
  dismissedAtMs: number | null;
  nowMs?: number;
}): boolean {
  const isHindu = (tradition ?? 'hindu') === 'hindu';

  // Check 30-day dismissal TTL
  if (dismissedAtMs !== null) {
    if (nowMs - dismissedAtMs < PROMPT_DISMISSAL_TTL_MS) {
      return false;
    }
  }

  switch (promptKey) {
    case 'panchang_rashi':
      // Only for Hindu users when rashi is unset
      return isHindu && !profile.rashi;

    case 'kundali_jyotish':
      // Only for Hindu users when either rashi or nakshatra is unset
      return isHindu && (!profile.rashi || !profile.nakshatra);

    case 'sankalpa_gotra':
      // Only for Hindu users when gotra is unset
      return isHindu && !profile.gotra;

    case 'home_personalisation':
      // For Hindu: missing calendar_profile, rashi, or nakshatra
      // For non-Hindu: missing city or goals
      if (isHindu) {
        return !profile.calendar_profile || !profile.rashi || !profile.nakshatra;
      }
      return !profile.city || !profile.onboarding_goal;

    default:
      return false;
  }
}

/**
 * Persist user-scoped prompt dismissal with timestamp
 */
export async function recordPromptDismissal(
  userId: string,
  promptKey: PromptKey,
  nowMs: number = Date.now(),
  storage: SimpleStorage = AsyncStorage
): Promise<void> {
  if (!userId) return;
  const key = promptStorageKey(userId, promptKey);
  await storage.setItem(key, String(nowMs));
}

/**
 * Read user-scoped prompt dismissal timestamp
 */
export async function getPromptDismissedAt(
  userId: string,
  promptKey: PromptKey,
  storage: SimpleStorage = AsyncStorage
): Promise<number | null> {
  if (!userId) return null;
  const key = promptStorageKey(userId, promptKey);
  const val = await storage.getItem(key);
  if (!val) return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

/**
 * Clear dismissal for testing or reset
 */
export async function clearPromptDismissal(
  userId: string,
  promptKey: PromptKey,
  storage: SimpleStorage = AsyncStorage
): Promise<void> {
  if (!userId) return;
  const key = promptStorageKey(userId, promptKey);
  await storage.removeItem(key);
}

/**
 * Guaranteed Privacy-Safe Analytics Event Builder
 * Strict contract: Never accepts or emits DOB, Gotra, Rashi, Nakshatra, location, or free text.
 */
export function buildProgressiveAnalyticsEvent(
  promptKey: PromptKey,
  action: PromptAction
): {
  event: 'progressive_profiling';
  prompt_key: PromptKey;
  action: PromptAction;
} {
  return {
    event: 'progressive_profiling',
    prompt_key: promptKey,
    action,
  };
}
