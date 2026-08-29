import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateDashaProgress,
  formatDegreeMinutes,
  buildPrivacySafeShareSummary,
  validateBirthProfileDetail,
  isValidAstroChart,
  isValidGrahaPosition,
  AstroChart,
} from '@/lib/kundali-contract';

// Fixture 1: Valid Known-Birth-Time Kundali
const MOCK_VALID_KNOWN_CHART: AstroChart = {
  utcBirthTime: '1991-02-14T01:00:00.000Z',
  julianDay: 2448301.54,
  ayanamsa: 23.74,
  timeUnknown: false,
  quality: { grade: 'high', notes: [] },
  lagna: {
    tropicalDeg: 310.2,
    siderealDeg: 286.46,
    rashiIndex: 9, // Makara (Capricorn)
    rashiName: 'Makara',
    degreeInRashi: 16.46,
    house: 1,
    isRetrograde: false,
  },
  planets: {
    Surya: {
      tropicalDeg: 325.5,
      siderealDeg: 301.76,
      rashiIndex: 10, // Kumbha
      rashiName: 'Kumbha',
      degreeInRashi: 1.76,
      house: 2,
      isRetrograde: false,
      dignity: 'neutral',
      isCombust: false,
    },
    Chandra: {
      tropicalDeg: 320.1,
      siderealDeg: 296.36,
      rashiIndex: 9, // Makara
      rashiName: 'Makara',
      degreeInRashi: 26.36,
      house: 1, // Sharing house 1 with Lagna
      isRetrograde: false,
      dignity: 'neutral',
      isCombust: false,
    },
    Mangal: {
      tropicalDeg: 78.4,
      siderealDeg: 54.66,
      rashiIndex: 1, // Vrishabha
      rashiName: 'Vrishabha',
      degreeInRashi: 24.66,
      house: 5,
      isRetrograde: false,
      dignity: 'neutral',
      isCombust: false,
    },
    Budha: {
      tropicalDeg: 305.2,
      siderealDeg: 281.46,
      rashiIndex: 9, // Makara
      rashiName: 'Makara',
      degreeInRashi: 11.46,
      house: 1, // Multiple planets in House 1 (Chandra + Budha + Lagna)
      isRetrograde: true,
      dignity: 'neutral',
      isCombust: false,
    },
    Guru: {
      tropicalDeg: 130.5,
      siderealDeg: 106.76,
      rashiIndex: 3, // Karka (Exalted)
      rashiName: 'Karka',
      degreeInRashi: 16.76,
      house: 7,
      isRetrograde: true,
      dignity: 'exalted',
      isCombust: false,
    },
    Shukra: {
      tropicalDeg: 350.2,
      siderealDeg: 326.46,
      rashiIndex: 10, // Kumbha
      rashiName: 'Kumbha',
      degreeInRashi: 26.46,
      house: 2,
      isRetrograde: false,
      dignity: 'neutral',
      isCombust: true, // Combust with Sun in H2
    },
    Shani: {
      tropicalDeg: 301.2,
      siderealDeg: 277.46,
      rashiIndex: 9, // Makara (Own Sign)
      rashiName: 'Makara',
      degreeInRashi: 7.46,
      house: 1,
      isRetrograde: false,
      dignity: 'own',
      isCombust: false,
    },
    Rahu: {
      tropicalDeg: 295.4,
      siderealDeg: 271.66,
      rashiIndex: 9, // Makara (Debilitated / Neutral)
      rashiName: 'Makara',
      degreeInRashi: 1.66,
      house: 1,
      isRetrograde: true,
      dignity: 'debilitated',
      isCombust: false,
    },
    Ketu: {
      tropicalDeg: 115.4,
      siderealDeg: 91.66,
      rashiIndex: 3, // Karka
      rashiName: 'Karka',
      degreeInRashi: 1.66,
      house: 7,
      isRetrograde: true,
      dignity: 'neutral',
      isCombust: false,
    },
  },
  nakshatra: {
    name: 'Dhanishta',
    index: 22,
    pada: 1,
    lord: 'Mangal',
    traversedFrac: 0.22,
    remainingFrac: 0.78,
    devata: 'Vasus',
    gana: 'Rakshasa',
    animalSymbol: 'Lion',
  },
  dasha: {
    timeline: [
      { planet: 'Mangal', startDate: '1986-05-10', endDate: '1993-05-10', years: 7, isCurrent: false },
      { planet: 'Rahu', startDate: '1993-05-10', endDate: '2011-05-10', years: 18, isCurrent: false },
      { planet: 'Guru', startDate: '2011-05-10', endDate: '2027-05-10', years: 16, isCurrent: true },
      { planet: 'Shani', startDate: '2027-05-10', endDate: '2046-05-10', years: 19, isCurrent: false },
    ],
    current: {
      planet: 'Guru',
      startDate: '2011-05-10',
      endDate: '2027-05-10',
      years: 16,
      isCurrent: true,
    },
    currentAntardasha: {
      planet: 'Rahu',
      startDate: '2024-01-15',
      endDate: '2026-06-18',
    },
  },
  schemaVersion: 2,
  birthPanchang: {
    instantUtc: '1991-02-14T01:00:00.000Z',
    localDate: '1991-02-14',
    localTime: '06:30',
    timezone: 'Asia/Kolkata',
    vara: { index: 4, name: 'Guruvara' },
    tithi: { index: 30, name: 'Amavasya', paksha: 'Krishna', endsAtUtc: null },
    nakshatra: { index: 22, name: 'Dhanishtha', pada: 1, endsAtUtc: null },
    yoga: { index: 17, name: 'Variyana', endsAtUtc: null },
    karana: { index: 9, name: 'Nagava', endsAtUtc: null },
    calculation: {
      engineVersion: '2.0.0-panchang-engine',
      ayanamsa: 'lahiri',
      precision: 'high',
      diagnostics: ['Calculated at birth instant'],
    },
  },
};

