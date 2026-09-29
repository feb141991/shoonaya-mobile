import AsyncStorage from '@react-native-async-storage/async-storage';

const DISMISSAL_MS = 30 * 24 * 60 * 60 * 1000;
const claimedUsers = new Set<string>();
const checkingUsers = new Set<string>();

export function notificationPromptStorageKey(userId: string): string {
  return `shoonaya:notification_prompt_dismissed:${userId}`;
}

export async function claimNotificationPermissionPrompt(
  userId: string,
  nowMs: number = Date.now(),
): Promise<boolean> {
  if (!userId || claimedUsers.has(userId) || checkingUsers.has(userId)) return false;
  checkingUsers.add(userId);
  try {
    const key = notificationPromptStorageKey(userId);
    const raw = await AsyncStorage.getItem(key).catch(() => null);
    const shownAt = raw ? Number(raw) : Number.NaN;
    if (Number.isFinite(shownAt) && nowMs - shownAt < DISMISSAL_MS) return false;

    claimedUsers.add(userId);
    // Persist the claim when the prompt is presented, so a concurrent auth
    // event or a process restart cannot present a second permission ask if
    // the user dismisses the app before tapping an alert button.
    await AsyncStorage.setItem(key, String(nowMs)).catch(() => {});
    return true;
  } finally {
    checkingUsers.delete(userId);
  }
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
  checkingUsers.clear();
}
