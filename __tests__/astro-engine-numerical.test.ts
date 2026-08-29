import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';

import {
  isValidAstroChart,
  isValidBirthPanchangSnapshot,
  AstroChart,
} from '@/lib/kundali-contract';

// Import backend astro-engine directly to execute real numerical calculations
const BACKEND_ROOT = path.resolve(__dirname, '../../Sanatan Sangam/Shoonaya');
const { generateAstroChart, birthLocalToUTC } = require(path.join(BACKEND_ROOT, 'src/lib/jyotish/astro-engine.ts'));
const { computeAstronomy } = require(path.join(BACKEND_ROOT, 'packages/panchang-engine/src/index.ts'));

function circularResidual(value: number, step: number): number {
  const mod = ((value % step) + step) % step;
  return Math.min(mod, step - mod);
}

describe('Astro Engine Real Numerical Calculations & Invariants', () => {
  // Fixture 1: Ordinary Known-Time Birth (Ujjain, India — Prime meridian of ancient Indian astronomy)
  it('calculates valid AstroChart v2 for ordinary known-time birth in Ujjain', () => {
    const input = {
      date: '1991-02-14',
      time: '06:30',
      lat: 23.1765,
      lng: 75.7885,
      timezone: 'Asia/Kolkata',
      timeUnknown: false,
    };

    const chart: AstroChart = generateAstroChart(input);

    assert.strictEqual(chart.schemaVersion, 2);
    assert.strictEqual(chart.timeUnknown, false);
    assert.strictEqual(typeof chart.ayanamsa, 'number');
    assert.ok(chart.ayanamsa > 23.0 && chart.ayanamsa < 24.5); // Lahiri ayanamsa ~23.74° for 1991

    // Panchang snapshot invariants
    assert.ok(chart.birthPanchang !== null);
    const panchang = chart.birthPanchang!;
    assert.strictEqual(panchang.localDate, '1991-02-14');
    assert.strictEqual(panchang.localTime, '06:30');
    assert.strictEqual(panchang.timezone, 'Asia/Kolkata');
    assert.strictEqual(panchang.vara.name, 'Guruvara'); // 1991-02-14 was a Thursday
    assert.strictEqual(panchang.vara.index, 4);

    // Validate limb transitions
    const instantMs = Date.parse(panchang.instantUtc);
    assert.ok(!isNaN(instantMs));

    if (panchang.tithi.endsAtUtc) {
      const tithiEndMs = Date.parse(panchang.tithi.endsAtUtc);
      assert.ok(tithiEndMs > instantMs, 'Tithi end must be strictly after birth moment');
      assert.ok(tithiEndMs - instantMs <= 48 * 3600 * 1000, 'Tithi transition must be <= 48 hours');
    }
    if (panchang.nakshatra.endsAtUtc) {
      const nakEndMs = Date.parse(panchang.nakshatra.endsAtUtc);
      assert.ok(nakEndMs > instantMs, 'Nakshatra end must be strictly after birth moment');
      assert.ok(nakEndMs - instantMs <= 48 * 3600 * 1000, 'Nakshatra transition must be <= 48 hours');
    }

    // Must pass native strict validator
    assert.ok(isValidAstroChart(chart), 'Generated chart must pass isValidAstroChart');

    const atBirth = computeAstronomy(new Date(panchang.instantUtc));
    assert.strictEqual(panchang.tithi.index, Math.floor(atBirth.elongation / 12) + 1);
    assert.strictEqual(panchang.nakshatra.index, Math.floor(atBirth.moonSidereal / (360 / 27)) % 27);
    assert.strictEqual(
      panchang.yoga.index,
      Math.floor((((atBirth.sunSidereal + atBirth.moonSidereal) % 360) + 360) % 360 / (360 / 27)) % 27,
    );
    assert.strictEqual(panchang.karana.index, Math.floor(atBirth.elongation / 6) + 1);

    const boundaryChecks = [
      [panchang.tithi.endsAtUtc, 12, (d: Date) => computeAstronomy(d).elongation],
      [panchang.nakshatra.endsAtUtc, 360 / 27, (d: Date) => computeAstronomy(d).moonSidereal],
      [panchang.yoga.endsAtUtc, 360 / 27, (d: Date) => {
        const a = computeAstronomy(d);
        return a.sunSidereal + a.moonSidereal;
      }],
      [panchang.karana.endsAtUtc, 6, (d: Date) => computeAstronomy(d).elongation],
    ] as const;
    for (const [boundary, step, positionAt] of boundaryChecks) {
      assert.ok(boundary, 'every known-time limb must expose its solved transition');
      assert.ok(circularResidual(positionAt(new Date(boundary!)), step) < 0.002, 'boundary residual must be below 0.002 degrees');
    }
  });

  // Fixture 2: UTC / Civil Date Boundary (23:45 in Tokyo, Japan -> Next day in local time vs UTC)
  it('correctly handles UTC and civil-date boundary calculations', () => {
    const input = {
      date: '2020-12-31',
      time: '23:45',
      lat: 35.6762,
      lng: 139.6503,
      timezone: 'Asia/Tokyo', // UTC+9 -> UTC instant is 2020-12-31 14:45
      timeUnknown: false,
    };

    const chart: AstroChart = generateAstroChart(input);
    assert.ok(chart.birthPanchang !== null);
    assert.strictEqual(chart.birthPanchang.localDate, '2020-12-31');
    assert.strictEqual(chart.birthPanchang.localTime, '23:45');
    assert.strictEqual(chart.birthPanchang.timezone, 'Asia/Tokyo');
    assert.strictEqual(chart.birthPanchang.vara.name, 'Guruvara'); // 2020-12-31 was Thursday

    // UTC birth time in ISO string
    assert.strictEqual(chart.utcBirthTime, '2020-12-31T14:45:00.000Z');
    assert.ok(isValidAstroChart(chart));
  });

  // Fixture 3: Ordinary DST-season conversion.
  it('correctly calculates an unambiguous birth during New York daylight time', () => {
    const input = {
      date: '2024-07-15',
      time: '14:30',
      lat: 40.7128,
      lng: -74.0060,
      timezone: 'America/New_York', // UTC-4 in summer
      timeUnknown: false,
    };

    const chart: AstroChart = generateAstroChart(input);
    assert.strictEqual(chart.utcBirthTime, '2024-07-15T18:30:00.000Z');
    assert.strictEqual(chart.birthPanchang?.vara.name, 'Somavara'); // Monday
    assert.strictEqual(chart.birthPanchang?.vara.index, 1);
    assert.ok(isValidAstroChart(chart));
  });

  it('rejects a nonexistent local time in the New York spring-forward gap', () => {
    assert.throws(
      () => birthLocalToUTC('2024-03-10', '02:30', 'America/New_York'),
      /does not exist.*daylight-saving transition/,
    );
  });

  it('rejects an ambiguous local time in the New York fall-back fold', () => {
    assert.throws(
      () => birthLocalToUTC('2024-11-03', '01:30', 'America/New_York'),
      /ambiguous.*daylight-saving transition/,
    );
  });

  // Fixture 4: Unknown Birth Time (timeUnknown = true)
  it('properly enforces timeUnknown contract and nullifies birthPanchang', () => {
    const input = {
      date: '1985-05-20',
      time: '12:00',
      lat: 28.6139,
      lng: 77.2090,
      timezone: 'Asia/Kolkata',
      timeUnknown: true,
    };

    const chart: AstroChart = generateAstroChart(input);

    assert.strictEqual(chart.schemaVersion, 2);
    assert.strictEqual(chart.timeUnknown, true);
    assert.strictEqual(chart.birthPanchang, null);

    // Planets are calculated for midday estimate
    assert.ok(chart.planets['Surya']);
    assert.ok(chart.planets['Chandra']);

    // Pass strict validator
    assert.ok(isValidAstroChart(chart));

    // Time-dependent Panchanga is withheld rather than estimated.
    assert.strictEqual(chart.birthPanchang, null);
  });

  // Negative Contract Validator Tests
  describe('AstroChart v2 Strict Negative Validation', () => {
    const validPanchangSnapshot = {
      instantUtc: '1991-02-14T01:00:00.000Z',
      localDate: '1991-02-14',
      localTime: '06:30',
      timezone: 'Asia/Kolkata',
      vara: { index: 4, name: 'Guruvara' },
      tithi: { index: 30, name: 'Amavasya', paksha: 'Krishna' as const, endsAtUtc: '1991-02-14T10:00:00.000Z' },
      nakshatra: { index: 22, name: 'Dhanishta', pada: 2, endsAtUtc: '1991-02-14T12:00:00.000Z' },
      yoga: { index: 14, name: 'Vajra', endsAtUtc: '1991-02-14T14:00:00.000Z' },
      karana: { index: 60, name: 'Nagava', endsAtUtc: '1991-02-14T08:00:00.000Z' },
      calculation: { engineVersion: '0.2.4', ayanamsa: 'lahiri' as const, precision: 'high' as const, diagnostics: [] },
    };

    const validKnownChart: AstroChart = {
      schemaVersion: 2,
      birthPanchang: validPanchangSnapshot,
      utcBirthTime: '1991-02-14T01:00:00.000Z',
      julianDay: 2448301.54,
      ayanamsa: 23.74,
      timeUnknown: false,
      lagna: { tropicalDeg: 310.2, siderealDeg: 286.46, rashiIndex: 9, rashiName: 'Makara', degreeInRashi: 16.46, house: 1, isRetrograde: false },
      planets: {
        Surya: { tropicalDeg: 325.5, siderealDeg: 301.76, rashiIndex: 10, rashiName: 'Kumbha', degreeInRashi: 1.76, house: 2, isRetrograde: false },
        Chandra: { tropicalDeg: 320.1, siderealDeg: 296.36, rashiIndex: 9, rashiName: 'Makara', degreeInRashi: 26.36, house: 1, isRetrograde: false },
      },
      nakshatra: { name: 'Dhanishta', index: 22, pada: 2, lord: 'Mangal', traversedFrac: 0.4, remainingFrac: 0.6, devata: 'Vasus', gana: 'Rakshasa', animalSymbol: 'Lion' },
      dasha: { timeline: [], current: null, currentAntardasha: null },
    };

    it('rejects chart with schemaVersion !== 2', () => {
      const invalid = { ...validKnownChart, schemaVersion: 1 };
      assert.strictEqual(isValidAstroChart(invalid), false);
    });

    it('rejects chart with non-boolean timeUnknown', () => {
      const invalid = { ...validKnownChart, timeUnknown: 'false' as any };
      assert.strictEqual(isValidAstroChart(invalid), false);
    });

    it('rejects timeUnknown=true when birthPanchang is defined', () => {
      const invalid = { ...validKnownChart, timeUnknown: true, birthPanchang: validPanchangSnapshot };
      assert.strictEqual(isValidAstroChart(invalid), false);
    });

    it('rejects timeUnknown=false when birthPanchang is null', () => {
      const invalid = { ...validKnownChart, timeUnknown: false, birthPanchang: null };
      assert.strictEqual(isValidAstroChart(invalid), false);
    });

    it('rejects birthPanchang with expired boundary (endsAtUtc <= instantUtc)', () => {
      const expiredSnapshot = {
        ...validPanchangSnapshot,
        tithi: {
          ...validPanchangSnapshot.tithi,
          endsAtUtc: '1991-02-14T00:30:00.000Z', // 30 mins BEFORE instantUtc (01:00:00)
        },
      };
      assert.strictEqual(isValidBirthPanchangSnapshot(expiredSnapshot), false);
    });

    it('rejects birthPanchang with excessive boundary (> 48h)', () => {
      const excessiveSnapshot = {
        ...validPanchangSnapshot,
        tithi: {
          ...validPanchangSnapshot.tithi,
          endsAtUtc: '1991-02-18T01:00:00.000Z', // 4 days later
        },
      };
      assert.strictEqual(isValidBirthPanchangSnapshot(excessiveSnapshot), false);
    });

    it('rejects birthPanchang with invalid localDate format', () => {
      const malformed = { ...validPanchangSnapshot, localDate: '14-02-1991' };
      assert.strictEqual(isValidBirthPanchangSnapshot(malformed), false);
    });

    it('rejects birthPanchang with invalid localTime format', () => {
      const malformed = { ...validPanchangSnapshot, localTime: '6:30 AM' };
      assert.strictEqual(isValidBirthPanchangSnapshot(malformed), false);
    });

    it('rejects impossible civil dates, out-of-range times, and unknown timezones', () => {
      assert.strictEqual(isValidBirthPanchangSnapshot({ ...validPanchangSnapshot, localDate: '1991-02-31' }), false);
      assert.strictEqual(isValidBirthPanchangSnapshot({ ...validPanchangSnapshot, localTime: '99:99' }), false);
      assert.strictEqual(isValidBirthPanchangSnapshot({ ...validPanchangSnapshot, timezone: 'Not/A_Zone' }), false);
    });

    it('rejects a local clock that disagrees with instantUtc and timezone', () => {
      assert.strictEqual(isValidBirthPanchangSnapshot({ ...validPanchangSnapshot, localTime: '07:30' }), false);
    });

    it('rejects canonical limb names that disagree with their indices', () => {
      assert.strictEqual(isValidBirthPanchangSnapshot({
        ...validPanchangSnapshot,
        nakshatra: { ...validPanchangSnapshot.nakshatra, name: 'Ashwini' },
      }), false);
      assert.strictEqual(isValidBirthPanchangSnapshot({
        ...validPanchangSnapshot,
        yoga: { ...validPanchangSnapshot.yoga, name: 'Siddhi' },
      }), false);
      assert.strictEqual(isValidBirthPanchangSnapshot({
        ...validPanchangSnapshot,
        karana: { ...validPanchangSnapshot.karana, name: 'Bava' },
      }), false);
    });

    it('rejects birthPanchang with mismatched tithi index and paksha', () => {
      // Index 20 is Krishna paksha, Shukla is an invalid mismatch
      const mismatched = {
        ...validPanchangSnapshot,
        tithi: { ...validPanchangSnapshot.tithi, index: 20, paksha: 'Shukla' as any },
      };
      assert.strictEqual(isValidBirthPanchangSnapshot(mismatched), false);
    });
  });
});
