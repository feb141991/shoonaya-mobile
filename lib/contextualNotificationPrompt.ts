import AsyncStorage from '@react-native-async-storage/async-storage';

import type { NotificationPermissionState } from './notificationPermissionState';

const PROMPT_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const GLOBAL_PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const claimedPrompts = new Set<string>();
const checkingUsers = new Set<string>();
const claimedUsers = new Set<string>();

export type ContextualReminderFeature = 'japa' | 'observance' | 'sankalpa';
export type ContextualReminderAction = 'configure' | 'allow' | 'open_settings';

export function resolveObservanceReminderPreference(
  routeKind: string,
  preferences: { festival: boolean | null; vrat: boolean | null },
): boolean | null {
  if (routeKind === 'vrat') return preferences.vrat;
  if (routeKind === 'festival') return preferences.festival;
  return null;
}

export function isSankalpaReminderPromptEligible(
  day: number,
  targetDays: number,
  checkedInToday: boolean,
): boolean {
  return Number.isFinite(day)
    && Number.isFinite(targetDays)
    && day >= 1
    && targetDays >= 1
    && day < Math.ceil(targetDays / 2)
    && !checkedInToday;
}

export function contextualReminderPromptStorageKey(
  userId: string,
  feature: ContextualReminderFeature,
): string {
  return `shoonaya:contextual-reminder-prompt:${userId}:${feature}`;
}

function globalPromptStorageKey(userId: string): string {
  return `shoonaya:contextual-reminder-prompt:last-shown:${userId}`;
}

/**
 * Claims a feature-specific in-app reminder invitation once per 30 days.
 * The timestamp is recorded when the card is shown, not only when dismissed,
 * so navigating away and back cannot immediately show it again.
 */
export async function claimContextualReminderPrompt(
  userId: string,
  feature: ContextualReminderFeature,
  nowMs: number = Date.now(),
): Promise<boolean> {
  if (!userId) return false;
  const key = contextualReminderPromptStorageKey(userId, feature);
  const globalKey = globalPromptStorageKey(userId);
  if (claimedPrompts.has(key) || claimedUsers.has(userId) || checkingUsers.has(userId)) return false;

  checkingUsers.add(userId);
  try {
    const [rawFeatureAt, rawGlobalAt] = await Promise.all([
      AsyncStorage.getItem(key).catch(() => null),
      AsyncStorage.getItem(globalKey).catch(() => null),
    ]);
    const previousFeatureAt = rawFeatureAt ? Number(rawFeatureAt) : Number.NaN;
    const previousGlobalAt = rawGlobalAt ? Number(rawGlobalAt) : Number.NaN;
    // Treat future timestamps as still inside the cooldown (clock moved back).
    if (Number.isFinite(previousFeatureAt) && nowMs - previousFeatureAt < PROMPT_COOLDOWN_MS) return false;
    if (Number.isFinite(previousGlobalAt) && nowMs - previousGlobalAt < GLOBAL_PROMPT_COOLDOWN_MS) return false;

    claimedPrompts.add(key);
    claimedUsers.add(userId);
    await Promise.all([
      AsyncStorage.setItem(key, String(nowMs)).catch(() => {}),
      AsyncStorage.setItem(globalKey, String(nowMs)).catch(() => {}),
    ]);
    return true;
  } finally {
    checkingUsers.delete(userId);
  }
}

export function resolveContextualReminderPromptAction(
  reminderEnabled: boolean | null,
  permission: NotificationPermissionState | null,
): ContextualReminderAction | null {
  if (reminderEnabled === null || permission === null || permission === 'unavailable') return null;
  if (!reminderEnabled) return 'configure';
  if (permission === 'denied') return 'open_settings';
  if (permission === 'undetermined') return 'allow';
  return null;
}

export function clearContextualReminderPromptClaimsForTests(): void {
  claimedPrompts.clear();
  checkingUsers.clear();
  claimedUsers.clear();
}
