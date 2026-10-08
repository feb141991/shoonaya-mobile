export type DevotionalRepeatTarget = 1 | 11 | 21 | 108;
export type DevotionalRepeatScope = 'verse' | 'stotram';
export type DevotionalSleepTimerSelection = 'end' | 15 | 30;

export interface DevotionalRecitationPosition {
  scope: DevotionalRepeatScope;
  verseIndex: number;
  verseCount: number;
  completedCycles: number;
  targetCycles: DevotionalRepeatTarget;
}

export interface DevotionalRecitationAdvance {
  verseIndex: number;
  completedCycles: number;
  done: boolean;
}

/** Advance a local reading loop. It has no persistence or practice side effects. */
export function getNextDevotionalRecitationPosition(
  position: DevotionalRecitationPosition,
): DevotionalRecitationAdvance {
  const verseCount = Math.max(0, Math.floor(position.verseCount));
  const currentVerse = Math.floor(position.verseIndex);
  const completedCycles = Math.max(0, Math.floor(position.completedCycles));
  if (verseCount === 0 || currentVerse < 0 || currentVerse >= verseCount) {
    return { verseIndex: Math.max(0, Math.min(currentVerse, verseCount - 1)), completedCycles, done: true };
  }

  if (position.scope === 'verse') {
    const nextCycle = completedCycles + 1;
    return {
      verseIndex: currentVerse,
      completedCycles: nextCycle,
      done: nextCycle >= position.targetCycles,
    };
  }

  if (currentVerse + 1 < verseCount) {
    return { verseIndex: currentVerse + 1, completedCycles, done: false };
  }

  const nextCycle = completedCycles + 1;
  return {
    verseIndex: 0,
    completedCycles: nextCycle,
    done: nextCycle >= position.targetCycles,
  };
}

export function getDevotionalSleepTimerDeadline(
  selection: DevotionalSleepTimerSelection,
  nowMs: number,
): number | null {
  if (selection === 'end') return null;
  return nowMs + selection * 60_000;
}

export function isDevotionalSleepTimerExpired(deadlineMs: number | null, nowMs: number): boolean {
  return deadlineMs !== null && nowMs >= deadlineMs;
}
