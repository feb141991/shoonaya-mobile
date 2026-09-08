import type {
  ObservanceSeries,
  ObservanceSeriesChild,
} from './observance-series-contract.generated';
import {
  getNativeSeriesCardChildren,
  nativeCalendarDayDistance,
} from './observance-series-card-helpers';

export const HOME_SACRED_DAYS_WINDOW = 15;
export const HOME_SACRED_DAYS_LIMIT = 8;
export const SACRED_DAYS_CARD_HEIGHT = 100;

export type SacredDaysObservance = {
  name: string;
  emoji: string | null;
  daysLeft: number;
  routeKind: string;
  routeSlug: string;
  href: string;
  label: string;
  monthLabel?: string | null;
  description?: string | null;
};

export type SacredDaysDeckItem =
  | {
      type: 'series';
      key: string;
      daysLeft: number;
      series: ObservanceSeries;
      child: ObservanceSeriesChild;
    }
  | {
      type: 'under_review_series';
      key: string;
      daysLeft: number;
      series: ObservanceSeries;
    }
  | {
      type: 'observance';
      key: string;
      daysLeft: number;
      entry: SacredDaysObservance;
    };

function normalizedEntryIdentity(entry: SacredDaysObservance): string {
  const routeIdentity = entry.routeSlug.trim() || entry.href.trim();
  return (routeIdentity || entry.name.trim()).toLocaleLowerCase();
}

/**
 * Builds Home's presentation deck from backend-owned dates and series DTOs.
 * It never derives an observance date or changes publication eligibility.
 */
export function buildSacredDaysDeck({
  observances,
  series,
  spiritualDate,
  windowDays = HOME_SACRED_DAYS_WINDOW,
  limit = HOME_SACRED_DAYS_LIMIT,
}: {
  observances: SacredDaysObservance[];
  series: ObservanceSeries[];
  spiritualDate: string;
  windowDays?: number;
  limit?: number;
}): SacredDaysDeckItem[] {
  const seriesItems: SacredDaysDeckItem[] = [];
  const representedSeriesSlugs = new Set<string>();

  for (const candidate of series) {
    if (candidate.status === 'under_review') {
      const daysLeft = candidate.startDate
        ? nativeCalendarDayDistance(spiritualDate, candidate.startDate)
        : null;
      if (daysLeft !== null && daysLeft >= 0 && daysLeft <= windowDays) {
        seriesItems.push({
          type: 'under_review_series',
          key: `series-review-${candidate.definitionKey}`,
          daysLeft,
          series: candidate,
        });
      }
      continue;
    }

    if (!['active', 'upcoming', 'concluding'].includes(candidate.status)) continue;

    const children = getNativeSeriesCardChildren(candidate);
    if (children.length === 0) {
      const daysLeft = candidate.startDate
        ? nativeCalendarDayDistance(spiritualDate, candidate.startDate)
        : null;
      if (daysLeft !== null && daysLeft >= 0 && daysLeft <= windowDays) {
        seriesItems.push({
          type: 'under_review_series',
          key: `series-invalid-${candidate.seriesKey}`,
          daysLeft,
          series: candidate,
        });
      }
      continue;
    }

    for (const child of children) {
      const targetDate = child.civilDate ?? candidate.startDate;
      const daysLeft = targetDate
        ? nativeCalendarDayDistance(spiritualDate, targetDate)
        : null;
      if (daysLeft === null || daysLeft < 0 || daysLeft > windowDays) continue;

      representedSeriesSlugs.add(child.slug.trim().toLocaleLowerCase());
      seriesItems.push({
        type: 'series',
        key: `series-${candidate.seriesKey}-${child.occurrenceId ?? child.slug}`,
        daysLeft,
        series: candidate,
        child,
      });
    }
  }

  const seenObservances = new Set<string>();
  const observanceItems: SacredDaysDeckItem[] = [];
  for (const entry of observances) {
    if (entry.daysLeft < 0 || entry.daysLeft > windowDays) continue;
    if (entry.routeSlug && representedSeriesSlugs.has(entry.routeSlug.trim().toLocaleLowerCase())) continue;

    const identity = `${normalizedEntryIdentity(entry)}:${entry.daysLeft}`;
    if (seenObservances.has(identity)) continue;
    seenObservances.add(identity);
    observanceItems.push({
      type: 'observance',
      key: `observance-${identity}`,
      daysLeft: entry.daysLeft,
      entry,
    });
  }

  return [...seriesItems, ...observanceItems]
    .sort((left, right) => {
      if (left.daysLeft !== right.daysLeft) return left.daysLeft - right.daysLeft;
      const leftRank = left.type === 'observance' ? 1 : 0;
      const rightRank = right.type === 'observance' ? 1 : 0;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return left.key.localeCompare(right.key);
    })
    .slice(0, Math.max(0, limit));
}
