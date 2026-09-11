import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ObservanceSeries } from '../lib/observance-series-contract.generated';
import {
  buildSacredDaysDeck,
  buildSacredDaysSections,
  HOME_SACRED_DAYS_LIMIT,
  HOME_SACRED_DAYS_WINDOW,
  type SacredDaysObservance,
} from '../lib/sacred-days-deck';

const spiritualDate = '2026-11-08';

function observance(name: string, daysLeft: number, slug = name.toLowerCase().replaceAll(' ', '-')): SacredDaysObservance {
  return {
    name,
    emoji: null,
    daysLeft,
    routeKind: 'vrat',
    routeSlug: slug,
    href: `/vrat/${slug}`,
    label: daysLeft === 0 ? 'Today' : `In ${daysLeft} days`,
  };
}

function activeSeries(overrides: Partial<ObservanceSeries> = {}): ObservanceSeries {
  return {
    seriesKey: 'diwali-five-days:hindu:2026',
    definitionKey: 'diwali-five-days',
    mode: 'festival_cluster',
    name: 'Diwali',
    tradition: 'hindu',
    profile: { calendar: 'legacy-ujjain', tradition: 'hindu' },
    location: { label: 'Local', lat: 23.17, lon: 75.78, tz: 'Asia/Kolkata' },
    status: 'active',
    startDate: spiritualDate,
    endDate: spiritualDate,
    currentCivilDate: spiritualDate,
    activeChildOccurrenceIds: ['occ-diwali'],
    currentDay: 1,
    totalDays: 1,
    children: [{
      occurrenceId: 'occ-diwali',
      slug: 'diwali',
      civilDate: spiritualDate,
      sequence: 1,
      title: 'Diwali',
      routeKind: 'vrat',
      routeSlug: 'diwali',
      status: 'resolved',
      diagnostics: [],
      sourceRefs: [],
    }],
    diagnostics: [],
    sourceRefs: [],
    versions: {},
    ...overrides,
  };
}

test('buildSacredDaysDeck creates one deterministic, bounded Home deck', async (t) => {
  await t.test('deduplicates a standalone observance represented by a series child', () => {
    const items = buildSacredDaysDeck({
      observances: [observance('Diwali', 0, 'diwali'), observance('Govardhan Puja', 1)],
      series: [activeSeries()],
      spiritualDate,
    });

    assert.deepEqual(items.map((item) => item.type), ['series']);
    assert.equal(items.filter((item) => item.key.includes('diwali')).length, 1);
    assert.deepEqual(items.map((item) => item.daysLeft), [0]);
  });

  await t.test('orders same-day series before standalone items with deterministic ties', () => {
    const items = buildSacredDaysDeck({
      observances: [observance('Zeta Vrat', 0), observance('Alpha Vrat', 0)],
      series: [activeSeries()],
      spiritualDate,
    });

    assert.equal(items[0]?.type, 'series');
    assert.deepEqual(
      items.slice(1).map((item) => item.type === 'observance' ? item.entry.name : ''),
      ['Alpha Vrat', 'Zeta Vrat'],
    );
  });

  await t.test('defaults to today-only cards and can still be widened explicitly', () => {
    const entries = Array.from({ length: 9 }, (_, index) => observance(`Vrat ${index}`, index % 3));
    const items = buildSacredDaysDeck({ observances: entries, series: [], spiritualDate });
    assert.equal(items.length, 3);
    assert.deepEqual(items.map((item) => item.daysLeft), [0, 0, 0]);

    const widenedItems = buildSacredDaysDeck({ observances: entries, series: [], spiritualDate, windowDays: HOME_SACRED_DAYS_WINDOW });
    assert.equal(widenedItems.length, HOME_SACRED_DAYS_LIMIT);
    assert.deepEqual(widenedItems.map((item) => item.daysLeft), [0, 0, 0, 1, 1, 1, 2, 2]);
  });

  await t.test('hides under-review series and excludes out-of-window data', () => {
    const items = buildSacredDaysDeck({
      observances: [observance('Later Vrat', HOME_SACRED_DAYS_WINDOW + 1), observance('Today Vrat', 0)],
      series: [activeSeries({ status: 'under_review', diagnostics: ['series_child_under_review'] })],
      spiritualDate,
      windowDays: HOME_SACRED_DAYS_WINDOW,
    });

    assert.equal(items.length, 1);
    assert.equal(items[0]?.type, 'observance');
    assert.equal(items[0]?.daysLeft, 0);
  });

  await t.test('spiritual-date rollover removes yesterday data without inferring a new date', () => {
    const entries = [observance('Diwali', 0, 'diwali')];
    assert.equal(buildSacredDaysDeck({ observances: entries, series: [], spiritualDate }).length, 1);
    assert.equal(buildSacredDaysDeck({
      observances: [{ ...entries[0], daysLeft: -1 }],
      series: [],
      spiritualDate: '2026-11-09',
    }).length, 0);
  });
});

