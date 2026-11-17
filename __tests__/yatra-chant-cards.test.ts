import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SACRED_YATRA_CIRCUITS } from '../lib/yatra-data';

// A chant card names a text and shows what is recorded of it. Its title must not promise more than the card holds (AGENTS.md section 3).
// The Akal Takht card was titled "Mool Mantar & Ardas" and held only a Roman-letter Mool Mantar (its recording is the Mool Mantar too);
// no Ardas text is recorded anywhere, and none may be written without a source and a reviewer.
//
// The Sikh chant cards are pinned by shrine and by title, so adding one (or retitling this one) is a decision made here, in front of
// section 3, and not something that slips in with a data edit. This file does not check the recording's rights status (the card records
// none) or whether the Mool Mantar's spelling is the reviewed one: neither has been reviewed by a Sikh reviewer.

describe('the chant cards of the Sikh circuit', () => {
  const sikhChantCards = Object.values(SACRED_YATRA_CIRCUITS)
    .filter((circuit) => circuit.tradition === 'sikh')
    .flatMap((circuit) => circuit.temples)
    .filter((node) => node.stotraOrChant)
    .map((node) => ({ id: node.id, title: node.stotraOrChant?.title }));

  it('are exactly one, the Mool Mantar at Akal Takht, titled for what the card holds', () => {
    assert.deepEqual(sikhChantCards, [{ id: 'akal-takht', title: 'Mool Mantar' }]);
  });

  it('never promise an Ardas, because no Ardas text is recorded', () => {
    for (const card of sikhChantCards) {
      assert.doesNotMatch(card.title ?? '', /ardas/i, card.id);
    }
  });

  it('keep the Mool Mantar text the card has always held, so a retitle cannot hide a change of text', () => {
    const akalTakht = SACRED_YATRA_CIRCUITS['sikh-panj-takht'].temples.find((node) => node.id === 'akal-takht');
    assert.equal(
      akalTakht?.stotraOrChant?.description,
      'Ik Onkar Satnaam Karta Purakh Nirbhau Nirvair Akal Moorat Ajooni Saibhang Gurprasaad',
    );
  });
});
