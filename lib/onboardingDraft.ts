import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TraditionKey, LanguageKey, Step } from './onboarding-contract';
import type { GenderKey, LifeStageKey, CalendarProfileSlug, CalendarScopeSlug } from './profile-constants';

export const ONBOARDING_DRAFT_SCHEMA_VERSION = 1;
export const ONBOARDING_DRAFT_PREFIX = 'shoonaya_onboarding_draft_v1_';

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
  notificationsPermissionGranted: boolean;
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

export async function saveOnboardingDraft(userId: string, data: OnboardingDraftData): Promise<void> {
  if (!userId) return;
  const envelope: OnboardingDraftEnvelope = {
    schemaVersion: ONBOARDING_DRAFT_SCHEMA_VERSION,
    userId,
    savedAt: Date.now(),
    data,
  };
  try {
    await AsyncStorage.setItem(getDraftStorageKey(userId), JSON.stringify(envelope));
  } catch {}
}

export async function readOnboardingDraft(userId: string): Promise<OnboardingDraftData | null> {
  if (!userId) return null;
  try {
    const raw = await AsyncStorage.getItem(getDraftStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingDraftEnvelope;
    if (
      !parsed ||
      parsed.schemaVersion !== ONBOARDING_DRAFT_SCHEMA_VERSION ||
      parsed.userId !== userId ||
      !parsed.data
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
