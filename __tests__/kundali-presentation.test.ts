import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { AstroChart, BirthProfileDetail } from '@/lib/kundali-contract';
import {
  buildKundaliInsightModel,
  buildKundaliSummaryModel,
  formatKundaliDate,
} from '@/lib/kundali-presentation';
import { resolveKundaliDetailTab } from '@/lib/kundali-detail-tabs';

function makeProfile(overrides: Partial<AstroChart> = {}): BirthProfileDetail {
  const chart: AstroChart = {
    schemaVersion: 2,
    birthPanchang: {
      instantUtc: '1991-02-14T01:00:00.000Z', localDate: '1991-02-14', localTime: '06:30', timezone: 'Asia/Kolkata',
      vara: { index: 4, name: 'Guruvara' },
      tithi: { index: 30, name: 'Amavasya', paksha: 'Krishna', endsAtUtc: null },
      nakshatra: { index: 22, name: 'Dhanishtha', pada: 1, endsAtUtc: null },
      yoga: { index: 17, name: 'Variyana', endsAtUtc: null }, karana: { index: 9, name: 'Bava', endsAtUtc: null },
      calculation: { engineVersion: '2.0.0', ayanamsa: 'lahiri', precision: 'high', diagnostics: [] },
    },
    utcBirthTime: '1991-02-14T01:00:00.000Z', julianDay: 2448301.54, ayanamsa: 23.74,
    lagna: { tropicalDeg: 310, siderealDeg: 286, rashiIndex: 9, rashiName: 'Makara', degreeInRashi: 16, house: 1, isRetrograde: false },
    planets: {
      Surya: { tropicalDeg: 325, siderealDeg: 301, rashiIndex: 10, rashiName: 'Kumbha', degreeInRashi: 1, house: 2, isRetrograde: false },
      Chandra: { tropicalDeg: 320, siderealDeg: 296, rashiIndex: 9, rashiName: 'Makara', degreeInRashi: 26, house: 1, isRetrograde: false },
      Guru: { tropicalDeg: 130, siderealDeg: 106, rashiIndex: 3, rashiName: 'Karka', degreeInRashi: 16, house: 7, isRetrograde: false, dignity: 'exalted' },
      Shani: { tropicalDeg: 301, siderealDeg: 277, rashiIndex: 9, rashiName: 'Makara', degreeInRashi: 7, house: 1, isRetrograde: false, dignity: 'own' },
      Mangala: { tropicalDeg: 78, siderealDeg: 54, rashiIndex: 1, rashiName: 'Vrishabha', degreeInRashi: 24, house: 5, isRetrograde: false, dignity: 'neutral' },
    },
    nakshatra: { name: 'Dhanishtha', index: 22, pada: 1, lord: 'Mangala', traversedFrac: 0.22, remainingFrac: 0.78, devata: 'Vasus', gana: 'Rakshasa', animalSymbol: 'Lion' },
    dasha: { timeline: [], current: { planet: 'Guru', startDate: '2011-05-10', endDate: '2027-05-10', years: 16, isCurrent: true }, currentAntardasha: { planet: 'Rahu', startDate: '2024-01-15', endDate: '2026-06-18' } },
    quality: { grade: 'high', notes: [] }, timeUnknown: false, ...overrides,
  };

  return {
    id: 'profile-1', owner_id: 'user-1', label: 'Arjun', full_name: 'Arjun Sharma', relation: 'self',
    date_of_birth: '1991-02-14', time_of_birth: '06:30', birth_city: 'Mumbai', birth_country: 'India',
    birth_lat: 19.076, birth_lng: 72.8777, birth_timezone: 'Asia/Kolkata', rashi: 'Makara', sun_rashi: 'Kumbha',
    nakshatra: 'Dhanishtha', nakshatra_pada: 1, nakshatra_lord: 'Mangala', lagna: 'Makara', lagna_deg: 16,
    ayanamsa: 23.74, chart_data: chart, current_dasha_planet: 'Guru', current_dasha_end_date: '2027-05-10',
    next_dasha_planet: 'Shani', is_primary: true, is_public: false,
  };
}

describe('Kundali presentation safety', () => {
  it('formats civil dates without timezone drift', () => {
    assert.equal(formatKundaliDate('1991-02-14'), '14 Feb 1991');
  });

  it('uses the Nakshatra name rather than rendering its object', () => {
    const model = buildKundaliSummaryModel(makeProfile());
    assert.equal(model.nakshatra, 'Dhanishtha');
    assert.equal(model.pada, 1);
  });

  it('withholds exact-time summary values when birth time is unknown', () => {
    const model = buildKundaliSummaryModel(makeProfile({ timeUnknown: true, birthPanchang: null }));
    assert.equal(model.lagna, null);
    assert.equal(model.pada, null);
    assert.equal(model.tithi, null);
    assert.equal(model.birthTime, null);
  });

  it('never invents Dasha values for an unknown-time chart', () => {
    const model = buildKundaliInsightModel(makeProfile({ timeUnknown: true, birthPanchang: null }));
    assert.equal(model.currentDasha, null);
    assert.equal(model.currentAntardasha, null);
    assert.deepEqual(model.factors, []);
  });

  it('returns no fallback Dasha when the chart has no active period', () => {
    const profile = makeProfile();
    profile.chart_data.dasha = { timeline: [], current: null, currentAntardasha: null };
    const model = buildKundaliInsightModel(profile);
    assert.equal(model.currentDasha, null);
    assert.equal(model.currentAntardasha, null);
  });

  it('reports only explicit exalted and own-sign dignity facts', () => {
    const model = buildKundaliInsightModel(makeProfile());
    assert.deepEqual(model.factors.map((factor) => factor.id), ['Guru-exalted-7', 'Shani-own-1']);
    assert.equal(model.factors.some((factor) => factor.id.includes('Mangala')), false);
  });

  it('resolves Predictions deep links and rejects unknown tabs', () => {
    assert.equal(resolveKundaliDetailTab('predictions'), 'predictions');
    assert.equal(resolveKundaliDetailTab('unknown'), 'chart');
    assert.equal(resolveKundaliDetailTab(undefined), 'chart');
  });
});
