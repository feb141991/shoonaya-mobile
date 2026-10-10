import {
  AntardashaEntry,
  BirthProfileDetail,
  DashaEntry,
  GRAHA_LABELS_EN,
} from '@/lib/kundali-contract';

export interface KundaliSummaryModel {
  timeUnknown: boolean;
  displayName: string;
  birthDate: string;
  birthTime: string | null;
  birthplace: string;
  lagna: string | null;
  moonSign: string | null;
  sunSign: string | null;
  nakshatra: string | null;
  pada: number | null;
  tithi: string | null;
  paksha: string | null;
  vara: string | null;
  yoga: string | null;
  karana: string | null;
  engineVersion: string | null;
  precision: 'high' | 'partial' | null;
  qualityGrade: 'estimate' | 'high' | null;
}

export interface CalculatedChartFactor {
  id: string;
  title: string;
  detail: string;
  classification: 'Exalted placement' | 'Own-sign placement';
}

export interface KundaliInsightModel {
  timeUnknown: boolean;
  currentDasha: DashaEntry | null;
  currentAntardasha: AntardashaEntry | null;
  factors: CalculatedChartFactor[];
}

function nonEmpty(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function formatKundaliDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function buildKundaliSummaryModel(profile: BirthProfileDetail): KundaliSummaryModel {
  const chart = profile.chart_data;
  const panchang = chart.birthPanchang;
  const timeUnknown = chart.timeUnknown;

  return {
    timeUnknown,
    displayName: nonEmpty(profile.full_name) ?? profile.label,
    birthDate: formatKundaliDate(profile.date_of_birth),
    birthTime: timeUnknown ? null : nonEmpty(profile.time_of_birth),
    birthplace: [nonEmpty(profile.birth_city), nonEmpty(profile.birth_country)]
      .filter((part): part is string => part !== null)
      .join(', ') || 'Not provided',
    lagna: timeUnknown ? null : nonEmpty(chart.lagna?.rashiName),
    moonSign: nonEmpty(profile.rashi) ?? nonEmpty(chart.planets.Chandra?.rashiName),
    sunSign: nonEmpty(profile.sun_rashi) ?? nonEmpty(chart.planets.Surya?.rashiName),
    nakshatra: nonEmpty(panchang?.nakshatra.name) ?? nonEmpty(chart.nakshatra?.name),
    pada: timeUnknown ? null : panchang?.nakshatra.pada ?? chart.nakshatra?.pada ?? null,
    tithi: timeUnknown ? null : nonEmpty(panchang?.tithi.name),
    paksha: timeUnknown ? null : nonEmpty(panchang?.tithi.paksha),
    vara: timeUnknown ? null : nonEmpty(panchang?.vara.name),
    yoga: timeUnknown ? null : nonEmpty(panchang?.yoga.name),
    karana: timeUnknown ? null : nonEmpty(panchang?.karana.name),
    engineVersion: nonEmpty(panchang?.calculation.engineVersion),
    precision: panchang?.calculation.precision ?? null,
    qualityGrade: chart.quality?.grade ?? null,
  };
}

export function buildKundaliInsightModel(profile: BirthProfileDetail): KundaliInsightModel {
  const chart = profile.chart_data;
  if (chart.timeUnknown) {
    return { timeUnknown: true, currentDasha: null, currentAntardasha: null, factors: [] };
  }

  const factors = Object.entries(chart.planets).flatMap(([key, position]) => {
    if (position.dignity !== 'exalted' && position.dignity !== 'own') return [];
    const planet = GRAHA_LABELS_EN[key] ?? key;
    const classification = position.dignity === 'exalted'
      ? 'Exalted placement' as const
      : 'Own-sign placement' as const;

    return [{
      id: `${key}-${position.dignity}-${position.house}`,
      title: `${planet} · ${classification}`,
      detail: `${planet} is recorded in ${position.rashiName}, house ${position.house}.`,
      classification,
    }];
  });

  return {
    timeUnknown: false,
    currentDasha: chart.dasha?.current ?? null,
    currentAntardasha: chart.dasha?.currentAntardasha ?? null,
    factors,
  };
}
