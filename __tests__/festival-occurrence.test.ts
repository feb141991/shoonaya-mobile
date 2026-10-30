import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchFestivalOccurrence, type FestivalOccurrenceFetcher } from '../lib/festivalOccurrence';
import type { ClientObservanceResult } from '../lib/calendar-contract';

describe('fetchFestivalOccurrence (Narrow Calendar Detail Read Contract)', () => {
  it('queries /api/calendar/occurrence with narrow parameters and returns payload', async () => {
    const calls: Array<{ url: string; options?: any }> = [];
    const mockOccurrence = {
      id: 'occ-1',
      slug: 'rama-navami',
      civilDate: '2026-11-14',
      date: '2026-11-14',
      isPrimary: true,
      status: 'resolved',
    } as unknown as ClientObservanceResult;

    const fetcher: FestivalOccurrenceFetcher = async (url: string, options?: any) => {
      calls.push({ url, options });
      return new Response(
        JSON.stringify({
          occurrence: mockOccurrence,
          candidates: [mockOccurrence],
          selection: 'selected',
        }),
        { status: 200 },
      );
    };

    const res = await fetchFestivalOccurrence(
      {
        slug: 'rama-navami',
        occurrenceId: 'occ-1',
        date: '2026-11-14',
        tz: 'Asia/Kolkata',
      },
      { fetcher },
    );

    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /^\/api\/calendar\/occurrence\?/);
    assert.match(calls[0].url, /slug=rama-navami/);
    assert.match(calls[0].url, /occurrence_id=occ-1/);
    assert.match(calls[0].url, /date=2026-11-14/);
    assert.match(calls[0].url, /tz=Asia%2FKolkata/);

    assert.equal(res.selection, 'selected');
    assert.deepEqual(res.occurrence, mockOccurrence);
    assert.equal(res.candidates.length, 1);
  });

  it('preserves selection=multiple and returns all candidate variants without silently picking one', async () => {
    const calls: Array<{ url: string }> = [];
    const smartha = { id: 's-1', slug: 'ekadashi', variantKey: 'smartha', isPrimary: true, civilDate: '2026-11-14' } as any;
    const vaishnava = { id: 'v-1', slug: 'ekadashi', variantKey: 'vaishnava', isPrimary: false, civilDate: '2026-11-15' } as any;

    const fetcher: FestivalOccurrenceFetcher = async (url: string) => {
      calls.push({ url });
      return new Response(
        JSON.stringify({
          occurrence: smartha,
          candidates: [smartha, vaishnava],
          selection: 'multiple',
        }),
        { status: 200 },
      );
    };

    const res = await fetchFestivalOccurrence({ slug: 'ekadashi', tz: 'Asia/Kolkata' }, { fetcher });
    assert.equal(res.selection, 'multiple');
    assert.deepEqual(res.candidates, [smartha, vaishnava]);
    assert.deepEqual(res.occurrence, smartha);
  });

  it('falls back to /api/calendar/upcoming ONLY on 404 (OTA backward-compatibility guard)', async () => {
    const calls: Array<{ url: string }> = [];
    const upcomingOccurrence = {
      id: 'upcoming-1',
      slug: 'rama-navami',
      route_slug: 'rama-navami',
      civilDate: '2026-11-14',
      date: '2026-11-14',
      isPrimary: true,
    } as any;

    const fetcher: FestivalOccurrenceFetcher = async (url: string) => {
      calls.push({ url });
      if (url.startsWith('/api/calendar/occurrence')) {
        return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 });
      }
      if (url.startsWith('/api/calendar/upcoming')) {
        return new Response(JSON.stringify({ observances: [upcomingOccurrence] }), { status: 200 });
      }
      throw new Error(`Unexpected url: ${url}`);
    };

    const res = await fetchFestivalOccurrence({ slug: 'rama-navami', tz: 'Asia/Kolkata' }, { fetcher });

    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /^\/api\/calendar\/occurrence\?/);
    assert.match(calls[1].url, /^\/api\/calendar\/upcoming\?days=60/);

    assert.equal(res.selection, 'selected');
    assert.deepEqual(res.occurrence, upcomingOccurrence);
  });

  it('does NOT fall back to broad feed on 500, 503, or server faults (fail-closed)', async () => {
    const calls: Array<{ url: string }> = [];
    const fetcher: FestivalOccurrenceFetcher = async (url: string) => {
      calls.push({ url });
      return new Response(JSON.stringify({ error: 'Calendar unavailable' }), { status: 503 });
    };

    const res = await fetchFestivalOccurrence({ slug: 'rama-navami', tz: 'Asia/Kolkata' }, { fetcher });

    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /^\/api\/calendar\/occurrence\?/);
    assert.equal(res.selection, 'unavailable');
    assert.equal(res.occurrence, null);
    assert.deepEqual(res.candidates, []);
  });
});
