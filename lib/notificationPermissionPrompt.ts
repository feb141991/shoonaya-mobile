import AsyncStorage from '@react-native-async-storage/async-storage';

const DISMISSAL_MS = 30 * 24 * 60 * 60 * 1000;
const claimedUsers = new Set<string>();

export function notificationPromptStorageKey(userId: string): string {
  return `shoonaya:notification_prompt_dismissed:${userId}`;
}

export async function claimNotificationPermissionPrompt(
  userId: string,
  nowMs: number = Date.now(),
): Promise<boolean> {
  if (!userId || claimedUsers.has(userId)) return false;
  const raw = await AsyncStorage.getItem(notificationPromptStorageKey(userId)).catch(() => null);
  const dismissedAt = raw ? Number(raw) : Number.NaN;
  if (Number.isFinite(dismissedAt) && nowMs - dismissedAt < DISMISSAL_MS) return false;
  claimedUsers.add(userId);
  return true;
}

export async function dismissNotificationPermissionPrompt(
  userId: string,
  nowMs: number = Date.now(),
): Promise<void> {
  if (!userId) return;
  await AsyncStorage.setItem(notificationPromptStorageKey(userId), String(nowMs));
}

export function clearNotificationPromptClaimsForTests(): void {
  claimedUsers.clear();
}