const MOCK_PROFILE_PAYLOAD = {
  profile: {
    id: 'prof_test_123',
    owner_id: 'user_test_abc',
    label: 'Arjun Sharma',
    full_name: 'Arjun Sharma',
    relation: 'self',
    date_of_birth: '1991-02-14',
    time_of_birth: '06:30',
    birth_city: 'Mumbai',
    birth_country: 'India',
    birth_lat: 19.076,
    birth_lng: 72.8777,
    birth_timezone: 'Asia/Kolkata',
    rashi: 'Makara',
    sun_rashi: 'Kumbha',
    nakshatra: 'Dhanishta',
    nakshatra_pada: 1,
    nakshatra_lord: 'Mangal',
    lagna: 'Makara',
    lagna_deg: 16.46,
    ayanamsa: 23.74,
    chart_data: MOCK_VALID_KNOWN_CHART,
    current_dasha_planet: 'Guru',
    current_dasha_end_date: '2027-05-10',
    next_dasha_planet: 'Shani',
    is_primary: true,
    is_public: false,
  },
};

// Fixture 2: Unknown Birth Time Kundali
const MOCK_UNKNOWN_TIME_CHART: AstroChart = {
  ...MOCK_VALID_KNOWN_CHART,
  timeUnknown: true,
  birthPanchang: null,
  quality: { grade: 'estimate', notes: ['Birth time unknown; noon reference used'] },
  lagna: {
    tropicalDeg: 0,
    siderealDeg: 0,
    rashiIndex: 0,
    rashiName: 'Unknown',
    degreeInRashi: 0,
    house: 1,
    isRetrograde: false,
  },
};

