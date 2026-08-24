/**
 * observance-series-card-helpers.ts
 *
 * Native editorial guard and localized content resolvers for ObservanceSeriesCard.
 */

import type {
  LocalizedEditorialField,
  ObservanceSeries,
  ObservanceSeriesChild,
} from './observance-series-contract.generated';

export type NativeSeriesCardLanguage = 'en' | 'hi' | 'pa';

const NATIVE_SERIES_CARD_COPY = {
  en: {
    today: 'Today',
    tomorrow: 'Tomorrow',
    inDays: (days: number) => `in ${days} days`,
    dayOf: (day: number, total: number) => `Day ${day} of ${total}`,
    begins: 'begins',
    concludesToday: 'concludes today',
    learnMore: 'Learn more',
    reviewPending: 'Under Review',
    missingDates: 'Some observance dates are still being verified.',
    awaitingReview: 'This observance sequence is awaiting calendar review.',
    verifyingDetails: 'Calendar details are being verified before publication.',
  },
  hi: {
    today: 'आज',
    tomorrow: 'कल',
    inDays: (days: number) => `${days} दिनों में`,
    dayOf: (day: number, total: number) => `दिन ${day} / ${total}`,
    begins: 'आरंभ',
    concludesToday: 'आज समापन',
    learnMore: 'और जानें',
    reviewPending: 'समीक्षा लंबित',
    missingDates: 'कुछ पर्व तिथियों का सत्यापन जारी है।',
    awaitingReview: 'यह पर्व क्रम कैलेंडर समीक्षा की प्रतीक्षा में है।',
    verifyingDetails: 'प्रकाशन से पहले कैलेंडर विवरण सत्यापित किए जा रहे हैं।',
  },
  pa: {
    today: 'ਅੱਜ',
    tomorrow: 'ਕੱਲ੍ਹ',
    inDays: (days: number) => `${days} ਦਿਨਾਂ ਵਿੱਚ`,
    dayOf: (day: number, total: number) => `ਦਿਨ ${day} / ${total}`,
    begins: 'ਸ਼ੁਰੂ',
    concludesToday: 'ਅੱਜ ਸਮਾਪਤੀ',
    learnMore: 'ਹੋਰ ਜਾਣੋ',
    reviewPending: 'ਸਮੀਖਿਆ ਬਾਕੀ',
    missingDates: 'ਕੁਝ ਪੁਰਬ ਮਿਤੀਆਂ ਦੀ ਜਾਂਚ ਜਾਰੀ ਹੈ।',
    awaitingReview: 'ਇਹ ਪੁਰਬ ਲੜੀ ਕੈਲੰਡਰ ਸਮੀਖਿਆ ਦੀ ਉਡੀਕ ਵਿੱਚ ਹੈ।',
    verifyingDetails: 'ਪ੍ਰਕਾਸ਼ਨ ਤੋਂ ਪਹਿਲਾਂ ਕੈਲੰਡਰ ਵੇਰਵਿਆਂ ਦੀ ਜਾਂਚ ਹੋ ਰਹੀ ਹੈ।',
  },
} as const;

export function getNativeSeriesCardCopy(lang: NativeSeriesCardLanguage) {
  return NATIVE_SERIES_CARD_COPY[lang];
}

export interface EditorialApplicabilityContext {
  region?: string;
  calendarProfile?: string;
  tradition?: string;
  sampradaya?: string;
}

function includesNormalized(values: string[] | undefined, candidate: string | undefined): boolean {
  if (!values?.length) return true;
  if (!candidate) return false;
  const normalizedCandidate = candidate.trim().toLocaleLowerCase();
  return values.some(value => value.trim().toLocaleLowerCase() === normalizedCandidate);
}

export function isEditorialFieldDisplayable<T>(
  field: LocalizedEditorialField<T> | null | undefined,
  context?: EditorialApplicabilityContext,
): field is LocalizedEditorialField<T> {
  if (!field || field.status === 'pending_source' || field.status === 'withheld') return false;
  if (field.status === 'source_backed' && field.sourceRefs.length === 0) return false;
  if (field.status === 'council_reviewed_editorial' && !field.reviewRef) return false;

  const applicability = field.applicability;
  const hasScopedValues = Boolean(
    applicability.regions?.length
    || applicability.calendarProfiles?.length
    || applicability.traditions?.length
    || applicability.sampradayas?.length,
  );
  if (applicability.universal) return !hasScopedValues;

  return hasScopedValues
    && includesNormalized(applicability.regions, context?.region)
    && includesNormalized(applicability.calendarProfiles, context?.calendarProfile)
    && includesNormalized(applicability.traditions, context?.tradition)
    && includesNormalized(applicability.sampradayas, context?.sampradaya);
}

