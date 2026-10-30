import type { ClientObservanceResult } from '@/lib/calendar-contract';

export interface FestivalOccurrencePayload {
  occurrence: ClientObservanceResult | null;
  candidates: ClientObservanceResult[];
  selection: 'selected' | 'multiple' | 'unavailable';
}

export interface FestivalOccurrenceTarget {
  slug: string;
  occurrenceId?: string;
  date?: string;
  variantKey?: string;
  tz?: string;
  calendarProfile?: string;
  tradition?: string;
}

export type FestivalOccurrenceFetcher = (
  path: string,
  options?: { signal?: AbortSignal },
) => Promise<Response>;

/**
 * Fallback to /api/calendar/upcoming ONLY when the server responds with 404
 * (indicating the narrow occurrence route is not yet deployed).
 */
async function fallbackUpcomingFeed(
  target: FestivalOccurrenceTarget,
  fetcher: FestivalOccurrenceFetcher,
  options?: { signal?: AbortSignal },
): Promise<FestivalOccurrencePayload> {
  const tz = target.tz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  const url = `/api/calendar/upcoming?days=60&tz=${encodeURIComponent(tz)}`;
  const res = await fetcher(url, { signal: options?.signal });
  if (!res.ok) {
    return { occurrence: null, candidates: [], selection: 'unavailable' };
  }
  const data = await res.json();
  const observances: ClientObservanceResult[] = Array.isArray(data?.observances) ? data.observances : [];
  const matching = observances.filter(
    (o) =>
      (o.route_slug === target.slug || o.slug === target.slug) &&
      (!target.date || o.civilDate === target.date || o.date === target.date) &&
      (!target.occurrenceId || o.id === target.occurrenceId) &&
      (!target.variantKey || o.variantKey === target.variantKey),
  );

  if (matching.length === 0) {
    return { occurrence: null, candidates: [], selection: 'unavailable' };
  }
  if (matching.length === 1) {
    return { occurrence: matching[0], candidates: matching, selection: 'selected' };
  }
  // Multiple variants exist: never silently choose one
  const primary = matching.find((o) => o.isPrimary) ?? matching[0];
  return { occurrence: primary, candidates: matching, selection: 'multiple' };
}

/**
 * Fetch a single festival occurrence via the narrow CALENDAR contract endpoint.
 * Takes occurrence id when available, otherwise explicit date + profile + location/timezone.
 * Never silently chooses between recognised traditions when multiple matches exist.
 */
export async function fetchFestivalOccurrence(
  target: FestivalOccurrenceTarget,
  options?: { signal?: AbortSignal; fetcher?: FestivalOccurrenceFetcher },
): Promise<FestivalOccurrencePayload> {
  const fetcher: FestivalOccurrenceFetcher =
    options?.fetcher ?? ((await import('@/lib/api')).apiFetch as FestivalOccurrenceFetcher);

  const query = new URLSearchParams();
  query.set('slug', target.slug);
  if (target.occurrenceId) query.set('occurrence_id', target.occurrenceId);
  if (target.date) query.set('date', target.date);
  if (target.variantKey) query.set('variant_key', target.variantKey);
  if (target.tz) query.set('tz', target.tz);
  if (target.calendarProfile) query.set('calendar_profile', target.calendarProfile);
  if (target.tradition) query.set('tradition', target.tradition);

  try {
    const res = await fetcher(`/api/calendar/occurrence?${query.toString()}`, {
      signal: options?.signal,
    });

    if (res.ok) {
      const data = await res.json();
      return {
        occurrence: data.occurrence ?? null,
        candidates: Array.isArray(data.candidates) ? data.candidates : [],
        selection: data.selection ?? (data.occurrence ? 'selected' : 'unavailable'),
      };
    }

    // OTA fallback ONLY on 404: route not deployed on backend yet
    if (res.status === 404) {
      return await fallbackUpcomingFeed(target, fetcher, options);
    }
  } catch (err) {
    if ((err as any)?.name === 'AbortError' || options?.signal?.aborted) {
      throw err;
    }
  }

  return {
    occurrence: null,
    candidates: [],
    selection: 'unavailable',
  };
}