test('Sacred Days Home integration does not add a calendar data request', () => {
  const root = join(__dirname, '..');
  const homeSource = readFileSync(join(root, 'app/(tabs)/index.tsx'), 'utf8');
  const carouselSource = readFileSync(join(root, 'components/home/SacredDaysCarousel.tsx'), 'utf8');

  assert.equal((homeSource.match(/<SacredDaysCarousel\b/g) ?? []).length, 1);
  assert.equal((homeSource.match(/<SacredDaysCard\b/g) ?? []).length, 0);
  assert.doesNotMatch(carouselSource, /api\/native\/home-summary|api\/calendar\/upcoming/);
  assert.match(carouselSource, /api\/calendar\/export/);
  assert.match(carouselSource, /calendarStatus === 'pending'/);
  assert.match(carouselSource, /calendarStatus === 'unavailable'/);
  assert.match(carouselSource, /पवित्र दिन/);
  assert.match(carouselSource, /ਪਵਿੱਤਰ ਦਿਨ/);
});


test('sections split today from days 1 through 15 inclusively', () => {
  const sections = buildSacredDaysSections({ spiritualDate, series: [], observances: [
    observance('Past', -1), observance('Today', 0), observance('Tomorrow', 1),
    observance('Last included day', 15), observance('Too far', 16),
  ] });
  assert.deepEqual(sections.today.map(item => item.daysLeft), [0]);
  assert.deepEqual(sections.upcoming.map(item => item.daysLeft), [1, 15]);
});

test('today limit cannot crowd upcoming events out of their section', () => {
  const sections = buildSacredDaysSections({ spiritualDate, series: [], observances: [
    ...Array.from({ length: 10 }, (_, i) => observance(`Today ${i}`, 0)), observance('Tomorrow', 1),
  ] });
  assert.equal(sections.today.length, HOME_SACRED_DAYS_LIMIT);
  assert.equal(sections.upcoming.length, 1);
});

test('upcoming series preserve review checks and deduplicate their standalone entry', () => {
  const approved = activeSeries({ status: 'upcoming', startDate: '2026-11-09',
    children: [{ ...activeSeries().children[0], civilDate: '2026-11-09' }] });
  const sections = buildSacredDaysSections({ spiritualDate, series: [approved], observances: [observance('Diwali', 1, 'diwali')] });
  assert.equal(sections.today.length, 0);
  assert.equal(sections.upcoming.length, 1);
  assert.equal(sections.upcoming[0].type, 'series');
  const withheld = buildSacredDaysSections({ spiritualDate, series: [{ ...approved, status: 'under_review' }], observances: [] });
  assert.deepEqual(withheld, { today: [], upcoming: [] });
});

test('no eligible entries leaves both sections empty for the explanatory state', () => {
  assert.deepEqual(buildSacredDaysSections({ spiritualDate, series: [], observances: [observance('Past', -1), observance('Later', 16)] }), { today: [], upcoming: [] });
});
