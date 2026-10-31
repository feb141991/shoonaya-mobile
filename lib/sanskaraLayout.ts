import type { SanskaraRecord } from './sanskaraContract';

export type SanskaraMilestoneState = 'planned' | 'completed' | 'undated';
export interface SanskaraViewport { x: number; y: number; scale: number }
export const SANSKARA_INITIAL_VIEWPORT: SanskaraViewport = { x: 0, y: 0, scale: 1 };
export const SANSKARA_MIN_SCALE = 0.4;
export const SANSKARA_MAX_SCALE = 2.8;

export function milestoneState(record: Pick<SanskaraRecord, 'planned_date' | 'completed_date'>): SanskaraMilestoneState {
  return record.completed_date ? 'completed' : record.planned_date ? 'planned' : 'undated';
}

/** Dates come only from the person's record. Position never invents an observance date or an urgency state. */
export function computeSanskaraLayout(records: readonly SanskaraRecord[]) {
  const sorted = [...records].sort((a, b) => {
    const ad = a.completed_date ?? a.planned_date;
    const bd = b.completed_date ?? b.planned_date;
    if (!ad && bd) return -1;
    if (ad && !bd) return 1;
    return (ad ?? '').localeCompare(bd ?? '') || a.id.localeCompare(b.id);
  });
  // Parampara's two-branch node/card geometry; height remains >=44px even at the minimum 0.4 zoom.
  const canvasWidth = 420;
  const canvasHeight = Math.max(360, sorted.length * 132 + 160);
  const trunkX = canvasWidth / 2;
  const nodes = sorted.map((record, index) => {
    const state = milestoneState(record);
    const x = trunkX + (index % 2 ? 1 : -1) * 116;
    const y = canvasHeight - 112 - index * 132;
    return {
      record, state, date: record.completed_date ?? record.planned_date,
      x, y, width: 160, height: 112,
      branch: `M ${trunkX} ${y + 36} Q ${trunkX} ${y} ${x} ${y}`,
    };
  });
  return { nodes, canvasWidth, canvasHeight, trunkX, hasDatedMilestone: nodes.some(node => node.date !== null) };
}

/** Long-press near an existing date may prefill that exact date; the undated trunk never synthesizes one. */
export function dateAtSanskaraPosition(layout: ReturnType<typeof computeSanskaraLayout>, y: number): string | undefined {
  const dated = layout.nodes.filter(node => node.date !== null);
  const closest = dated.reduce<(typeof dated)[number] | undefined>((best, node) =>
    !best || Math.abs(node.y - y) < Math.abs(best.y - y) ? node : best, undefined);
  return closest?.date ?? undefined;
}
