import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DHARM_VEERS, selectDharmVeerOfTheDayFromRoster } from '../lib/dharm-veer';

describe('Dharm Veer Canonical 500+ Words & Verification Suite', () => {
  it('contains all 12 cornerstone heroes offline in DHARM_VEERS', () => {
    assert.equal(DHARM_VEERS.length, 12);
  });

  it('guarantees each hero has >= 500 words in core narrative', () => {
    for (const hero of DHARM_VEERS) {
      const narrative = [
        hero.journey,
        hero.trial,
        hero.teaching,
        hero.moral,
        hero.legacy || '',
      ].join(' ').trim();

      const wordCount = narrative.split(/\s+/).filter(Boolean).length;
      assert.ok(
        wordCount >= 500,
        `Expected ${hero.id} to have >= 500 words, got ${wordCount}`
      );
    }
  });

  it('verifies primary scriptural sources and citations exist for every hero', () => {
    for (const hero of DHARM_VEERS) {
      assert.ok(hero.source && hero.source.length > 5, `${hero.id} missing source`);
      assert.ok(hero.sourceLocal && hero.sourceLocal.length > 5, `${hero.id} missing sourceLocal`);
      assert.ok(Array.isArray(hero.sourceCitations), `${hero.id} missing sourceCitations array`);
      assert.ok(
        hero.sourceCitations.length >= 2,
        `${hero.id} must have at least 2 canonical source citations, got ${hero.sourceCitations.length}`
      );
      for (const citation of hero.sourceCitations) {
        assert.ok(citation.sourceName, `${hero.id} citation missing sourceName`);
        assert.ok(citation.tier === 1 || citation.tier === 2, `${hero.id} citation tier must be 1 or 2`);
      }
    }
  });

  it('guarantees complete bilingual Hindi localizations for all heroes', () => {
    for (const hero of DHARM_VEERS) {
      assert.ok(hero.nameLocal, `${hero.id} missing nameLocal`);
      assert.ok(hero.eraLocal, `${hero.id} missing eraLocal`);
      assert.ok(hero.regionLocal, `${hero.id} missing regionLocal`);
      assert.ok(hero.taglineLocal, `${hero.id} missing taglineLocal`);
      assert.ok(hero.journeyLocal && hero.journeyLocal.length > 100, `${hero.id} missing journeyLocal`);
      assert.ok(hero.trialLocal && hero.trialLocal.length > 50, `${hero.id} missing trialLocal`);
      assert.ok(hero.teachingLocal && hero.teachingLocal.length > 30, `${hero.id} missing teachingLocal`);
      assert.ok(hero.moralLocal && hero.moralLocal.length > 20, `${hero.id} missing moralLocal`);
      assert.ok(hero.legacyLocal && hero.legacyLocal.length > 30, `${hero.id} missing legacyLocal`);
      assert.ok(hero.quoteLocal?.text, `${hero.id} missing quoteLocal.text`);
      assert.ok(hero.quoteLocal?.attribution, `${hero.id} missing quoteLocal.attribution`);
    }
  });

  it('guarantees complete trilingual Punjabi Gurmukhi localizations for Sikh heroes', () => {
    const sikhHeroes = DHARM_VEERS.filter((h) => h.tradition === 'sikh');
    assert.equal(sikhHeroes.length, 3, 'Expected 3 Sikh cornerstone heroes');

    for (const hero of sikhHeroes) {
      assert.ok(hero.namePa, `${hero.id} missing namePa`);
      assert.ok(hero.eraPa, `${hero.id} missing eraPa`);
      assert.ok(hero.regionPa, `${hero.id} missing regionPa`);
      assert.ok(hero.taglinePa, `${hero.id} missing taglinePa`);
      assert.ok(hero.journeyPa && hero.journeyPa.length > 100, `${hero.id} missing journeyPa`);
      assert.ok(hero.trialPa && hero.trialPa.length > 50, `${hero.id} missing trialPa`);
      assert.ok(hero.teachingPa && hero.teachingPa.length > 30, `${hero.id} missing teachingPa`);
      assert.ok(hero.moralPa && hero.moralPa.length > 20, `${hero.id} missing moralPa`);
      assert.ok(hero.legacyPa && hero.legacyPa.length > 30, `${hero.id} missing legacyPa`);
      assert.ok(hero.sourcePa, `${hero.id} missing sourcePa`);
      assert.ok(hero.quotePa?.text, `${hero.id} missing quotePa.text`);
      assert.ok(hero.quotePa?.attribution, `${hero.id} missing quotePa.attribution`);
    }
  });

  it('selects hero of the day deterministically across tradition preference', () => {
    const heroDefault = selectDharmVeerOfTheDayFromRoster(DHARM_VEERS);
    assert.ok(heroDefault && heroDefault.id);

    const heroHindu = selectDharmVeerOfTheDayFromRoster(DHARM_VEERS, 'hindu');
    assert.ok(heroHindu && heroHindu.id);

    const heroSikh = selectDharmVeerOfTheDayFromRoster(DHARM_VEERS, 'sikh');
    assert.ok(heroSikh && heroSikh.id);
  });
});
