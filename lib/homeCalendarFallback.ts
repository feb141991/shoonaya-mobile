import type { ObservanceSeries } from './observance-series-contract.generated';
import type { HomeObservanceStoryCard } from './observance-story-contract.generated';
import { nativeCalendarDayDistance } from './observance-series-card-helpers';

type FetchApi = (
  path: string,
  options?: RequestInit & { timeoutMs?: number; expectedUserId?: string },
) => Promise<Response>;

export type HomeCalendarEntry = {
  name: string;
  nameLocal?: string | null;
  namePa?: string | null;
  emoji: string | null;
  daysLeft: number;
  routeKind: string;
  routeSlug: string;
  href: string;
  label: string;
  monthLabel?: string | null;
  description?: string | null;
  descriptionLocal?: string | null;
  descriptionPa?: string | null;
  date: string;
};

export type HomeCalendarFallback = {
  observance: HomeCalendarEntry;
  upcomingObservances: HomeCalendarEntry[];
  series: ObservanceSeries[];
  storyCards: HomeObservanceStoryCard[];
  calendarStatus: 'degraded';
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function asOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function formatLabel(name: string, daysLeft: number): string {
  if (daysLeft === 0) return `Today is ${name}`;
  if (daysLeft === 1) return `Tomorrow is ${name}`;
  return `${name} in ${daysLeft} days`;
}

/**
 * A calendar-only recovery read for Home. This uses the existing canonical
 * published-occurrence endpoint, which is independent of home-summary's
 * materialisation/composition path. Only server-resolved, reviewed dates are
 * accepted; ambiguous and under-review rows can never become Home dates here.
 */
export async function fetchHomeCalendarFallback(input: {
  fetchApi: FetchApi;
  expectedUserId: string;
  tradition?: string | null;
  calendarProfile?: string | null;
  timezone: string;
  spiritualDate: string;
  language: 'en' | 'hi' | 'pa';
}): Promise<HomeCalendarFallback | null> {
  const query = new URLSearchParams({
    // Home's Sacred Days module is a 15-day window; avoid asking this
    // recovery path to build a larger range than the screen can display.
    days: '15',
    reviewed: '1',
    tz: input.timezone,
    lang: input.language,
  });
  // When Home itself failed before returning the user's profile context,
  // omit these overrides so the server resolves the authenticated profile
  // as the source of truth instead of silently forcing Ujjain / "all".
  if (input.tradition) query.set('tradition', input.tradition);
  if (input.calendarProfile) query.set('calendar_profile', input.calendarProfile);

  try {
    const response = await input.fetchApi(`/api/calendar/upcoming?${query.toString()}`, {
      timeoutMs: 8_000,
      expectedUserId: input.expectedUserId,
    });
    if (!response.ok) return null;

    const body: unknown = await response.json();
    if (!isRecord(body)) return null;
    const baseDate = isIsoDate(body.from) ? body.from : input.spiritualDate;
    const rawItems = Array.isArray(body.displayObservances) ? body.displayObservances : [];
    const entries = rawItems
      .filter(isRecord)
      .filter((item) => item.status === 'resolved' && isIsoDate(item.civilDate))
      .map((item): HomeCalendarEntry | null => {
        const date = item.civilDate as string;
        const daysLeft = nativeCalendarDayDistance(baseDate, date);
        const name = asOptionalString(item.display_name);
        const routeSlug = asOptionalString(item.route_slug) ?? asOptionalString(item.slug);
        if (!name || !routeSlug || daysLeft === null || daysLeft < 0 || daysLeft > 15) return null;

        const routeKind = item.route_kind === 'vrat' ? 'vrat' : item.route_kind === 'festival' ? 'festival' : 'panchang';
        const href = routeKind === 'vrat'
          ? `/vrat/${encodeURIComponent(routeSlug)}`
          : routeKind === 'festival'
            ? `/festival/${encodeURIComponent(routeSlug)}`
            : '/panchang';
        const monthLabel = isRecord(item.monthLabel)
          ? asOptionalString(item.monthLabel.formattedLabel)
          : asOptionalString(item.monthLabel);

        return {
          name,
          nameLocal: asOptionalString(item.display_name_local) ?? asOptionalString(item.nameLocal),
          namePa: asOptionalString(item.display_name_pa) ?? asOptionalString(item.namePa),
          emoji: asOptionalString(item.emoji),
          daysLeft,
          routeKind,
          routeSlug,
          href,
          label: formatLabel(name, daysLeft),
          monthLabel,
          description: asOptionalString(item.description),
          descriptionLocal: asOptionalString(item.description_local) ?? asOptionalString(item.descriptionLocal),
          descriptionPa: asOptionalString(item.description_pa) ?? asOptionalString(item.descriptionPa),
          date,
        };
      })
      .filter((entry): entry is HomeCalendarEntry => entry !== null)
      .sort((a, b) => a.date.localeCompare(b.date));

    // A successful but empty direct read is not enough evidence to replace a
    // known-good Home calendar: this endpoint does not expose materialisation
    // completeness. Leave recovery to the last-known-good cache in that case.
    if (entries.length === 0) return null;

    return {
      observance: entries[0],
      upcomingObservances: entries.slice(1, 5),
      series: Array.isArray(body.series) ? body.series as ObservanceSeries[] : [],
      storyCards: Array.isArray(body.storyCards) ? body.storyCards as HomeObservanceStoryCard[] : [],
      calendarStatus: 'degraded',
    };
  } catch {
    return null;
  }
}
