export type MoodPulseGateStatus = {
  hasLoggedMoodToday: boolean;
  hasDismissedToday: boolean;
  spiritualDate: string;
};

export function isMoodStatusOwnedBy(statusUserId: string | null, activeUserId: string | null): boolean {
  return statusUserId !== null && activeUserId !== null && statusUserId === activeUserId;
}

export function shouldShowMoodPulse(
  status: MoodPulseGateStatus | null,
  today: string,
  locallyDismissedDate: string | null
): boolean {
  if (!status || status.spiritualDate !== today) return false;
  if (status.hasLoggedMoodToday || status.hasDismissedToday) return false;
  return locallyDismissedDate !== today;
}
