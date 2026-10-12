export type KundaliDetailTab = 'chart' | 'identity' | 'panchang' | 'planets' | 'dasha';

const KUNDALI_DETAIL_TAB_SET = new Set<KundaliDetailTab>([
  'chart',
  'identity',
  'panchang',
  'planets',
  'dasha',
]);

export function resolveKundaliDetailTab(value: string | undefined): KundaliDetailTab {
  return value && KUNDALI_DETAIL_TAB_SET.has(value as KundaliDetailTab)
    ? value as KundaliDetailTab
    : 'chart';
}
