/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Kundali Contract & Runtime DTO Validator
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Defines the canonical Native types matching the backend's `astro-engine.ts`
 * and `birth_profiles.chart_data`. Provides strict, defensive runtime type
 * validation so the UI never crashes on malformed, legacy, or unexpected data.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface GrahaPosition {
  tropicalDeg: number;
  siderealDeg: number;
  rashiIndex: number; // 0=Mesha … 11=Meena
  rashiName: string;
  degreeInRashi: number; // 0.00–29.99
  house: number; // 1–12 (Whole Sign from Lagna)
  isRetrograde: boolean;
  dignity?: 'exalted' | 'debilitated' | 'own' | 'neutral';
  isCombust?: boolean;
  nakshatra?: string;
  pada?: number;
  navamshaIndex?: number;
  navamshaName?: string;
}

export interface NakshatraInfo {
  name: string;
  index: number; // 0–26
  pada: number; // 1–4
  lord: string;
  traversedFrac: number;
  remainingFrac: number;
  devata: string;
  gana: string;
  animalSymbol: string;
}

export interface DashaEntry {
  planet: string;
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string;
  years: number;
  isCurrent: boolean;
}

export interface AntardashaEntry {
  planet: string;
  startDate: string;
  endDate: string;
}

export interface DashaInfo {
  timeline: DashaEntry[];
  current: DashaEntry | null;
  currentAntardasha: AntardashaEntry | null;
}

export interface ChartQuality {
  grade: 'estimate' | 'high';
  notes: string[];
}

export const ASTRO_CHART_SCHEMA_VERSION = 2;

export interface BirthPanchangSnapshot {
  instantUtc: string;
  localDate: string;
  localTime: string;
  timezone: string;

  vara: {
    index: number;
    name: string;
  };

  tithi: {
    index: number;
    name: string;
    paksha: 'Shukla' | 'Krishna';
    endsAtUtc: string | null;
  };

  nakshatra: {
    index: number;
    name: string;
    pada: number | null;
    endsAtUtc: string | null;
  };

  yoga: {
    index: number;
    name: string;
    endsAtUtc: string | null;
  };

  karana: {
    index: number;
    name: string;
    endsAtUtc: string | null;
  };

  calculation: {
    engineVersion: string;
    ayanamsa: 'lahiri';
    precision: 'high' | 'partial';
    diagnostics: string[];
  };
}

export interface AstroChart {
  schemaVersion: 2;
  birthPanchang: BirthPanchangSnapshot | null;
  utcBirthTime: string;
  julianDay: number;
  ayanamsa: number;
  lagna: GrahaPosition;
  planets: Record<string, GrahaPosition>;
  nakshatra: NakshatraInfo;
  dasha: DashaInfo;
  quality?: ChartQuality;
  timeUnknown: boolean;
}

export interface BirthProfileDetail {
  id: string;
  owner_id: string | null;
  session_token?: string | null;
  label: string;
  full_name: string | null;
  relation: string;
  date_of_birth: string;
  time_of_birth: string | null;
  birth_city: string | null;
  birth_country: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
  birth_timezone: string | null;
  rashi: string | null;
  sun_rashi: string | null;
  nakshatra: string | null;
  nakshatra_pada: number | null;
  nakshatra_lord: string | null;
  lagna: string | null;
  lagna_deg: number | null;
  ayanamsa: number | null;
  chart_data: AstroChart;
  current_dasha_planet: string | null;
  current_dasha_end_date: string | null;
  next_dasha_planet: string | null;
  is_primary: boolean;
  is_public: boolean;
  created_at?: string;
  updated_at?: string;
}

export const CANONICAL_GRAHA_ORDER = [
  'Surya',
  'Chandra',
  'Mangala',
  'Budha',
  'Guru',
  'Shukra',
  'Shani',
  'Rahu',
  'Ketu',
] as const;

export const GRAHA_LABELS_EN: Record<string, string> = {
  Surya: 'Sun',
  Chandra: 'Moon',
  Mangala: 'Mars',
  Budha: 'Mercury',
  Guru: 'Jupiter',
  Shukra: 'Venus',
  Shani: 'Saturn',
  Rahu: 'North Node (Rahu)',
  Ketu: 'South Node (Ketu)',
};

export const GRAHA_ABBREVIATIONS: Record<string, string> = {
  Surya: 'Su',
  Chandra: 'Mo',
  Mangala: 'Ma',
  Mangal: 'Ma',
  Budha: 'Me',
  Guru: 'Ju',
  Shukra: 'Ve',
  Shani: 'Sa',
  Rahu: 'Ra',
  Ketu: 'Ke',
};

export const RASHI_NAMES_EN = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export const RASHI_NAMES_SA = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka',
  'Simha', 'Kanya', 'Tula', 'Vrishchika',
  'Dhanu', 'Makara', 'Kumbha', 'Meena',
];

