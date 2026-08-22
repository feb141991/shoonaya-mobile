import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TraditionKey, LanguageKey, Step } from './onboarding-contract';
import type { GenderKey, LifeStageKey, CalendarProfileSlug, CalendarScopeSlug } from './profile-constants';

export const ONBOARDING_DRAFT_SCHEMA_VERSION = 1;
export const ONBOARDING_DRAFT_PREFIX = 'shoonaya_onboarding_draft_v1_';
export const ONBOARDING_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days TTL

/**
 * OnboardingDraftData — User-scoped in-flight onboarding preference state.
 *
 * Privacy & Security Invariants:
 * 1. `notificationsPermissionGranted` is strictly EXCLUDED. Notification permission
 *    is dynamic OS runtime state and must be queried live from the OS at submission,
 *    never stored as a durable draft.
 * 2. Auth tokens, passwords, and payment metadata are NEVER stored here.
 * 3. Draft data is keyed by user ID (`shoonaya_onboarding_draft_v1_<userId>`), never
 *    shared across users, and immediately wiped upon completion or logout.
 */
export type OnboardingDraftData = {
  step: Step;
  tradition: TraditionKey | null;
  language: LanguageKey | null;
  dateOfBirth: string;
  gender: GenderKey;
  lifeStage: LifeStageKey | null;
  isManualLifeStage: boolean;
  rashi: string;
  nakshatra: string;
  gotra: string;
  calendarProfile: CalendarProfileSlug | '';
  calendarScope: CalendarScopeSlug | '';
  goals: string[];
  name: string;
  deniedNotificationPromptShown?: boolean;
};

export type OnboardingDraftEnvelope = {
  schemaVersion: number;
  userId: string;
  savedAt: number;
  data: OnboardingDraftData;
};

export function getDraftStorageKey(userId: string): string {
  return `${ONBOARDING_DRAFT_PREFIX}${userId}`;
}

let saveQueue: Promise<void> = Promise.resolve();
let latestQueuedSaveTimestamp = 0;

/**
 * Serialized draft saver that guarantees newer step writes always win
 * and older in-flight saves cannot overwrite newer transitions.
 */
export async function saveOnboardingDraft(userId: string, data: OnboardingDraftData): Promise<void> {
  if (!userId) return;
  const saveTime = Date.now();
  latestQueuedSaveTimestamp = Math.max(latestQueuedSaveTimestamp, saveTime);

  saveQueue = saveQueue.then(async () => {
    // If a newer save was queued while waiting, skip writing obsolete state
    if (saveTime < latestQueuedSaveTimestamp) return;

    const envelope: OnboardingDraftEnvelope = {
      schemaVersion: ONBOARDING_DRAFT_SCHEMA_VERSION,
      userId,
      savedAt: saveTime,
      data,
    };
    try {
      await AsyncStorage.setItem(getDraftStorageKey(userId), JSON.stringify(envelope));
    } catch (e) {
      console.warn('[OnboardingDraft] save failed', e);
    }
  }).catch(() => {});

  return saveQueue;
}

/**
 * Reads and validates the user-scoped draft with schema & TTL expiration checks.
 */
export async function readOnboardingDraft(userId: string, now: number = Date.now()): Promise<OnboardingDraftData | null> {
  if (!userId) return null;
  try {
    const raw = await AsyncStorage.getItem(getDraftStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingDraftEnvelope;
    if (
      !parsed ||
      parsed.schemaVersion !== ONBOARDING_DRAFT_SCHEMA_VERSION ||
      parsed.userId !== userId ||
      !parsed.data ||
      typeof parsed.savedAt !== 'number' ||
      now - parsed.savedAt > ONBOARDING_DRAFT_TTL_MS
    ) {
      await AsyncStorage.removeItem(getDraftStorageKey(userId)).catch(() => {});
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export async function clearOnboardingDraft(userId: string): Promise<void> {
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(getDraftStorageKey(userId));
  } catch {}
}

export async function clearAllOnboardingDrafts(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const draftKeys = allKeys.filter((k) => k.startsWith(ONBOARDING_DRAFT_PREFIX));
    if (draftKeys.length > 0) {
      await AsyncStorage.multiRemove(draftKeys);
    }
  } catch {}
}
