import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SANSKARA_CATALOG, SANSKARA_CATALOG_REVIEWED_BY, SANSKARA_CATALOG_REVIEWED_DATE } from '../lib/sanskaraCatalog';

test('Sanskara catalog (the "Plant Sacred Milestone" picker)', async (t) => {
  await t.test('has exactly the traditional 16 entries', () => {
    assert.equal(SANSKARA_CATALOG.length, 16);
  });

  await t.test('every key is unique and non-empty', () => {
    const keys = SANSKARA_CATALOG.map((e) => e.key);
    assert.equal(new Set(keys).size, keys.length);
    for (const key of keys) assert.ok(key.trim().length > 0, `empty key: ${JSON.stringify(key)}`);
  });

  await t.test('every entry has non-empty Sanskrit, transliteration, English name, life stage and purpose', () => {
    for (const entry of SANSKARA_CATALOG) {
      assert.ok(entry.nameSanskrit.trim().length > 0, `${entry.key}: empty nameSanskrit`);
      assert.ok(entry.nameTransliteration.trim().length > 0, `${entry.key}: empty nameTransliteration`);
      assert.ok(entry.nameEnglish.trim().length > 0, `${entry.key}: empty nameEnglish`);
      assert.ok(entry.lifeStage.trim().length > 0, `${entry.key}: empty lifeStage`);
      assert.ok(entry.purpose.trim().length > 0, `${entry.key}: empty purpose`);
    }
  });

  await t.test('every entry lists at least one value and none are blank', () => {
    for (const entry of SANSKARA_CATALOG) {
      assert.ok(entry.values.length > 0, `${entry.key}: no values`);
      for (const value of entry.values) assert.ok(value.trim().length > 0, `${entry.key}: blank value`);
    }
  });

  await t.test('every entry is marked approved, with a named reviewer and date recorded', () => {
    // AGENTS.md section 3: approval must be real, not assumed. Reviewed
    // and approved by Pt. Prince Sharma on 2026-11-07 after reading the
    // full table of all 16 entries in chat. If an entry is ever edited,
    // or a new one added, it must go back to 'pending_review' until shown
    // for review again -- this test only asserts today's approved state,
    // it does not grant a blanket future exemption.
    for (const entry of SANSKARA_CATALOG) {
      assert.equal(entry.reviewStatus, 'approved', `${entry.key}: not approved`);
    }
    assert.equal(SANSKARA_CATALOG_REVIEWED_BY, 'Pt. Prince Sharma');
    assert.ok(SANSKARA_CATALOG_REVIEWED_DATE.trim().length > 0);
  });

  await t.test('only reviewStatus "pending_review" or "approved" are valid -- no silent third state', () => {
    // Guards the UI branch in app/kul/sanskara.tsx, which renders one of
    // exactly two notices keyed off this field. A typo'd or new status
    // value would silently fall through to the "not yet reviewed" copy
    // there (safe by default) but should still be caught here explicitly.
    for (const entry of SANSKARA_CATALOG) {
      assert.ok(
        entry.reviewStatus === 'pending_review' || entry.reviewStatus === 'approved',
        `${entry.key}: unexpected reviewStatus ${JSON.stringify(entry.reviewStatus)}`,
      );
    }
  });

  await t.test('does not include Vanaprastha or Sannyasa (the dedicated Ashrama feature owns those)', () => {
    const transliterations = SANSKARA_CATALOG.map((e) => e.nameTransliteration.toLowerCase());
    assert.ok(!transliterations.some((t) => t.includes('vanaprastha')));
    assert.ok(!transliterations.some((t) => t.includes('sannyasa') || t.includes('sanyasa')));
  });

  await t.test('titles built from a catalog pick fit the 60-character milestone title field', () => {
    // Matches how app/kul/sanskara.tsx's handleUseCatalogEntry builds the
    // title: "{transliteration} ({english})", falling back to the bare
    // transliteration if that combination would be too long.
    for (const entry of SANSKARA_CATALOG) {
      const full = `${entry.nameTransliteration} (${entry.nameEnglish})`;
      const title = full.length > 60 ? entry.nameTransliteration : full;
      assert.ok(title.length <= 60, `${entry.key}: title too long even after fallback (${title.length} chars)`);
    }
  });
});
