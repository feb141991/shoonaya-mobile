// Ported 1:1 from PWA's src/lib/bhakti/mala-milestones.ts (MALA_TIERS +
// getMalaVolumeMilestone) — the lifetime-bead tier ladder behind Japa's
// "LIFETIME JAPA" card ("0% to First mala"). Small, static data; copied so
// native and PWA always agree on tier labels/thresholds.
export type MalaVolumeMilestone = {
  totalBeads: number;
  label: string;
  nextLabel: string | null;
  nextAt: number | null;
  progress: number;
};

type Tier = { at: number; label: string };

const MALA_TIERS: Tier[] = [
  { at: 0, label: 'First turn' },
  { at: 108, label: 'First mala' },
  { at: 1080, label: 'Sahasram' },
  { at: 10800, label: 'Ayutam' },
  { at: 108000, label: 'Purascharana' },
  { at: 1080000, label: 'Mahapurascharana' },
];

export function getMalaVolumeMilestone(totalBeads: number): MalaVolumeMilestone {
  const beads = Math.max(0, Math.floor(totalBeads));
  let current = MALA_TIERS[0];
  let next: Tier | null = null;
  for (const tier of MALA_TIERS) {
    if (tier.at <= beads) {
      current = tier;
    } else {
      next = tier;
      break;
    }
  }
  const span = next ? next.at - current.at : 1;
  const progress = next ? Math.min(1, Math.max(0, (beads - current.at) / span)) : 1;
  return {
    totalBeads: beads,
    label: current.label,
    nextLabel: next ? next.label : null,
    nextAt: next ? next.at : null,
    progress,
  };
}