describe('Native Kundali Contract & Runtime Safety', () => {
  it('1. Validates a well-formed birth profile detail payload', () => {
    const validated = validateBirthProfileDetail(MOCK_PROFILE_PAYLOAD);
    assert.notEqual(validated, null);
    assert.equal(validated?.id, 'prof_test_123');
    assert.equal(validated?.label, 'Arjun Sharma');
    assert.equal(validated?.rashi, 'Makara');
    assert.equal(validated?.chart_data.schemaVersion, 2);
    assert.equal(validated?.chart_data.lagna.rashiName, 'Makara');
    assert.equal(validated?.chart_data.planets.Guru.dignity, 'exalted');
  });

  it('2. Rejects malformed or missing payloads safely without throwing', () => {
    assert.equal(validateBirthProfileDetail(null), null);
    assert.equal(validateBirthProfileDetail(undefined), null);
    assert.equal(validateBirthProfileDetail({}), null);
    assert.equal(validateBirthProfileDetail({ profile: { id: '' } }), null);
    assert.equal(validateBirthProfileDetail({ profile: { id: '123', date_of_birth: 'invalid-date' } }), null);
    assert.equal(
      validateBirthProfileDetail({
        profile: {
          id: '123',
          label: 'Test',
          date_of_birth: '1990-01-01',
          chart_data: { corrupted: true },
        },
      }),
      null
    );
  });

  it('3. Evaluates Graha position structure defensively', () => {
    assert.equal(
      isValidGrahaPosition({
        rashiIndex: 0,
        degreeInRashi: 14.5,
        house: 1,
        isRetrograde: false,
      }),
      true
    );

    // Invalid rashiIndex (> 11)
    assert.equal(
      isValidGrahaPosition({
        rashiIndex: 15,
        degreeInRashi: 14.5,
        house: 1,
        isRetrograde: false,
      }),
      false
    );

    // Invalid house (< 1 or > 12)
    assert.equal(
      isValidGrahaPosition({
        rashiIndex: 0,
        degreeInRashi: 14.5,
        house: 13,
        isRetrograde: false,
      }),
      false
    );

    // NaN degree
    assert.equal(
      isValidGrahaPosition({
        rashiIndex: 0,
        degreeInRashi: NaN,
        house: 1,
        isRetrograde: false,
      }),
      false
    );
  });

  it('4. Correctly validates known-time vs unknown-time AstroChart', () => {
    assert.equal(isValidAstroChart(MOCK_VALID_KNOWN_CHART), true);
    assert.equal(isValidAstroChart(MOCK_UNKNOWN_TIME_CHART), true);

    // If known-time but lagna is missing/invalid, should reject
    const invalidKnown = {
      ...MOCK_VALID_KNOWN_CHART,
      timeUnknown: false,
      lagna: null as any,
    };
    assert.equal(isValidAstroChart(invalidKnown), false);
  });

  it('5. Correct Lagna-to-Rashi house mapping in North Indian chart', () => {
    // For Lagna Makara (rashiIndex = 9, 10th sign of zodiac):
    // House 1 (Top) should be Rashi 10 (Makara)
    // House 2 should be Rashi 11 (Kumbha)
    // House 3 should be Rashi 12 (Meena)
    // House 4 should be Rashi 1 (Mesha)
    // House 7 should be Rashi 4 (Karka)
    const lagnaIndex = MOCK_VALID_KNOWN_CHART.lagna.rashiIndex; // 9
    const house1RashiNum = ((lagnaIndex + 0) % 12) + 1;
    const house2RashiNum = ((lagnaIndex + 1) % 12) + 1;
    const house3RashiNum = ((lagnaIndex + 2) % 12) + 1;
    const house4RashiNum = ((lagnaIndex + 3) % 12) + 1;
    const house7RashiNum = ((lagnaIndex + 6) % 12) + 1;

    assert.equal(house1RashiNum, 10); // Makara
    assert.equal(house2RashiNum, 11); // Kumbha
    assert.equal(house3RashiNum, 12); // Meena
    assert.equal(house4RashiNum, 1);  // Mesha
    assert.equal(house7RashiNum, 4);  // Karka
  });

  it('6. Supports multiple planets occupying the same house without loss', () => {
    // In our mock chart: Chandra, Budha, Shani, and Rahu are all in House 1 (Makara)
    const planets = MOCK_VALID_KNOWN_CHART.planets;
    const house1Planets = Object.entries(planets).filter(([_, pos]) => pos.house === 1);

    assert.equal(house1Planets.length, 4);
    const names = house1Planets.map(([name]) => name);
    assert.ok(names.includes('Chandra'));
    assert.ok(names.includes('Budha'));
    assert.ok(names.includes('Shani'));
    assert.ok(names.includes('Rahu'));
  });

  it('7. Identifies planetary retrograde, combust, and dignity states accurately', () => {
    const planets = MOCK_VALID_KNOWN_CHART.planets;

    // Guru: Exalted & Retrograde
    assert.equal(planets.Guru.dignity, 'exalted');
    assert.equal(planets.Guru.isRetrograde, true);

    // Shani: Own sign
    assert.equal(planets.Shani.dignity, 'own');

    // Shukra: Combust
    assert.equal(planets.Shukra.isCombust, true);

    // Rahu: Debilitated
    assert.equal(planets.Rahu.dignity, 'debilitated');
  });

  it('8. Dasha progress calculation adheres to bounds (0–100%) and handles edge dates', () => {
    const now = new Date('2026-08-29T00:00:00.000Z');

    // Normal active dasha: Guru (2011 to 2027)
    const progress = calculateDashaProgress('2011-05-10', '2027-05-10', now);
    assert.ok(progress > 80);
    assert.ok(progress < 100);

    // Past dasha: Should clamp to 100%
    assert.equal(calculateDashaProgress('1993-05-10', '2011-05-10', now), 100);

    // Future dasha: Should clamp to 0%
    assert.equal(calculateDashaProgress('2027-05-10', '2046-05-10', now), 0);

    // Invalid / corrupted dates: Should safely return 0
    assert.equal(calculateDashaProgress('invalid', 'dates', now), 0);
    assert.equal(calculateDashaProgress(null, null, now), 0);
    assert.equal(calculateDashaProgress('2027-01-01', '2020-01-01', now), 0); // inverted dates
  });

  it('9. Degrees and minutes formatter returns clean string', () => {
    assert.equal(formatDegreeMinutes(16.46), "16° 28'");
    assert.equal(formatDegreeMinutes(0.5), "0° 30'");
    assert.equal(formatDegreeMinutes(null), '—');
    assert.equal(formatDegreeMinutes(NaN), '—');
  });

  it('10. Privacy-safe share summary strictly excludes DOB, time, coordinates, and raw JSON', () => {
    const profile = validateBirthProfileDetail(MOCK_PROFILE_PAYLOAD)!;
    const summary = buildPrivacySafeShareSummary(profile);

    // Must include identity essentials
    assert.match(summary, /Arjun Sharma/);
    assert.match(summary, /Lagna \(Ascendant\): Makara/);
    assert.match(summary, /Chandra Rashi \(Moon\): Makara/);
    assert.match(summary, /Nakshatra: Dhanishta \(Pada 1\)/);
    assert.match(summary, /Active Dasha: Guru Mahadasha/);

    // MUST NOT contain sensitive private birth details
    assert.doesNotMatch(summary, /1991-02-14/);
    assert.doesNotMatch(summary, /06:30/);
    assert.doesNotMatch(summary, /19\.076/);
    assert.doesNotMatch(summary, /72\.8777/);
    assert.doesNotMatch(summary, /prof_test_123/);
    assert.doesNotMatch(summary, /\{/);
    assert.doesNotMatch(summary, /\}/);
  });

  it('11. Privacy-safe share summary withholds Lagna when birth time is unknown', () => {
    const unknownPayload = {
      profile: {
        ...MOCK_PROFILE_PAYLOAD.profile,
        chart_data: MOCK_UNKNOWN_TIME_CHART,
      },
    };
    const profile = validateBirthProfileDetail(unknownPayload)!;
    const summary = buildPrivacySafeShareSummary(profile);

    assert.doesNotMatch(summary, /Lagna \(Ascendant\)/);
    assert.match(summary, /Chandra Rashi \(Moon\): Makara/);
    assert.match(summary, /Nakshatra: Dhanishta/);
  });

  it('12. Validates BirthPanchangSnapshot schemaVersion 2 accurately', () => {
    const profile = validateBirthProfileDetail(MOCK_PROFILE_PAYLOAD)!;
    const panchang = profile.chart_data.birthPanchang;

    assert.notEqual(panchang, null);
    assert.equal(profile.chart_data.schemaVersion, 2);
    assert.equal(panchang?.vara.name, 'Guruvara');
    assert.equal(panchang?.tithi.name, 'Amavasya');
    assert.equal(panchang?.tithi.paksha, 'Krishna');
    assert.equal(panchang?.nakshatra.name, 'Dhanishtha');
    assert.equal(panchang?.nakshatra.pada, 1);
    assert.equal(panchang?.yoga.name, 'Variyana');
    assert.equal(panchang?.karana.name, 'Nagava');
    assert.equal(panchang?.calculation.precision, 'high');
  });

  it('13. Strictly rejects legacy Schema Version 1 or un-versioned charts', () => {
    const legacyPayload = {
      profile: {
        ...MOCK_PROFILE_PAYLOAD.profile,
        chart_data: {
          ...MOCK_VALID_KNOWN_CHART,
          schemaVersion: 1 as any,
        },
      },
    };
    assert.equal(validateBirthProfileDetail(legacyPayload), null);

    const unversionedPayload = {
      profile: {
        ...MOCK_PROFILE_PAYLOAD.profile,
        chart_data: {
          ...MOCK_VALID_KNOWN_CHART,
          schemaVersion: undefined as any,
        },
      },
    };
    assert.equal(validateBirthProfileDetail(unversionedPayload), null);
  });

  it('14. Enforces birthPanchang is strictly null for time-unknown profiles', () => {
    const validUnknownPayload = {
      profile: {
        ...MOCK_PROFILE_PAYLOAD.profile,
        chart_data: MOCK_UNKNOWN_TIME_CHART,
      },
    };
    const validated = validateBirthProfileDetail(validUnknownPayload);
    assert.notEqual(validated, null);
    assert.equal(validated?.chart_data.timeUnknown, true);
    assert.equal(validated?.chart_data.birthPanchang, null);

    // If an unknown-time profile contains a non-null birthPanchang, it must fail validation
    const invalidUnknownPayload = {
      profile: {
        ...MOCK_PROFILE_PAYLOAD.profile,
        chart_data: {
          ...MOCK_UNKNOWN_TIME_CHART,
          birthPanchang: MOCK_VALID_KNOWN_CHART.birthPanchang,
        },
      },
    };
    assert.equal(validateBirthProfileDetail(invalidUnknownPayload), null);
  });

  it('15. Validates solved transition timestamps (endsAtUtc) in BirthPanchangSnapshot', () => {
    const withTransitions: AstroChart = {
      ...MOCK_VALID_KNOWN_CHART,
      birthPanchang: {
        ...MOCK_VALID_KNOWN_CHART.birthPanchang!,
        tithi: {
          ...MOCK_VALID_KNOWN_CHART.birthPanchang!.tithi,
          endsAtUtc: '1991-02-14T14:22:15.000Z',
        },
        nakshatra: {
          ...MOCK_VALID_KNOWN_CHART.birthPanchang!.nakshatra,
          endsAtUtc: '1991-02-14T19:40:00.000Z',
        },
      },
    };

    const validated = validateBirthProfileDetail({
      profile: {
        ...MOCK_PROFILE_PAYLOAD.profile,
        chart_data: withTransitions,
      },
    });

    assert.notEqual(validated, null);
    assert.equal(validated?.chart_data.birthPanchang?.tithi.endsAtUtc, '1991-02-14T14:22:15.000Z');
    assert.equal(validated?.chart_data.birthPanchang?.nakshatra.endsAtUtc, '1991-02-14T19:40:00.000Z');
  });
});
