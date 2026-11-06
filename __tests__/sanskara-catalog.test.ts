import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SANSKARA_CATALOG } from '../lib/sanskaraCatalog';

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

  await t.test('every entry is marked pending_review, never a stronger claim', () => {
    // AGENTS.md section 3: this content has not been through Shoonaya's
    // council/founder review. Nothing here may claim otherwise until that
    // review actually happens and this field is updated by hand.
    for (const entry of SANSKARA_CATALOG) {
      assert.equal(entry.reviewStatus, 'pending_review', `${entry.key}: not pending_review`);
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
