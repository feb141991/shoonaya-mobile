import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getNativeSeriesCardChildren,
  getNativeSeriesCardCopy,
  getNativeSeriesCardDayDistance,
  getSafeNativeSeriesName,
  getSafeNativeEditorialCopy,
} from '../lib/observance-series-card-helpers';
import type {
  ObservanceSeries,
  ObservanceSeriesChild,
} from '../lib/observance-series-contract.generated';

test('Native Observance Series Card & Editorial Guard (Prompt 4)', async (t) => {

  const reviewRef = 'council:navratri-editorial-v1';

  const baseChild: ObservanceSeriesChild = {
    occurrenceId: 'occ-navratri-1',
    slug: 'navratri-day-1-shailaputri',
    civilDate: '2026-10-12',
    sequence: 1,
    title: 'Navratri Day 1 — Shailaputri',
    routeKind: 'vrat',
    routeSlug: 'navratri-day-1-shailaputri',
    status: 'resolved',
    diagnostics: [],
    sourceRefs: [],
    editorial: {
      canonicalTitle: {
        value: {
          en: 'Navratri Day 1 — Shailaputri',
          hi: 'नवरात्रि दिन १ — शैलपुत्री',
          pa: 'ਨਰਾਤੇ ਦਿਨ ੧ — ਸ਼ੈਲਪੁਤਰੀ',
        },
        status: 'council_reviewed_editorial',
        sourceRefs: [],
        applicability: { universal: true },
        reviewRef,
      },
      deityOrTheme: {
        value: {
          en: 'Maa Shailaputri',
          hi: 'माँ शैलपुत्री',
          pa: 'ਮਾਂ ਸ਼ੈਲਪੁਤਰੀ',
        },
        status: 'council_reviewed_editorial',
        sourceRefs: [],
        applicability: { universal: true },
        reviewRef,
      },
      rituals: {
        value: {
          en: ['Ghatasthapana', 'Shailaputri Puja'],
          hi: ['घटस्थापना', 'शैलपुत्री पूजा'],
          pa: ['ਘਟਸਥਾਪਨਾ', 'ਸ਼ੈਲਪੁਤਰੀ ਪੂਜਾ'],
        },
        status: 'council_reviewed_editorial',
        sourceRefs: [],
        applicability: { universal: true },
        reviewRef,
      },
      significance: {
        value: {
          en: 'First form of Navadurga, daughter of the Himalayas.',
          hi: 'नवदुर्गा का प्रथम स्वरूप, हिमालय की पुत्री।',
          pa: 'ਨਵਦੁਰਗਾ ਦਾ ਪਹਿਲਾ ਸਰੂਪ।',
        },
        status: 'council_reviewed_editorial',
        sourceRefs: [],
        applicability: { universal: true },
        reviewRef,
      },
    },
  };

  await t.test('1. resolves multilingual copy with Hindi and Punjabi support', () => {
    const en = getSafeNativeEditorialCopy(baseChild, 'en');
    assert.equal(en.title, 'Navratri Day 1 — Shailaputri');
    assert.equal(en.subtitle, 'Maa Shailaputri');
    assert.deepEqual(en.rituals, ['Ghatasthapana', 'Shailaputri Puja']);

    const hi = getSafeNativeEditorialCopy(baseChild, 'hi');
    assert.equal(hi.title, 'नवरात्रि दिन १ — शैलपुत्री');
    assert.equal(hi.subtitle, 'माँ शैलपुत्री');
    assert.deepEqual(hi.rituals, ['घटस्थापना', 'शैलपुत्री पूजा']);

    const pa = getSafeNativeEditorialCopy(baseChild, 'pa');
    assert.equal(pa.title, 'ਨਰਾਤੇ ਦਿਨ ੧ — ਸ਼ੈਲਪੁਤਰੀ');
    assert.equal(pa.subtitle, 'ਮਾਂ ਸ਼ੈਲਪੁਤਰੀ');
  });

  await t.test('2. editorial guard: withheld and pending_source fields NEVER render', () => {
    const guardedChild: ObservanceSeriesChild = {
      ...baseChild,
      title: 'Canonical Occurrence Title',
      editorial: {
        canonicalTitle: {
          value: { en: 'Unapproved Title' },
          status: 'withheld',
          sourceRefs: [],
          applicability: { universal: true },
        },
        deityOrTheme: {
          value: { en: 'Pending Deity' },
          status: 'pending_source',
          sourceRefs: [],
          applicability: { universal: true },
        },
        significance: {
          value: { en: 'Unverified significance text' },
          status: 'withheld',
          sourceRefs: [],
          applicability: { universal: true },
        },
        rituals: {
          value: { en: ['Unverified Ritual'] },
          status: 'pending_source',
          sourceRefs: [],
          applicability: { universal: true },
        },
      },
    };

    const result = getSafeNativeEditorialCopy(guardedChild, 'en');
    assert.equal(result.title, 'Canonical Occurrence Title');
    assert.equal(result.subtitle, '');
    assert.equal(result.description, null);
    assert.deepEqual(result.rituals, []);
  });

  await t.test('3. regional applicability: filters rituals outside user region', () => {
    const bengalChild: ObservanceSeriesChild = {
      ...baseChild,
      editorial: {
        ...baseChild.editorial,
        rituals: {
          value: { en: ['Bilva Nimantran', 'Sasthi Bodhon'] },
          status: 'council_reviewed_editorial',
          sourceRefs: [],
          reviewRef: 'council:bengal-navratri-rituals-v1',
          applicability: {
            regions: ['Bengal', 'East India'],
            universal: false,
          },
        },
      },
    };

    const inBengal = getSafeNativeEditorialCopy(bengalChild, 'en', { region: 'Bengal' });
    assert.deepEqual(inBengal.rituals, ['Bilva Nimantran', 'Sasthi Bodhon']);

    const inGujarat = getSafeNativeEditorialCopy(bengalChild, 'en', { region: 'Gujarat' });
    assert.deepEqual(inGujarat.rituals, []);

    const unknownRegion = getSafeNativeEditorialCopy(bengalChild, 'en');
    assert.deepEqual(unknownRegion.rituals, []);
  });

  await t.test('4. same-date multi-children in Diwali cluster: independently addressable', () => {
    const diwaliSeries: ObservanceSeries = {
      seriesKey: 'diwali-five-days:hindu:2026',
      definitionKey: 'diwali-five-days',
      mode: 'festival_cluster',
      name: 'Diwali',
      tradition: 'hindu',
      profile: { calendar: 'legacy-ujjain', tradition: 'hindu' },
      location: { label: 'Local', lat: 23.17, lon: 75.78, tz: 'Asia/Kolkata' },
      status: 'active',
      startDate: '2026-11-07',
      endDate: '2026-11-11',
      currentCivilDate: '2026-11-08',
      activeChildOccurrenceIds: ['occ-naraka-2026', 'occ-diwali-2026'],
      currentDay: 2,
      totalDays: 5,
      children: [
        {
          occurrenceId: 'occ-naraka-2026',
          slug: 'naraka-chaturdashi',
          civilDate: '2026-11-08',
          sequence: 2,
          title: 'Naraka Chaturdashi',
          routeKind: 'vrat',
          routeSlug: 'naraka-chaturdashi',
          status: 'resolved',
          diagnostics: [],
          sourceRefs: [],
        },
        {
          occurrenceId: 'occ-diwali-2026',
          slug: 'diwali',
          civilDate: '2026-11-08',
          sequence: 3,
          title: 'Diwali (Lakshmi Puja)',
          routeKind: 'vrat',
          routeSlug: 'diwali',
          status: 'resolved',
          diagnostics: [],
          sourceRefs: [],
        },
      ],
      diagnostics: [],
      sourceRefs: [],
      versions: {},
    };

    const activeChildren = getNativeSeriesCardChildren(diwaliSeries);

    assert.equal(activeChildren.length, 2);
    assert.equal(activeChildren[0].slug, 'naraka-chaturdashi');
    assert.equal(activeChildren[1].slug, 'diwali');
    assert.notEqual(activeChildren[0].routeSlug, activeChildren[1].routeSlug);
  });

  await t.test('5. active series never infer a child from date or currentDay', () => {
    const invalidSeries: ObservanceSeries = {
      seriesKey: 'invalid-series',
      definitionKey: 'invalid-series',
      mode: 'daily_journey',
      name: 'Invalid Series',
      tradition: 'hindu',
      profile: { calendar: 'legacy-ujjain', tradition: 'hindu' },
      location: { label: 'Local', lat: 23.17, lon: 75.78, tz: 'Asia/Kolkata' },
      status: 'active',
      startDate: baseChild.civilDate,
      endDate: baseChild.civilDate,
      currentCivilDate: baseChild.civilDate,
      activeChildOccurrenceIds: [],
      currentDay: baseChild.sequence,
      totalDays: 1,
      children: [baseChild],
      diagnostics: [],
      sourceRefs: [],
      versions: {},
    };
    assert.deepEqual(getNativeSeriesCardChildren(invalidSeries), []);
  });

  await t.test('6. source-backed and council-reviewed fields require evidence', () => {
    const unsafeChild: ObservanceSeriesChild = {
      ...baseChild,
      title: 'Canonical occurrence title',
      editorial: {
        canonicalTitle: {
          value: { en: 'Unsourced override' },
          status: 'source_backed',
          sourceRefs: [],
          applicability: { universal: true },
        },
        deityOrTheme: {
          value: { en: 'Unreviewed council copy' },
          status: 'council_reviewed_editorial',
          sourceRefs: [],
          applicability: { universal: true },
        },
      },
    };
    const result = getSafeNativeEditorialCopy(unsafeChild);
    assert.equal(result.title, 'Canonical occurrence title');
    assert.equal(result.subtitle, '');
  });

  await t.test('7. Home spotlight distance follows the exact display child and review start date', () => {
    const upcomingSeries: ObservanceSeries = {
      seriesKey: 'upcoming-series',
      definitionKey: 'upcoming-series',
      mode: 'festival_cluster',
      name: 'Upcoming',
      tradition: 'hindu',
      profile: { calendar: 'legacy-ujjain', tradition: 'hindu' },
      location: { label: 'Local', lat: 23.17, lon: 75.78, tz: 'Asia/Kolkata' },
      status: 'upcoming',
      startDate: '2026-11-12',
      endDate: '2026-11-12',
      currentCivilDate: null,
      activeChildOccurrenceIds: [],
      currentDay: null,
      totalDays: 1,
      children: [{ ...baseChild, occurrenceId: 'future-child', civilDate: '2026-11-12' }],
      diagnostics: [],
      sourceRefs: [],
      versions: {},
    };
    assert.equal(getNativeSeriesCardDayDistance(upcomingSeries, '2026-11-08'), 4);
    assert.equal(
      getNativeSeriesCardDayDistance({ ...upcomingSeries, status: 'under_review' }, '2026-11-08'),
      4,
    );
  });

  await t.test('7. localizes status and action chrome with the selected app language', () => {
    const hi = getNativeSeriesCardCopy('hi');
    assert.equal(hi.today, 'आज');
    assert.equal(hi.dayOf(4, 9), 'दिन 4 / 9');
    assert.equal(hi.learnMore, 'और जानें');

    const pa = getNativeSeriesCardCopy('pa');
    assert.equal(pa.tomorrow, 'ਕੱਲ੍ਹ');
    assert.equal(pa.reviewPending, 'ਸਮੀਖਿਆ ਬਾਕੀ');
  });

  await t.test('8. resolves the backend-owned localized series name and fails back safely', () => {
    const localized = {
      seriesKey: 'localized',
      definitionKey: 'localized',
      mode: 'festival_cluster',
      name: 'Diwali',
      editorial: {
        name: {
          value: { en: 'Diwali', hi: 'दीपावली', pa: 'ਦੀਵਾਲੀ' },
          status: 'council_reviewed_editorial',
          sourceRefs: [],
          reviewRef: 'council:series-name-v1',
          applicability: { universal: true },
        },
      },
      tradition: 'hindu',
      profile: { calendar: 'legacy-ujjain', tradition: 'hindu' },
      location: { label: 'Local', lat: 23.17, lon: 75.78, tz: 'Asia/Kolkata' },
      status: 'upcoming',
      startDate: '2026-11-08',
      endDate: '2026-11-08',
      currentCivilDate: null,
      activeChildOccurrenceIds: [],
      currentDay: null,
      totalDays: 1,
      children: [],
      diagnostics: [],
      sourceRefs: [],
      versions: {},
    } satisfies ObservanceSeries;
    assert.equal(getSafeNativeSeriesName(localized, 'pa'), 'ਦੀਵਾਲੀ');
    assert.equal(getSafeNativeSeriesName({ ...localized, editorial: undefined }, 'pa'), 'Diwali');
  });

});