/**
 * Validates a GrahaPosition object defensively.
 */
export function isValidGrahaPosition(obj: any): obj is GrahaPosition {
  if (!obj || typeof obj !== 'object') return false;
  return (
    typeof obj.rashiIndex === 'number' &&
    obj.rashiIndex >= 0 &&
    obj.rashiIndex <= 11 &&
    typeof obj.degreeInRashi === 'number' &&
    !isNaN(obj.degreeInRashi) &&
    typeof obj.house === 'number' &&
    obj.house >= 1 &&
    obj.house <= 12 &&
    typeof obj.isRetrograde === 'boolean'
  );
}

/**
 * Validates a BirthPanchangSnapshot structure defensively.
 */
export function isValidBirthPanchangSnapshot(obj: any): obj is BirthPanchangSnapshot {
  if (!obj || typeof obj !== 'object') return false;

  // Timestamps and strings
  if (typeof obj.instantUtc !== 'string' || typeof obj.timezone !== 'string') return false;

  // Vara (0-6)
  if (!obj.vara || typeof obj.vara.index !== 'number' || obj.vara.index < 0 || obj.vara.index > 6 || typeof obj.vara.name !== 'string') {
    return false;
  }

  // Tithi (1-30)
  if (
    !obj.tithi ||
    typeof obj.tithi.index !== 'number' ||
    obj.tithi.index < 1 ||
    obj.tithi.index > 30 ||
    typeof obj.tithi.name !== 'string' ||
    (obj.tithi.paksha !== 'Shukla' && obj.tithi.paksha !== 'Krishna') ||
    (obj.tithi.endsAtUtc !== null && typeof obj.tithi.endsAtUtc !== 'string')
  ) {
    return false;
  }

  // Nakshatra (0-26)
  if (
    !obj.nakshatra ||
    typeof obj.nakshatra.index !== 'number' ||
    obj.nakshatra.index < 0 ||
    obj.nakshatra.index > 26 ||
    typeof obj.nakshatra.name !== 'string' ||
    (obj.nakshatra.pada !== null && (typeof obj.nakshatra.pada !== 'number' || obj.nakshatra.pada < 1 || obj.nakshatra.pada > 4)) ||
    (obj.nakshatra.endsAtUtc !== null && typeof obj.nakshatra.endsAtUtc !== 'string')
  ) {
    return false;
  }

  // Yoga (0-26)
  if (
    !obj.yoga ||
    typeof obj.yoga.index !== 'number' ||
    obj.yoga.index < 0 ||
    obj.yoga.index > 26 ||
    typeof obj.yoga.name !== 'string' ||
    (obj.yoga.endsAtUtc !== null && typeof obj.yoga.endsAtUtc !== 'string')
  ) {
    return false;
  }

  // Karana (1-60)
  if (
    !obj.karana ||
    typeof obj.karana.index !== 'number' ||
    obj.karana.index < 1 ||
    obj.karana.index > 60 ||
    typeof obj.karana.name !== 'string' ||
    (obj.karana.endsAtUtc !== null && typeof obj.karana.endsAtUtc !== 'string')
  ) {
    return false;
  }

  // Calculation metadata
  if (!obj.calculation || typeof obj.calculation.engineVersion !== 'string' || obj.calculation.ayanamsa !== 'lahiri') {
    return false;
  }

  return true;
}

/**
 * Validates an AstroChart object defensively.
 * Strictly enforces ASTRO_CHART_SCHEMA_VERSION = 2.
 */
export function isValidAstroChart(chart: any): chart is AstroChart {
  if (!chart || typeof chart !== 'object') return false;

  // Schema version must strictly be 2
  if (chart.schemaVersion !== ASTRO_CHART_SCHEMA_VERSION) {
    return false;
  }

  const timeUnknown = Boolean(chart.timeUnknown);

  // If time is known: lagna and birthPanchang are mandatory
  if (!timeUnknown) {
    if (!isValidGrahaPosition(chart.lagna)) {
      return false;
    }
    if (!isValidBirthPanchangSnapshot(chart.birthPanchang)) {
      return false;
    }
  } else {
    // If time is unknown: birthPanchang must strictly be null
    if (chart.birthPanchang !== null && chart.birthPanchang !== undefined) {
      return false;
    }
  }

  // Planets map must exist and have valid structure
  if (!chart.planets || typeof chart.planets !== 'object') return false;
  for (const name of CANONICAL_GRAHA_ORDER) {
    if (chart.planets[name] && !isValidGrahaPosition(chart.planets[name])) {
      return false;
    }
  }

  // Nakshatra must have name, lord, and pada
  if (
    !chart.nakshatra ||
    typeof chart.nakshatra.name !== 'string' ||
    typeof chart.nakshatra.pada !== 'number'
  ) {
    return false;
  }

  // Dasha must have timeline array
  if (!chart.dasha || !Array.isArray(chart.dasha.timeline)) {
    return false;
  }

  return true;
}

