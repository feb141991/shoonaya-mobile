import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  OBSERVANCE_SERIES_CONTRACT_VERSION,
  type ObservanceSeries,
} from '../lib/observance-series-contract.generated';
import type { UpcomingCalendarResponse } from '../lib/calendar-contract';

describe('generated observance-series contract', () => {
  it('remains an additive optional field for older upcoming API responses', () => {
    const legacy: UpcomingCalendarResponse = { from: '2026-01-01', to: '2026-01-14', observances: [] };
    assert.equal(legacy.series, undefined);
  });

  it('accepts the canonical contract version and a missing fail-closed child', () => {
    const series: ObservanceSeries = {
      seriesKey: 'series-key',
      definitionKey: 'diwali-five-days',
      mode: 'festival_cluster',
      name: 'Diwali',
      tradition: 'hindu',
      profile: { calendar: 'legacy-ujjain', tradition: 'standard' },
      location: { label: 'Ujjain', lat: 23.1765, lon: 75.7885, tz: 'Asia/Kolkata' },
      status: 'under_review',
      startDate: null,
      endDate: null,
      currentCivilDate: null,
      activeChildOccurrenceIds: [],
      currentDay: null,
      totalDays: 5,
      children: [{
        occurrenceId: null,
        slug: 'naraka-chaturdashi',
        civilDate: null,
        sequence: 2,
        title: 'Naraka Chaturdashi',
        routeKind: null,
        routeSlug: null,
        status: 'missing',
        diagnostics: ['required_series_child_missing'],
        sourceRefs: [],
      }],
      diagnostics: ['missing_required_series_child:naraka-chaturdashi'],
      sourceRefs: [],
      versions: { contract: OBSERVANCE_SERIES_CONTRACT_VERSION },
    };
    assert.equal(series.status, 'under_review');
  });
});
