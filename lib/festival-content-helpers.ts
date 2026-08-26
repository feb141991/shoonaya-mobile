import { isEditorialFieldDisplayable } from './observance-series-card-helpers';
import type { LocalizedEditorialField } from './observance-series-contract.generated';

/** Withheld/pending fields resolve to '' — never fall back to invented prose. */
export function resolveFestivalText(
  field: LocalizedEditorialField<{ en: string; hi?: string; pa?: string }> | undefined,
  lang: 'en' | 'hi' | 'pa' = 'en',
): string {
  if (!field || !isEditorialFieldDisplayable(field)) return '';
  if (lang === 'hi' && field.value.hi && field.translationStatus?.hi !== 'pending') return field.value.hi;
  if (lang === 'pa' && field.value.pa && field.translationStatus?.pa !== 'pending') return field.value.pa;
  if (field.translationStatus?.en === 'pending') return '';
  return field.value.en || '';
}

/** Withheld/pending fields resolve to [] — never fall back to invented prose. */
export function resolveFestivalList(
  field: LocalizedEditorialField<{ en: string[]; hi?: string[]; pa?: string[] }> | undefined,
  lang: 'en' | 'hi' | 'pa' = 'en',
): string[] {
  if (!field || !isEditorialFieldDisplayable(field)) return [];
  if (lang === 'hi' && field.value.hi?.length && field.translationStatus?.hi !== 'pending') return field.value.hi;
  if (lang === 'pa' && field.value.pa?.length && field.translationStatus?.pa !== 'pending') return field.value.pa;
  if (field.translationStatus?.en === 'pending') return [];
  return field.value.en || [];
}

/** Only a festival whose core narrative fields have cleared editorial review is safe to show. */
export function isFestivalPublishable(festival: {
  significance: LocalizedEditorialField<{ en: string }>;
  rituals: LocalizedEditorialField<{ en: string[] }>;
}): boolean {
  return isEditorialFieldDisplayable(festival.significance) && isEditorialFieldDisplayable(festival.rituals);
}
