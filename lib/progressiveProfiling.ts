import AsyncStorage from '@react-native-async-storage/async-storage';

export type PromptKey = 'panchang_rashi' | 'calendar_setup';
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
  // Profile-dependent suggestions must fail closed until the signed-in
  // user's persisted tradition has loaded. Defaulting missing data to Hindu
  // can briefly expose Hindu-only prompts to another tradition.
  const isHindu = tradition === 'hindu';

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

    case 'calendar_setup':
      return isHindu && (!profile.calendar_profile || !profile.calendar_scope);

    default:
      return false;
  }
}

const sessionPromptClaims = new Map<string, PromptKey>();

/**
 * Claims the single contextual profile suggestion allowed for this user in
 * the current JS session. A different signed-in account has an independent
 * claim, while refocusing or navigating between surfaces cannot show a
 * second prompt.
 */
export function claimPromptForSession(userId: string, promptKey: PromptKey): boolean {
  if (!userId || sessionPromptClaims.has(userId)) return false;
  sessionPromptClaims.set(userId, promptKey);
  return true;
}

export function getSessionPromptClaim(userId: string): PromptKey | null {
  return sessionPromptClaims.get(userId) ?? null;
}

export function clearPromptSessionClaimsForTests(): void {
  sessionPromptClaims.clear();
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
