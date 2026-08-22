import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  TRADITION_BRIDGES,
  getFounderNoteBlocks,
  type FounderTradition,
  type FounderLanguage,
} from '../lib/founder-note-content';

describe('FounderNoteInterlude Tradition Bridges Test Suite', () => {
  const traditions: FounderTradition[] = ['hindu', 'sikh', 'buddhist', 'jain'];
  const languages: FounderLanguage[] = ['en', 'hi'];

  describe('1. Tradition Bridge Differentiation', () => {
    it('provides a distinct, non-empty bridge for each tradition in English', () => {
      const bridgeEnHindu = TRADITION_BRIDGES.en.hindu;
      const bridgeEnSikh = TRADITION_BRIDGES.en.sikh;
      const bridgeEnBuddhist = TRADITION_BRIDGES.en.buddhist;
      const bridgeEnJain = TRADITION_BRIDGES.en.jain;

      assert.ok(bridgeEnHindu.includes('sacred dates') && bridgeEnHindu.includes('sadhana') && bridgeEnHindu.includes('family parampara'));
      assert.ok(bridgeEnSikh.includes('Gurbani') && bridgeEnSikh.includes('Gurpurabs') && bridgeEnSikh.includes('sangat'));
      assert.ok(bridgeEnBuddhist.includes('core teachings') && bridgeEnBuddhist.includes('meditation') && bridgeEnBuddhist.includes('sangha'));
      assert.ok(bridgeEnJain.includes('ahimsa') && bridgeEnJain.includes('samayika') && bridgeEnJain.includes('spiritual discipline'));

      const set = new Set([bridgeEnHindu, bridgeEnSikh, bridgeEnBuddhist, bridgeEnJain]);
      assert.equal(set.size, 4, 'All four English bridges must be unique');
    });

    it('provides a distinct, non-empty bridge for each tradition in Hindi', () => {
      const bridgeHiHindu = TRADITION_BRIDGES.hi.hindu;
      const bridgeHiSikh = TRADITION_BRIDGES.hi.sikh;
      const bridgeHiBuddhist = TRADITION_BRIDGES.hi.buddhist;
      const bridgeHiJain = TRADITION_BRIDGES.hi.jain;

      assert.ok(bridgeHiHindu.includes('पावन तिथियों') && bridgeHiHindu.includes('दैनिक साधना') && bridgeHiHindu.includes('पारिवारिक परंपरा'));
      assert.ok(bridgeHiSikh.includes('गुरबाणी') && bridgeHiSikh.includes('गुरपुरब') && bridgeHiSikh.includes('संगत'));
      assert.ok(bridgeHiBuddhist.includes('मूल शिक्षाओं') && bridgeHiBuddhist.includes('ध्यान') && bridgeHiBuddhist.includes('संघ'));
      assert.ok(bridgeHiJain.includes('अहिंसा') && bridgeHiJain.includes('सामायिक') && bridgeHiJain.includes('आध्यात्मिक अनुशासन'));

      const set = new Set([bridgeHiHindu, bridgeHiSikh, bridgeHiBuddhist, bridgeHiJain]);
      assert.equal(set.size, 4, 'All four Hindi bridges must be unique');
    });
  });

  describe('2. Block Resolution & Insertion Verification', () => {
    for (const lang of languages) {
      for (const trad of traditions) {
        it(`inserts the ${trad} bridge right after the Sanatan origin paragraph in ${lang}`, () => {
          const blocks = getFounderNoteBlocks(lang, trad);
          const bridgeText = TRADITION_BRIDGES[lang][trad];

          const bridgeIndex = blocks.findIndex((b) => b.text === bridgeText);
          assert.ok(bridgeIndex > 0, `Bridge for ${trad} in ${lang} must be present in blocks`);

          const precedingBlock = blocks[bridgeIndex - 1];
          if (lang === 'en') {
            assert.ok(
              precedingBlock.text.includes('My own experience began with the Sanatan traditions'),
              'Preceding block in English must be the founder Sanatan origin paragraph'
            );
          } else {
            assert.ok(
              precedingBlock.text.includes('मेरी अपनी यात्रा उन सनातन परंपराओं से शुरू हुई'),
              'Preceding block in Hindi must be the founder Sanatan origin paragraph'
            );
          }
        });
      }
    }
  });

  describe('3. Dynamic Switching between Traditions', () => {
    it('dynamically changes bridge content when selected tradition changes', () => {
      const hinduBlocks = getFounderNoteBlocks('en', 'hindu');
      const sikhBlocks = getFounderNoteBlocks('en', 'sikh');
      const buddhistBlocks = getFounderNoteBlocks('en', 'buddhist');
      const jainBlocks = getFounderNoteBlocks('en', 'jain');

      assert.notDeepEqual(hinduBlocks, sikhBlocks);
      assert.notDeepEqual(sikhBlocks, buddhistBlocks);
      assert.notDeepEqual(buddhistBlocks, jainBlocks);
    });
  });
});