function resolveText(
  field: LocalizedEditorialField<{ en: string; hi?: string; pa?: string }> | null | undefined,
  lang: 'en' | 'hi' | 'pa',
  context?: EditorialApplicabilityContext,
): string {
  if (!isEditorialFieldDisplayable(field, context)) return '';
  if (lang === 'hi' && field.value.hi && field.translationStatus?.hi !== 'pending') return field.value.hi;
  if (lang === 'pa' && field.value.pa && field.translationStatus?.pa !== 'pending') return field.value.pa;
  if (field.translationStatus?.en === 'pending') return '';
  return field.value.en || '';
}

function resolveList(
  field: LocalizedEditorialField<{ en: string[]; hi?: string[]; pa?: string[] }> | null | undefined,
  lang: 'en' | 'hi' | 'pa',
  context?: EditorialApplicabilityContext,
): string[] {
  if (!isEditorialFieldDisplayable(field, context)) return [];
  if (lang === 'hi' && field.value.hi?.length && field.translationStatus?.hi !== 'pending') return field.value.hi;
  if (lang === 'pa' && field.value.pa?.length && field.translationStatus?.pa !== 'pending') return field.value.pa;
  if (field.translationStatus?.en === 'pending') return [];
  return field.value.en || [];
}

export function getSafeNativeEditorialCopy(
  child: ObservanceSeriesChild,
  lang: 'en' | 'hi' | 'pa' = 'en',
  context?: EditorialApplicabilityContext,
): { title: string; subtitle: string; description: string | null; rituals: string[] } {
  const title = resolveText(child.editorial?.canonicalTitle, lang, context) || child.title;
  const subtitle = resolveText(child.editorial?.deityOrTheme, lang, context);
  const resolvedDescription = resolveText(child.editorial?.significance, lang, context);
  const description = resolvedDescription || null;
  const rituals = resolveList(child.editorial?.rituals, lang, context);
  return { title, subtitle, description, rituals };
}

export function getSafeNativeSeriesName(
  series: ObservanceSeries,
  lang: NativeSeriesCardLanguage = 'en',
  context?: EditorialApplicabilityContext,
): string {
  return resolveText(series.editorial?.name, lang, context) || series.name;
}

export function getNativeSeriesCardChildren(series: ObservanceSeries): ObservanceSeriesChild[] {
  if (series.status === 'upcoming') {
    const first = [...series.children]
      .filter(child => child.status === 'resolved' && child.civilDate && child.occurrenceId)
      .sort((a, b) => a.sequence - b.sequence)[0];
    return first ? [first] : [];
  }
  if (series.status !== 'active' && series.status !== 'concluding') return [];

  const activeIds = new Set(series.activeChildOccurrenceIds);
  if (activeIds.size === 0) return [];
  return series.children.filter(child => Boolean(child.occurrenceId && activeIds.has(child.occurrenceId)));
}

export function nativeCalendarDayDistance(fromDate: string, toDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) return null;
  const [fromYear, fromMonth, fromDay] = fromDate.split('-').map(Number);
  const [toYear, toMonth, toDay] = toDate.split('-').map(Number);
  return Math.round(
    (Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) / 86_400_000,
  );
}

export function getNativeSeriesCardDayDistance(
  series: ObservanceSeries,
  spiritualDate: string,
): number | null {
  if (series.status === 'under_review') {
    return series.startDate ? nativeCalendarDayDistance(spiritualDate, series.startDate) : null;
  }
  const firstDisplayChild = getNativeSeriesCardChildren(series)[0];
  const targetDate = firstDisplayChild?.civilDate ?? series.startDate;
  return targetDate ? nativeCalendarDayDistance(spiritualDate, targetDate) : null;
}

export function getNativeSeriesReviewMessage(
  series: ObservanceSeries,
  lang: NativeSeriesCardLanguage = 'en',
): string {
  const copy = getNativeSeriesCardCopy(lang);
  if (series.diagnostics.some(code => code.includes('missing_required_series_child'))) {
    return copy.missingDates;
  }
  if (series.diagnostics.some(code => code.includes('series_child_under_review'))) {
    return copy.awaitingReview;
  }
  return copy.verifyingDetails;
}
