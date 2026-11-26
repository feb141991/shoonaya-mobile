/**
 * When a festival's ritual may begin on its day, read from the calendar engine's own resolution.
 *
 * Raksha Bandhan (founder-approved 2026-11-26): when Bhadra covers Day 1's afternoon and Purnima is too
 * short on Day 2, the date is Day 1 but Rakhi is tied only after Bhadra ends, or in the Bhadra-puccha when
 * Bhadra runs past midnight. The engine marks this with a diagnostic and gives the start instant in its
 * `raksha_bandhan_check` reason. This module never computes a time itself (AGENTS.md section 2): with the
 * flag and no usable time it says so, so the date is never shown as if any time of day were fine.
 */

export type RitualWindowKind = 'after_bhadra' | 'bhadra_puccha';

export type RitualWindowNote = {
  kind: RitualWindowKind;
  /** The engine's instant, or null when it did not come through. */
  startsAtUtc: string | null;
  text: string;
};

type ObservanceLike = {
  slug?: string;
  diagnostics?: readonly unknown[] | null;
  reasons?: readonly unknown[] | null;
};

const DIAGNOSTIC_KIND: Record<string, RitualWindowKind> = {
  raksha_bandhan_after_bhadra: 'after_bhadra',
  raksha_bandhan_bhadra_puccha: 'bhadra_puccha',
};

function startInstant(reasons: readonly unknown[] | null | undefined): string | null {
  for (const reason of reasons ?? []) {
    if (!reason || typeof reason !== 'object') continue;
    const { code, details } = reason as { code?: unknown; details?: unknown };
    if (code !== 'raksha_bandhan_check' || !details || typeof details !== 'object') continue;
    const value = (details as { ritualWindowStartUtc?: unknown }).ritualWindowStartUtc;
    if (typeof value === 'string' && Number.isFinite(Date.parse(value))) return value;
  }
  return null;
}

/** "7:01 pm IST"-style local time in the observance's own timezone, or null if it cannot be formatted. */
export function formatRitualTime(instantUtc: string, timeZone: string): string | null {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone, hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
    }).format(new Date(instantUtc));
  } catch {
    return null;
  }
}

export function ritualWindowNote(observance: ObservanceLike, timeZone: string): RitualWindowNote | null {
  const kind = (observance.diagnostics ?? [])
    .map((d) => (typeof d === 'string' ? DIAGNOSTIC_KIND[d] : undefined))
    .find((k): k is RitualWindowKind => k !== undefined);
  if (!kind) return null;

  const startsAtUtc = startInstant(observance.reasons);
  const time = startsAtUtc ? formatRitualTime(startsAtUtc, timeZone) : null;
  if (!time) {
    return {
      kind,
      startsAtUtc,
      text: 'Tie Rakhi only after Bhadra ends. The exact time is not available here.',
    };
  }
  return {
    kind,
    startsAtUtc,
    text: kind === 'after_bhadra'
      ? `Tie Rakhi after ${time}, when Bhadra ends.`
      : `Tie Rakhi in the last part of Bhadra (Bhadra-puccha), from ${time}.`,
  };
}

/** A calculation reason's heading and text, whichever shape the API sent (`code`/`text` or `label`/`description`). */
export function reasonLines(reason: unknown): { label: string; description: string } | null {
  if (!reason || typeof reason !== 'object') return null;
  const r = reason as { label?: unknown; description?: unknown; code?: unknown; text?: unknown };
  const description = typeof r.description === 'string' ? r.description : typeof r.text === 'string' ? r.text : '';
  const rawLabel = typeof r.label === 'string' ? r.label : typeof r.code === 'string' ? r.code : '';
  const label = rawLabel.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  if (!label && !description) return null;
  return { label, description };
}
