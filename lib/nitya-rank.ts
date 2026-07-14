// Ported 1:1 from PWA's src/lib/share/nitya-card-data.ts (NITYA_MILESTONES +
// getNityaRankProgress) — the streak-rank ladder behind Japa's "YOUR PATH"
// card ("Seeker" → "Shishya" → ... , "7 days to Shishya"). Small, static
// data; copied rather than re-derived so native and PWA never disagree on
// what a given streak count is called.
export type NityaRankProgress = {
  label: string;
  next: string | null;
  daysToNext: number;
  progress: number;
};

type Milestone = { at: number; label: string };

const NITYA_MILESTONES: Record<string, Milestone[]> = {
  hindu: [
    { at: 0, label: 'Seeker' },
    { at: 7, label: 'Shishya' },
    { at: 21, label: 'Sadhu' },
    { at: 40, label: 'Tapasvi' },
    { at: 108, label: 'Rishi' },
  ],
  sikh: [
    { at: 0, label: 'Seeker' },
    { at: 7, label: 'Sewak' },
    { at: 21, label: 'Gurmukh' },
    { at: 40, label: 'Khalsa' },
    { at: 108, label: 'Gursikh' },
  ],
  buddhist: [
    { at: 0, label: 'Seeker' },
    { at: 7, label: 'Kalyana-mitta' },
    { at: 21, label: 'Ariyasavaka' },
    { at: 40, label: 'Sotapanna' },
    { at: 108, label: 'Arahat' },
  ],
  jain: [
    { at: 0, label: 'Seeker' },
    { at: 7, label: 'Shravak' },
    { at: 21, label: 'Muni-path' },
    { at: 40, label: 'Vrati' },
    { at: 108, label: 'Mahasadhak' },
  ],
};

export function getNityaRankProgress(tradition: string | null | undefined, streak: number): NityaRankProgress {
  const milestones = NITYA_MILESTONES[tradition ?? ''] ?? NITYA_MILESTONES.hindu;
  let current = milestones[0];
  let next: Milestone | null = null;
  for (const item of milestones) {
    if (item.at <= streak) {
      current = item;
    } else {
      next = item;
      break;
    }
  }
  const span = next ? next.at - current.at : 1;
  const progress = next ? Math.min(1, Math.max(0, (streak - current.at) / span)) : 1;
  return {
    label: current.label,
    next: next ? next.label : null,
    daysToNext: next ? Math.max(0, next.at - streak) : 0,
    progress,
  };
}
