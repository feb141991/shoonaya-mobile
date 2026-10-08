import assert from 'node:assert/strict';
import test from 'node:test';

import { DHARM_VEERS } from '../lib/dharm-veer';
import { VRAT_DATABASE } from '../lib/vrat-data';
import { buildDharmVeerQuoteShareCard, buildVratMantraShareCard } from '../lib/readerShareCards';

test('all Dharm Veer quote cards require quote, attribution, and a source citation', () => {
  assert.equal(DHARM_VEERS.length, 76);
  for (const hero of DHARM_VEERS) {
    const card = buildDharmVeerQuoteShareCard(hero, hero.quote, 'story');
    assert.ok(card, `${hero.id} should have an eligible sourced quote card`);
    assert.equal(card?.headlineValue, hero.quote?.text);
    assert.ok(card?.source);
    assert.equal(card?.format, 'story');
  }
});

test('quote cards fail closed when quote, attribution, or citation is absent', () => {
  const hero = DHARM_VEERS[0];
  assert.equal(buildDharmVeerQuoteShareCard(hero, undefined, 'square'), null);
  assert.equal(buildDharmVeerQuoteShareCard(hero, { text: 'quote', attribution: ' ' }, 'square'), null);
  assert.equal(buildDharmVeerQuoteShareCard({ ...hero, sourceCitations: [] }, hero.quote, 'square'), null);
});

test('Vrat mantra cards require explicit per-mantra source metadata', () => {
  const currentVrats = Object.values(VRAT_DATABASE);
  assert.ok(currentVrats.length > 0);
  for (const vrat of currentVrats) {
    assert.equal(buildVratMantraShareCard(vrat, vrat.mantra, 'square'), null, `${vrat.id} must stay gated without a reviewed source`);
  }

  const reviewed = {
    ...currentVrats[0],
    mantraSourceCitations: { en: { sourceName: 'Reviewed source', sourceRef: '1.2' } },
  };
  const card = buildVratMantraShareCard(reviewed, reviewed.mantra, 'square');
  assert.equal(card?.format, 'square');
  assert.equal(card?.source, 'Reviewed source — 1.2');
  assert.equal(buildVratMantraShareCard(reviewed, reviewed.mantraLocal ?? reviewed.mantra, 'square', 'hi'), null);
});
