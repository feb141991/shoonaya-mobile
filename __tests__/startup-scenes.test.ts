import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  STARTUP_SCENE_CATALOG,
  NEUTRAL_STARTUP_SCENE,
} from '../lib/startup-scenes/catalog';
import {
  resolveSacredTimePeriod,
  selectStartupScene,
  getStartupGreeting,
} from '../lib/startup-scenes/selector';

describe('Contextual Startup Scenes — Manifest & Catalog Integrity', () => {
  it('contains exactly 9 curated local scenes with complete metadata', () => {
    assert.equal(STARTUP_SCENE_CATALOG.length, 9);

    for (const scene of STARTUP_SCENE_CATALOG) {
      assert.ok(scene.assetId, 'Scene must have an assetId');
      assert.ok(scene.source, 'Scene must reference a local asset source');
      assert.ok(scene.traditions.length > 0, 'Scene must declare traditions');
      assert.ok(scene.sacredTimes.length > 0, 'Scene must declare sacred times');
      assert.ok(['light', 'dark', 'ambient_auto'].includes(scene.textTreatment));
      assert.ok(scene.focalPoint.x >= 0 && scene.focalPoint.x <= 1);
      assert.ok(scene.focalPoint.y >= 0 && scene.focalPoint.y <= 1);
      assert.ok(['approved', 'pending_review'].includes(scene.reviewStatus));
      assert.equal(scene.version, '1.0.0');

      // Multilingual accessibility labels
      assert.ok(scene.accessibilityLabel.en, 'Must have English label');
      assert.ok(scene.accessibilityLabel.hi, 'Must have Hindi label');
      assert.ok(scene.accessibilityLabel.pa, 'Must have Punjabi label');
    }
  });

  it('guarantees neutral portal fallback exists and is valid', () => {
    assert.equal(NEUTRAL_STARTUP_SCENE.assetId, 'neutral_portal_infinite');
    assert.ok(NEUTRAL_STARTUP_SCENE.traditions.includes('neutral'));
    assert.ok(['approved', 'pending_review'].includes(NEUTRAL_STARTUP_SCENE.reviewStatus));
  });
});

describe('Contextual Startup Scenes — Sacred Time Period Resolver', () => {
  it('resolves early_morning (04:00 – 06:59: Dawn / Prabhat / Ushas)', () => {
    // 05:30 AM in Asia/Kolkata
    const d1 = new Date('2026-08-28T05:30:00+05:30');
    assert.equal(resolveSacredTimePeriod('Asia/Kolkata', d1), 'early_morning');

    // 04:00 AM exact boundary
    const d2 = new Date('2026-08-28T04:00:00+05:30');
    assert.equal(resolveSacredTimePeriod('Asia/Kolkata', d2), 'early_morning');
  });

  it('resolves daytime (07:00 – 16:59: Madhyahna / Divasa)', () => {
    const d1 = new Date('2026-08-28T12:00:00+05:30');
    assert.equal(resolveSacredTimePeriod('Asia/Kolkata', d1), 'daytime');

    const d2 = new Date('2026-08-28T07:00:00+05:30');
    assert.equal(resolveSacredTimePeriod('Asia/Kolkata', d2), 'daytime');
  });

  it('resolves evening (17:00 – 19:59: Sandhya / Rehras)', () => {
    const d1 = new Date('2026-08-28T18:30:00+05:30');
    assert.equal(resolveSacredTimePeriod('Asia/Kolkata', d1), 'evening');

    const d2 = new Date('2026-08-28T17:00:00+05:30');
    assert.equal(resolveSacredTimePeriod('Asia/Kolkata', d2), 'evening');
  });

  it('resolves night (20:00 – 03:59: Ratri / Kirtan Sohila)', () => {
    const d1 = new Date('2026-08-28T22:00:00+05:30');
    assert.equal(resolveSacredTimePeriod('Asia/Kolkata', d1), 'night');

    const d2 = new Date('2026-08-28T02:00:00+05:30');
    assert.equal(resolveSacredTimePeriod('Asia/Kolkata', d2), 'night');
  });
});

