import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSeriesChildContent,
  getSeriesGroupContent,
  resolveLocalizedText,
  resolveLocalizedList,
  isEditorialFieldDisplayable,
  formatSeriesDayLabel,
} from '../lib/observance-series-content';
import {
  OBSERVANCE_SERIES_CONTENT_SNAPSHOT,
} from '../lib/observance-series-content.generated';

test('Native Observance Series Content — Sourced Provenance & Snapshot Integrity', async (t) => {

  await t.test('1. successfully retrieves group content by definitionKey', () => {
    const navratri = getSeriesGroupContent('sharad-navratri');
    assert.ok(navratri, 'Sharad Navratri group should exist');
    assert.equal(navratri.children.length, 10);

    const diwali = getSeriesGroupContent('diwali-five-days');
    assert.ok(diwali, 'Diwali group should exist');
    assert.equal(diwali.children.length, 5);

    const chaitra = getSeriesGroupContent('chaitra-navratri');
    assert.ok(chaitra, 'Chaitra Navratri group should exist');
    assert.equal(chaitra.children.length, 9);
  });

  await t.test('2. successfully retrieves child content by slug with typed field provenance', () => {
    const day1 = getSeriesChildContent('navratri-day-1-shailaputri');
    assert.ok(day1, 'Day 1 should exist');
    assert.equal(day1.sequence, 1);
    assert.equal(day1.canonicalTitle.value.en, 'Navratri Day 1 — Shailaputri');
    assert.equal(day1.deityOrTheme?.value.en, 'Maa Shailaputri');
    assert.equal(day1.canonicalTitle.status, 'source_backed');

    const naraka = getSeriesChildContent('naraka-chaturdashi');
    assert.ok(naraka, 'Naraka Chaturdashi should exist');
    assert.equal(naraka.sequence, 2);
    assert.equal(naraka.canonicalTitle.value.en, 'Naraka Chaturdashi');
    assert.equal(naraka.canonicalTitle.status, 'source_backed');
  });

  await t.test('3. negative retrieval: Child A cannot receive Child B content', () => {
    const day1 = getSeriesChildContent('navratri-day-1-shailaputri');
    const day2 = getSeriesChildContent('navratri-day-2-brahmacharini');
    assert.notEqual(day1?.deityOrTheme?.value.en, day2?.deityOrTheme?.value.en);
  });

  await t.test('4. resolves multilingual text with fallback from LocalizedEditorialField', () => {
    const day1 = getSeriesChildContent('navratri-day-1-shailaputri');
    assert.equal(resolveLocalizedText(day1?.canonicalTitle, 'en'), 'Navratri Day 1 — Shailaputri');
    assert.equal(resolveLocalizedText(day1?.canonicalTitle, 'hi'), 'नवरात्रि दिन १ — शैलपुत्री');
    assert.equal(resolveLocalizedText(day1?.canonicalTitle, 'pa'), 'ਨਰਾਤੇ ਦਿਨ ੧ — ਸ਼ੈਲਪੁਤਰੀ');

    // Pending field returns empty string (fail-closed)
    assert.equal(resolveLocalizedText({
      value: { en: 'Draft title' },
      status: 'pending_source',
      sourceRefs: [],
      applicability: { universal: true },
    }, 'en'), '');

    // Fallback to English if unknown or missing
    assert.equal(resolveLocalizedText({
      value: { en: 'English Only' },
      status: 'source_backed',
      sourceRefs: [{ sourceName: 'Fixture', tier: 1, usagePermitted: 'test' }],
      applicability: { universal: true },
    }, 'hi'), 'English Only');
  });

  await t.test('5. resolves localized ritual lists with regional applicability', () => {
    const day6 = getSeriesChildContent('navratri-day-6-katyayani');
    const enRituals = resolveLocalizedList(day6?.rituals, 'en', { region: 'Bengal' });
    assert.deepEqual(enRituals, ['Bilva Nimantran', 'Sasthi Bodhon', 'Katyayani Puja']);
    assert.equal(day6?.rituals?.applicability.universal, false);
    assert.ok(day6?.rituals?.applicability.regions?.includes('Bengal'));
  });

  await t.test('6. fails closed for pending, unratified, and inapplicable editorial fields', () => {
    const day1 = getSeriesChildContent('navratri-day-1-shailaputri');
    assert.equal(isEditorialFieldDisplayable(day1?.deityOrTheme), true);

    const pending = {
      value: { en: 'Draft' },
      status: 'pending_source' as const,
      sourceRefs: [],
      applicability: { universal: true },
    };
    assert.equal(isEditorialFieldDisplayable(pending), false);

    const unratified = {
      value: { en: 'Draft' },
      status: 'council_reviewed_editorial' as const,
      sourceRefs: [],
      applicability: { universal: true },
    };
    assert.equal(isEditorialFieldDisplayable(unratified), false);

    const regional = {
      value: { en: ['Regional ritual'] },
      status: 'source_backed' as const,
      sourceRefs: [{ sourceName: 'Fixture', tier: 1, usagePermitted: 'test' }],
      applicability: { universal: false, regions: ['Bengal'] },
    };
    assert.deepEqual(resolveLocalizedList(regional, 'en'), []);
    assert.deepEqual(resolveLocalizedList(regional, 'en', { region: 'Bengal' }), ['Regional ritual']);
  });

  await t.test('7. zero fabrication: snapshot contains no unverified colors or unproven mantras', () => {
    for (const group of OBSERVANCE_SERIES_CONTENT_SNAPSHOT.series) {
      for (const child of group.children) {
        assert.equal((child as any).colour, undefined);
        assert.equal((child as any).color, undefined);
        assert.equal((child as any).mantraId, undefined);
        assert.equal((child as any).mantra, undefined);
      }
    }
  });

  await t.test('8. formatSeriesDayLabel derives tradition-accurate, compact day labels across all 6 multi-day series', () => {
    // 1. Sharad Navratri (10 days)
    const navratri = getSeriesGroupContent('sharad-navratri')!;
    assert.equal(formatSeriesDayLabel(navratri.children[0], 'en'), 'Day 1 · Shailaputri');
    assert.equal(formatSeriesDayLabel(navratri.children[0], 'hi'), 'दिन 1 · शैलपुत्री');
    assert.equal(formatSeriesDayLabel(navratri.children[1], 'en'), 'Day 2 · Brahmacharini');
    assert.equal(formatSeriesDayLabel(navratri.children[9], 'en'), 'Day 10 · Dussehra');
    assert.equal(formatSeriesDayLabel(navratri.children[9], 'hi'), 'दिन 10 · विजयादशमी');

    // 2. Diwali Five Days (5 days)
    const diwali = getSeriesGroupContent('diwali-five-days')!;
    assert.equal(formatSeriesDayLabel(diwali.children[0], 'en'), 'Day 1 · Dhanteras');
    assert.equal(formatSeriesDayLabel(diwali.children[0], 'hi'), 'दिन 1 · धनतेरस');
    assert.equal(formatSeriesDayLabel(diwali.children[1], 'en'), 'Day 2 · Naraka Chaturdashi');
    assert.equal(formatSeriesDayLabel(diwali.children[2], 'en'), 'Day 3 · Diwali');
    assert.equal(formatSeriesDayLabel(diwali.children[2], 'hi'), 'दिन 3 · दीपावली');
    assert.equal(formatSeriesDayLabel(diwali.children[3], 'en'), 'Day 4 · Govardhan Puja');
    assert.equal(formatSeriesDayLabel(diwali.children[4], 'en'), 'Day 5 · Bhai Dooj');

    // 3. Chhath Puja (4 days)
    const chhath = getSeriesGroupContent('chhath-puja-four-days')!;
    assert.equal(formatSeriesDayLabel(chhath.children[0], 'en'), 'Day 1 · Nahay Khay');
    assert.equal(formatSeriesDayLabel(chhath.children[0], 'hi'), 'दिन 1 · नहाय खाय');
    assert.equal(formatSeriesDayLabel(chhath.children[1], 'en'), 'Day 2 · Kharna');
    assert.equal(formatSeriesDayLabel(chhath.children[2], 'en'), 'Day 3 · Sandhya Arghya');
    assert.equal(formatSeriesDayLabel(chhath.children[3], 'en'), 'Day 4 · Usha Arghya');

    // 4. Paryushana Parva (8 days)
    const paryushana = getSeriesGroupContent('paryushana-parva')!;
    assert.equal(formatSeriesDayLabel(paryushana.children[0], 'en'), 'Day 1');
    assert.equal(formatSeriesDayLabel(paryushana.children[6], 'en'), 'Day 7');
    assert.equal(formatSeriesDayLabel(paryushana.children[7], 'en'), 'Day 8 · Samvatsari');
    assert.equal(formatSeriesDayLabel(paryushana.children[7], 'hi'), 'दिन 8 · संवत्सरी');

    // 5. Ganeshotsav (11 days)
    const ganesh = getSeriesGroupContent('ganeshotsav')!;
    assert.equal(formatSeriesDayLabel(ganesh.children[0], 'en'), 'Day 1 · Chaturthi');
    assert.equal(formatSeriesDayLabel(ganesh.children[0], 'hi'), 'दिन 1 · गणेश चतुर्थी');
    assert.equal(formatSeriesDayLabel(ganesh.children[1], 'en'), 'Day 2');
    assert.equal(formatSeriesDayLabel(ganesh.children[10], 'en'), 'Day 11 · Visarjan');
    assert.equal(formatSeriesDayLabel(ganesh.children[10], 'hi'), 'दिन 11 · विसर्जन');

    // 6. Chaitra Navratri (9 days)
    const chaitra = getSeriesGroupContent('chaitra-navratri')!;
    assert.equal(formatSeriesDayLabel(chaitra.children[0], 'en'), 'Day 1 · Shailaputri');
    assert.equal(formatSeriesDayLabel(chaitra.children[8], 'en'), 'Day 9 · Siddhidatri');
    assert.equal(formatSeriesDayLabel(chaitra.children[8], 'hi'), 'दिन 9 · सिद्धिदात्री');
  });

});
