import assert from 'node:assert/strict';
import test from 'node:test';

import { withDateSensitiveFieldsPending, type CachedHomeRenderModel, type CachedObservanceEntry } from '../lib/homeCache';

function makeEntry(overrides: Partial<CachedObservanceEntry> & { name: string }): CachedObservanceEntry {
  return {
    name: overrides.name,
    emoji: overrides.emoji ?? '🪔',
    daysLeft: overrides.daysLeft ?? 0,
    routeKind: overrides.routeKind ?? 'vrat',
    routeSlug: overrides.routeSlug ?? 'test-slug',
    href: overrides.href ?? '/vrat/test-slug',
    label: overrides.label ?? `${overrides.name} in ${overrides.daysLeft ?? 0} days`,
    monthLabel: overrides.monthLabel ?? null,
    description: overrides.description ?? null,
    date: overrides.date,
  };
}

function makePayload(overrides: {
  observance?: CachedObservanceEntry | null;
  upcomingObservances?: CachedObservanceEntry[];
}): CachedHomeRenderModel {
  return {
    profile: {
      name: 'Seeker',
      firstName: 'Seeker',
      tradition: 'hindu',
      appLanguage: 'en',
      karmaPoints: 0,
      relicImageUrl: null,
      avatarUrl: null,
    },
    hero: { imageUrl: '', alt: '', objectPosition: '50% 50%', label: '' },
    date: { iso: '2026-09-07', timezone: 'Asia/Kolkata', latitude: 23.1765, longitude: 75.7885 },
    sacredText: {
      label: '', icon: '', original: '', transliteration: '', meaning: '', source: '',
      accentColour: '', accentLight: '',
    },
    panchang: {
      href: '/panchang',
      tithiLabel: 'Shukla Ekadashi',
      festivalLabel: 'Kamada Ekadashi',
      vratLabel: 'Kamada Ekadashi',
      viewedToday: true,
      observance: overrides.observance ?? null,
      upcomingObservances: overrides.upcomingObservances ?? [],
      series: [],
      storyCards: [],
      calendarStatus: 'ready',
      calendarProfile: 'legacy-ujjain',
      sampradaya: null,
    },
    nextPractice: {
      id: 'japa', contextLabel: '', title: '', suggestion: '', nudge: '',
      actionLabel: '', actionHref: '', progress: 0.5,
    },
    practices: [
      { id: 'japa', icon: 'circle', label: 'Japa', detail: '', href: '/japa', done: true, progress: 1, color: '#000', streak: 3 },
    ],
    dharmVeer: { id: 'dv-1', name: '', tagline: '', href: '' },
    firstWeek: false,
  };
}

test('promotes a cached upcoming entry matching the new spiritual date to observance', () => {
  const cached = makePayload({
    observance: makeEntry({ name: 'Kamada Ekadashi', date: '2026-09-07', daysLeft: 0 }),
    upcomingObservances: [
      makeEntry({ name: 'Purnima', date: '2026-09-08', daysLeft: 1 }),
    ],
  });

  const result = withDateSensitiveFieldsPending(cached, '2026-09-08');

  assert.equal(result.panchang.calendarStatus, 'ready');
  assert.ok(result.panchang.observance, 'expected an observance to be promoted');
  assert.equal(result.panchang.observance?.name, 'Purnima');
  assert.equal(result.panchang.observance?.date, '2026-09-08');
  assert.equal(result.panchang.observance?.daysLeft, 0, 'daysLeft must be recomputed relative to the new target date, not the stale value');
  assert.equal(result.panchang.observance?.label, 'Today is Purnima');
});

test('recomputes daysLeft/label for remaining upcoming observances and drops past ones', () => {
  const cached = makePayload({
    observance: makeEntry({ name: 'Kamada Ekadashi', date: '2026-09-07', daysLeft: 0 }),
    upcomingObservances: [
      makeEntry({ name: 'Purnima', date: '2026-09-08', daysLeft: 1 }),
      makeEntry({ name: 'Next Ekadashi', date: '2026-09-21', daysLeft: 14 }),
    ],
  });

  // Rolling to 2026-09-08: the Purnima entry itself gets promoted to
  // `observance` (today), so it must not also linger in upcomingObservances.
  const result = withDateSensitiveFieldsPending(cached, '2026-09-08');

  assert.equal(result.panchang.observance?.name, 'Purnima');
  assert.equal(result.panchang.upcomingObservances.length, 1);
  assert.equal(result.panchang.upcomingObservances[0].name, 'Next Ekadashi');
  assert.equal(result.panchang.upcomingObservances[0].daysLeft, 13, 'must be recomputed relative to 2026-09-08, not the stale fetch date');
  assert.equal(result.panchang.upcomingObservances[0].label, 'Next Ekadashi in 13 days');
});

test('falls back to the pending skeleton when no cached entry covers the target date', () => {
  const cached = makePayload({
    observance: makeEntry({ name: 'Kamada Ekadashi', date: '2026-09-07', daysLeft: 0 }),
    upcomingObservances: [
      makeEntry({ name: 'Purnima', date: '2026-09-09', daysLeft: 2 }),
    ],
  });

  // 2026-09-15 is outside the cached window entirely.
  const result = withDateSensitiveFieldsPending(cached, '2026-09-15');

  assert.equal(result.panchang.calendarStatus, 'pending');
  assert.equal(result.panchang.observance, null);
  assert.deepEqual(result.panchang.upcomingObservances, []);
});

test('falls back to the pending skeleton when entries predate the date field (old cache format)', () => {
  const cached = makePayload({
    observance: makeEntry({ name: 'Kamada Ekadashi', daysLeft: 0 }), // no `date`
    upcomingObservances: [
      makeEntry({ name: 'Purnima', daysLeft: 2 }), // no `date`
    ],
  });

  const result = withDateSensitiveFieldsPending(cached, '2026-09-08');

  assert.equal(result.panchang.calendarStatus, 'pending');
  assert.equal(result.panchang.observance, null);
});

test('falls back to the pending skeleton when no targetIsoDate is provided at all', () => {
  const cached = makePayload({
    observance: makeEntry({ name: 'Kamada Ekadashi', date: '2026-09-07', daysLeft: 0 }),
    upcomingObservances: [
      makeEntry({ name: 'Purnima', date: '2026-09-08', daysLeft: 1 }),
    ],
  });

  const result = withDateSensitiveFieldsPending(cached);

  assert.equal(result.panchang.calendarStatus, 'pending');
  assert.equal(result.panchang.observance, null);
});

test('always resets practice completion/progress regardless of promotion outcome', () => {
  const promotedCase = withDateSensitiveFieldsPending(
    makePayload({
      observance: makeEntry({ name: 'Kamada Ekadashi', date: '2026-09-07' }),
      upcomingObservances: [makeEntry({ name: 'Purnima', date: '2026-09-08', daysLeft: 1 })],
    }),
    '2026-09-08'
  );
  const fallbackCase = withDateSensitiveFieldsPending(
    makePayload({ observance: makeEntry({ name: 'Kamada Ekadashi', date: '2026-09-07' }) }),
    '2026-09-20'
  );

  for (const result of [promotedCase, fallbackCase]) {
    assert.equal(result.practices[0].done, false);
    assert.equal(result.practices[0].progress, 0);
    assert.equal(result.nextPractice.progress, 0);
  }
});