/**
 * Validates the full GET /api/jyotish/birth-profiles/[id] response payload.
 */
export function validateBirthProfileDetail(payload: unknown): BirthProfileDetail | null {
  if (!payload || typeof payload !== 'object') return null;

  const raw = (payload as any).profile ?? payload;
  if (!raw || typeof raw !== 'object') return null;

  if (typeof raw.id !== 'string' || !raw.id.trim()) return null;
  if (typeof raw.label !== 'string' && typeof raw.full_name !== 'string') return null;
  if (typeof raw.date_of_birth !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(raw.date_of_birth)) return null;

  if (!isValidAstroChart(raw.chart_data)) {
    return null;
  }

  return {
    id: raw.id,
    owner_id: raw.owner_id ?? null,
    session_token: raw.session_token ?? null,
    label: raw.label || raw.full_name || 'My Chart',
    full_name: raw.full_name ?? null,
    relation: raw.relation ?? 'self',
    date_of_birth: raw.date_of_birth,
    time_of_birth: raw.time_of_birth ?? null,
    birth_city: raw.birth_city ?? null,
    birth_country: raw.birth_country ?? null,
    birth_lat: typeof raw.birth_lat === 'number' ? raw.birth_lat : null,
    birth_lng: typeof raw.birth_lng === 'number' ? raw.birth_lng : null,
    birth_timezone: raw.birth_timezone ?? null,
    rashi: raw.rashi ?? null,
    sun_rashi: raw.sun_rashi ?? null,
    nakshatra: raw.nakshatra ?? null,
    nakshatra_pada: raw.nakshatra_pada ?? null,
    nakshatra_lord: raw.nakshatra_lord ?? null,
    lagna: raw.lagna ?? null,
    lagna_deg: typeof raw.lagna_deg === 'number' ? raw.lagna_deg : null,
    ayanamsa: typeof raw.ayanamsa === 'number' ? raw.ayanamsa : null,
    chart_data: raw.chart_data,
    current_dasha_planet: raw.current_dasha_planet ?? null,
    current_dasha_end_date: raw.current_dasha_end_date ?? null,
    next_dasha_planet: raw.next_dasha_planet ?? null,
    is_primary: Boolean(raw.is_primary),
    is_public: Boolean(raw.is_public),
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

/**
 * Calculates visual progress percentage between two ISO date strings safely.
 * Returns a clamped number 0–100.
 */
export function calculateDashaProgress(
  startDateStr: string | undefined | null,
  endDateStr: string | undefined | null,
  now: Date = new Date()
): number {
  if (!startDateStr || !endDateStr) return 0;

  const startMs = new Date(startDateStr).getTime();
  const endMs = new Date(endDateStr).getTime();
  const nowMs = now.getTime();

  if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) return 0;
  if (nowMs <= startMs) return 0;
  if (nowMs >= endMs) return 100;

  const progress = ((nowMs - startMs) / (endMs - startMs)) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

/**
 * Formats a degree number (e.g. 14.372) into degrees and minutes (e.g. 14° 22').
 */
export function formatDegreeMinutes(deg: number | undefined | null): string {
  if (deg === undefined || deg === null || isNaN(deg)) return '—';
  const degrees = Math.floor(deg);
  const minutes = Math.round((deg - degrees) * 60);
  return `${degrees}° ${String(minutes).padStart(2, '0')}'`;
}

/**
 * Generates a privacy-safe text summary for sharing.
 * Strictly excludes date of birth, time, coordinates, profile ID, or raw JSON.
 */
export function buildPrivacySafeShareSummary(profile: BirthProfileDetail): string {
  const chart = profile.chart_data;
  const parts: string[] = [];

  parts.push(`✨ Vedic Kundali Summary for ${profile.label}`);

  if (!chart.timeUnknown && chart.lagna?.rashiName) {
    parts.push(`• Lagna (Ascendant): ${chart.lagna.rashiName}`);
  }

  if (profile.rashi) {
    parts.push(`• Chandra Rashi (Moon): ${profile.rashi}`);
  }

  if (profile.nakshatra) {
    const padaText = profile.nakshatra_pada ? ` (Pada ${profile.nakshatra_pada})` : '';
    parts.push(`• Nakshatra: ${profile.nakshatra}${padaText}`);
  }

  if (chart.dasha?.current?.planet) {
    parts.push(`• Active Dasha: ${chart.dasha.current.planet} Mahadasha`);
  }

  parts.push('\nCalculated with Shoonaya Sacred Vedic Sanctuary.');
  return parts.join('\n');
}
