// Verse-by-verse recitation with a repeat count (Phase 4 of
// docs/READER_EXPERIENCE_GRAND_PLAN.md, decision D3: the counter is
// standalone — it never writes Japa, streak or karma).
//
// A "pass" is one full recitation of every verse from the first. Listening
// starts at whichever verse is open; the first pass runs from there to the
// end, later passes start at verse 1.

export const REPEAT_OPTIONS = [1, 11, 21, 108] as const;
export type RepeatTarget = (typeof REPEAT_OPTIONS)[number];

export type RecitationPosition = {
  verse: number;
  /** 1-based pass number. */
  pass: number;
};

/**
 * What to play after `current` finishes, or null when the recitation is done.
 * `stopAfterPass` ends after the current pass even if passes remain (sleep
 * timer "after this recitation").
 */
export function nextRecitationStep(
  current: RecitationPosition,
  verseCount: number,
  target: number,
  stopAfterPass = false,
): RecitationPosition | null {
  if (verseCount <= 0) return null;
  if (current.verse + 1 < verseCount) return { verse: current.verse + 1, pass: current.pass };
  if (stopAfterPass || current.pass >= Math.max(1, target)) return null;
  return { verse: 0, pass: current.pass + 1 };
}

/** For a single recorded track: play again until `target` plays are done. */
export function nextTrackPlay(play: number, target: number, stopAfterPass = false): number | null {
  if (stopAfterPass || play >= Math.max(1, target)) return null;
  return play + 1;
}
