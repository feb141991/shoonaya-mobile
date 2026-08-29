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

const MAX_LIMB_TRANSITION_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours maximum physical transition window

const CANONICAL_TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi',
  'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi',
  'Trayodashi', 'Chaturdashi', 'Purnima', 'Amavasya',
] as const;

const CANONICAL_NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni',
  'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha',
  'Jyeshtha', 'Moola', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana',
  'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
] as const;

const CANONICAL_YOGA_NAMES = [
  'Vishkamba', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda',
  'Sukarman', 'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata',
  'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyana', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
] as const;

const MOVABLE_KARANA_NAMES = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti'] as const;

export const CANONICAL_VARA_NAMES = [
  'Ravivara',
  'Somavara',
  'Mangalavara',
  'Budhavara',
  'Guruvara',
  'Shukravara',
  'Shanivara',
] as const;

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

function isValidIsoInstant(val: any): boolean {
  if (typeof val !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(val)) return false;
  const ms = Date.parse(val);
  return Number.isFinite(ms);
}

function isValidCivilDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isValidCivilTime(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? 0);
  return hour <= 23 && minute <= 59 && second <= 59;
}

function isValidIanaTimezone(value: unknown): value is string {
  if (typeof value !== 'string' || (value !== 'UTC' && !value.includes('/'))) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

function instantMatchesLocalClock(instantUtc: string, localDate: string, localTime: string, timezone: string): boolean {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const parts = formatter.formatToParts(new Date(instantUtc));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const formattedDate = `${get('year')}-${get('month')}-${get('day')}`;
  const formattedTime = `${String(Number(get('hour')) % 24).padStart(2, '0')}:${get('minute')}:${get('second')}`;
  return formattedDate === localDate && formattedTime.startsWith(localTime.length === 5 ? `${localTime}:` : localTime);
}

function expectedTithiName(index: number): string | null {
  const withinPaksha = ((index - 1) % 15) + 1;
  if (withinPaksha === 15) return index <= 15 ? 'Purnima' : 'Amavasya';
  return CANONICAL_TITHI_NAMES[withinPaksha - 1] ?? null;
}

function expectedKaranaName(index: number): string | null {
  if (index === 1) return 'Kimstughna';
  if (index >= 58 && index <= 60) return ['Shakuni', 'Chatushpada', 'Nagava'][index - 58] ?? null;
  if (index >= 2 && index <= 57) return MOVABLE_KARANA_NAMES[(index - 2) % MOVABLE_KARANA_NAMES.length];
  return null;
}

function isValidTransitionBoundary(endsAtUtc: string | null, instantUtcMs: number): boolean {
  if (endsAtUtc === null) return true;
  if (!isValidIsoInstant(endsAtUtc)) return false;
  const endsMs = Date.parse(endsAtUtc);
  // Must be strictly after birth instant
  if (endsMs <= instantUtcMs) return false;
  // Must not exceed plausible physical transition bound (48h)
  if (endsMs - instantUtcMs > MAX_LIMB_TRANSITION_WINDOW_MS) return false;
  return true;
}

/**
 * Validates a BirthPanchangSnapshot structure defensively.
 */
export function isValidBirthPanchangSnapshot(obj: any): obj is BirthPanchangSnapshot {
  if (!obj || typeof obj !== 'object') return false;

  // 1. Instant and Local Time Syntax
  if (!isValidIsoInstant(obj.instantUtc)) return false;
  if (!isValidCivilDate(obj.localDate)) return false;
  if (!isValidCivilTime(obj.localTime)) return false;
  if (!isValidIanaTimezone(obj.timezone)) return false;
  if (!instantMatchesLocalClock(obj.instantUtc, obj.localDate, obj.localTime, obj.timezone)) return false;

  const instantUtcMs = Date.parse(obj.instantUtc);

  // 2. Vara (0-6)
  if (
    !obj.vara ||
    typeof obj.vara.index !== 'number' ||
    obj.vara.index < 0 ||
    obj.vara.index > 6 ||
    typeof obj.vara.name !== 'string' ||
    !CANONICAL_VARA_NAMES.includes(obj.vara.name as any)
  ) {
    return false;
  }

  // 3. Tithi (1-30) & Paksha matching
  if (
    !obj.tithi ||
    typeof obj.tithi.index !== 'number' ||
    obj.tithi.index < 1 ||
    obj.tithi.index > 30 ||
    obj.tithi.name !== expectedTithiName(obj.tithi.index) ||
    (obj.tithi.paksha !== 'Shukla' && obj.tithi.paksha !== 'Krishna') ||
    (obj.tithi.index <= 15 && obj.tithi.paksha !== 'Shukla') ||
    (obj.tithi.index > 15 && obj.tithi.paksha !== 'Krishna') ||
    !isValidTransitionBoundary(obj.tithi.endsAtUtc, instantUtcMs)
  ) {
    return false;
  }

  // 4. Nakshatra (0-26) & Pada (1-4)
  if (
    !obj.nakshatra ||
    typeof obj.nakshatra.index !== 'number' ||
    obj.nakshatra.index < 0 ||
    obj.nakshatra.index > 26 ||
    obj.nakshatra.name !== CANONICAL_NAKSHATRA_NAMES[obj.nakshatra.index] ||
    (obj.nakshatra.pada !== null && (typeof obj.nakshatra.pada !== 'number' || obj.nakshatra.pada < 1 || obj.nakshatra.pada > 4)) ||
    !isValidTransitionBoundary(obj.nakshatra.endsAtUtc, instantUtcMs)
  ) {
    return false;
  }

  // 5. Yoga (0-26)
  if (
    !obj.yoga ||
    typeof obj.yoga.index !== 'number' ||
    obj.yoga.index < 0 ||
    obj.yoga.index > 26 ||
    obj.yoga.name !== CANONICAL_YOGA_NAMES[obj.yoga.index] ||
    !isValidTransitionBoundary(obj.yoga.endsAtUtc, instantUtcMs)
  ) {
    return false;
  }

  // 6. Karana (1-60)
  if (
    !obj.karana ||
    typeof obj.karana.index !== 'number' ||
    obj.karana.index < 1 ||
    obj.karana.index > 60 ||
    obj.karana.name !== expectedKaranaName(obj.karana.index) ||
    !isValidTransitionBoundary(obj.karana.endsAtUtc, instantUtcMs)
  ) {
    return false;
  }

  // 7. Calculation metadata
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

  // timeUnknown must strictly be a boolean
  if (typeof chart.timeUnknown !== 'boolean') {
    return false;
  }

  // If time is known: lagna and birthPanchang are mandatory
  if (!chart.timeUnknown) {
    if (!isValidGrahaPosition(chart.lagna)) {
      return false;
    }
    if (!isValidBirthPanchangSnapshot(chart.birthPanchang)) {
      return false;
    }
  } else {
    // If time is unknown: birthPanchang must strictly be null (undefined is invalid)
    if (chart.birthPanchang !== null) {
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
