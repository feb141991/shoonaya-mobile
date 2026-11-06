// Sequential-unlock status for FirstWeekGuide's 5 acts (components/home/FirstWeekGuide.tsx).
// Extracted so the ordering rule is unit-testable without rendering React Native.
//
// Status must be derived from each act's own completion, found by scanning
// `actIds` in order — never from `completed.size` (a plain count). A
// returning user from before sequential unlock could have acts completed
// out of array order (the old flat list let you tap any row); counting
// would then misplace "current" on an act that was already done, or lock
// an act that was never finished and has no way to become current again.
// Scanning for the first still-incomplete id is immune to that: whatever
// was already checked off stays checked off, and the earliest gap is
// always the one unlocked, regardless of what order things were done in.
export type ActStepStatus = 'done' | 'current' | 'locked';

export function computeActStepStatuses(
  actIds: readonly string[],
  completedIds: ReadonlySet<string>,
): ActStepStatus[] {
  const firstIncompleteIndex = actIds.findIndex((id) => !completedIds.has(id));
  return actIds.map((id, index) => {
    if (completedIds.has(id)) return 'done';
    if (index === firstIncompleteIndex) return 'current';
    return 'locked';
  });
}
