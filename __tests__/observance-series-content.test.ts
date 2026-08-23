import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSeriesChildContent,
  getSeriesGroupContent,
  resolveLocalizedText,
  resolveLocalizedList,
  isEditorialFieldDisplayable,
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
  });

  await t.test('2. successfully retrieves child content by slug with typed field provenance', () => {
    const day1 = getSeriesChildContent('navratri-day-1-shailaputri');
    assert.ok(day1, 'Day 1 should exist');
    assert.equal(day1.sequence, 1);
    assert.equal(day1.canonicalTitle.value.en, 'Navratri Day 1 — Shailaputri');
    assert.equal(day1.deityOrTheme?.value.en, 'Maa Shailaputri');
    assert.equal(day1.canonicalTitle.status, 'pending_source');

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
    assert.equal(resolveLocalizedText(day1?.canonicalTitle, 'en'), '');
    assert.equal(resolveLocalizedText(day1?.canonicalTitle, 'hi'), '');
    assert.equal(resolveLocalizedText(day1?.canonicalTitle, 'pa'), '');

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
    assert.deepEqual(enRituals, []);
    assert.equal(day6?.rituals?.applicability.universal, false);
    assert.ok(day6?.rituals?.applicability.regions?.includes('Bengal'));
  });

  await t.test('6. fails closed for pending, unratified, and inapplicable editorial fields', () => {
    const day1 = getSeriesChildContent('navratri-day-1-shailaputri');
    assert.equal(isEditorialFieldDisplayable(day1?.deityOrTheme), false);

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

});