describe('Contextual Startup Scenes — Deterministic Scene Selector', () => {
  it('selects Hindu morning vs night scenes accurately', () => {
    const morning = new Date('2026-08-28T05:30:00+05:30');
    const hinduMorning = selectStartupScene({
      tradition: 'hindu',
      timezone: 'Asia/Kolkata',
      now: morning,
    });
    assert.equal(hinduMorning.assetId, 'hindu_vedic_sunrise');

    const night = new Date('2026-08-28T21:30:00+05:30');
    const hinduNight = selectStartupScene({
      tradition: 'hindu',
      timezone: 'Asia/Kolkata',
      now: night,
    });
    assert.equal(hinduNight.assetId, 'hindu_temple_dharma');
  });

  it('selects Sikh Amrit Vela vs daytime scenes accurately', () => {
    const amritVela = new Date('2026-08-28T04:30:00+05:30');
    const sikhMorning = selectStartupScene({
      tradition: 'sikh',
      timezone: 'Asia/Kolkata',
      now: amritVela,
    });
    assert.equal(sikhMorning.assetId, 'sikh_sarovar_simran');

    const daytime = new Date('2026-08-28T14:00:00+05:30');
    const sikhDay = selectStartupScene({
      tradition: 'sikh',
      timezone: 'Asia/Kolkata',
      now: daytime,
    });
    assert.equal(sikhDay.assetId, 'sikh_nishan_khanda');
  });

  it('selects Jain morning vs evening scenes accurately', () => {
    const morning = new Date('2026-08-28T06:00:00+05:30');
    const jainMorning = selectStartupScene({
      tradition: 'jain',
      timezone: 'Asia/Kolkata',
      now: morning,
    });
    assert.equal(jainMorning.assetId, 'jain_derasar_ahimsa');

    const evening = new Date('2026-08-28T18:00:00+05:30');
    const jainEvening = selectStartupScene({
      tradition: 'jain',
      timezone: 'Asia/Kolkata',
      now: evening,
    });
    assert.equal(jainEvening.assetId, 'jain_siddhashila_lotus');
  });

  it('selects Buddhist morning vs daytime scenes accurately', () => {
    const morning = new Date('2026-08-28T05:00:00+05:30');
    const buddhistMorning = selectStartupScene({
      tradition: 'buddhist',
      timezone: 'Asia/Kolkata',
      now: morning,
    });
    assert.equal(buddhistMorning.assetId, 'buddhist_bodhi_tranquil');

    const day = new Date('2026-08-28T11:00:00+05:30');
    const buddhistDay = selectStartupScene({
      tradition: 'buddhist',
      timezone: 'Asia/Kolkata',
      now: day,
    });
    assert.equal(buddhistDay.assetId, 'buddhist_dharma_wheel');
  });

  it('falls back to neutral scene on invalid/missing tradition without throwing', () => {
    const fallback1 = selectStartupScene({ tradition: null });
    assert.equal(fallback1.assetId, 'neutral_portal_infinite');

    const fallback2 = selectStartupScene({ tradition: 'unknown_tradition' });
    assert.equal(fallback2.assetId, 'neutral_portal_infinite');

    const fallback3 = selectStartupScene(undefined);
    assert.equal(fallback3.assetId, 'neutral_portal_infinite');
  });
});

describe('Contextual Startup Scenes — Multilingual Greetings', () => {
  it('provides tradition & time-aware greetings in English, Hindi, and Punjabi', () => {
    const morning = new Date('2026-08-28T05:00:00+05:30');

    // Sikh in Punjabi
    const sikhPa = getStartupGreeting({
      tradition: 'sikh',
      timezone: 'Asia/Kolkata',
      language: 'pa',
      now: morning,
    });
    assert.equal(sikhPa.title, 'ਅੰਮ੍ਰਿਤ ਵੇਲਾ');
    assert.equal(sikhPa.periodName, 'ਅੰਮ੍ਰਿਤ ਵੇਲਾ');

    // Hindu in Hindi
    const hinduHi = getStartupGreeting({
      tradition: 'hindu',
      timezone: 'Asia/Kolkata',
      language: 'hi',
      now: morning,
    });
    assert.equal(hinduHi.title, 'प्रभात स्मरण');
    assert.equal(hinduHi.periodName, 'उषा काल');

    // Jain in English
    const jainEn = getStartupGreeting({
      tradition: 'jain',
      timezone: 'Asia/Kolkata',
      language: 'en',
      now: morning,
    });
    assert.equal(jainEn.title, 'Jai Jinendra');

    // Buddhist in English
    const buddhistEn = getStartupGreeting({
      tradition: 'buddhist',
      timezone: 'Asia/Kolkata',
      language: 'en',
      now: morning,
    });
    assert.equal(buddhistEn.title, 'Namo Buddhaya');
  });

  it('falls back to English when an unsupported language code is passed', () => {
    const greeting = getStartupGreeting({
      tradition: 'hindu',
      language: 'fr',
      now: new Date('2026-08-28T12:00:00+05:30'),
    });
    assert.equal(greeting.title, 'Hari Om');
  });
});
