import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { DHARM_VEERS } from '../lib/dharm-veer';
import { VRAT_DATABASE } from '../lib/vrat-data';
import { dharmVeerQuoteCard, quoteCardSources, quoteCardTypography, QUOTE_CARD_FORMATS } from '../lib/quoteCard';

// Phase 7 (docs/READER_EXPERIENCE_GRAND_PLAN.md, D4): cards only where quote
// + attribution + source exist, text exactly as stored, square and 9:16.

const filled = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('every Dharm Veer with a quote, attribution and source gets a card, in each language, with the stored text', () => {
  let offered = 0;
  for (const hero of DHARM_VEERS) {
    const eligible = filled(hero.quote?.text) && filled(hero.quote?.attribution) && ((hero.sourceCitations?.length ?? 0) > 0 || filled(hero.source));
    for (const language of ['en', 'hi', 'pa'] as const) {
      const card = dharmVeerQuoteCard(hero, language);
      if (!eligible) {
        assert.equal(card, null, `${hero.id} ${language}`);
        continue;
      }
      assert.ok(card, `${hero.id} ${language}`);
      const localized = language === 'hi' ? hero.quoteLocal : language === 'pa' ? hero.quotePa : undefined;
      const expected = localized && filled(localized.text) && filled(localized.attribution) ? localized : hero.quote!;
      assert.equal(card.text, expected.text.trim(), `${hero.id} ${language} text is the stored quote`);
      assert.equal(card.attribution, expected.attribution.trim(), `${hero.id} ${language} attribution goes with its own text`);
      assert.ok(card.sources.length > 0 && card.sources.every(filled), `${hero.id} sources`);
      if (language === 'en') offered += 1;
    }
  }
  assert.equal(offered, DHARM_VEERS.length, 'today all heroes qualify');
});

test('no card without an attribution or without a source; text is never altered', () => {
  const quote = { text: '  Exact words, kept.  ', attribution: 'Someone' };
  assert.equal(dharmVeerQuoteCard({ quote: { text: 'x', attribution: ' ' }, source: 'S' }, 'en'), null);
  assert.equal(dharmVeerQuoteCard({ quote: { text: ' ', attribution: 'A' }, source: 'S' }, 'en'), null);
  assert.equal(dharmVeerQuoteCard({ quote }, 'en'), null, 'no source');
  assert.equal(dharmVeerQuoteCard({ quote, sourceCitations: [{ sourceName: ' ' }] }, 'en'), null, 'blank citation is no source');
  assert.deepEqual(dharmVeerQuoteCard({ quote, source: 'Plain source' }, 'en'), { text: 'Exact words, kept.', attribution: 'Someone', sources: ['Plain source'] });
});

test('a half-translated quote falls back to the whole English quote, never mixing text and attribution', () => {
  const hero = {
    quote: { text: 'English', attribution: 'Author' },
    quoteLocal: { text: 'हिंदी', attribution: '' },
    quotePa: { text: 'ਪੰਜਾਬੀ', attribution: 'ਲੇਖਕ' },
    source: 'S',
  };
  assert.deepEqual(dharmVeerQuoteCard(hero, 'hi'), { text: 'English', attribution: 'Author', sources: ['S'] });
  assert.deepEqual(dharmVeerQuoteCard(hero, 'pa'), { text: 'ਪੰਜਾਬੀ', attribution: 'ਲੇਖਕ', sources: ['S'] });
});

test('citations are listed with their references, preferred over the plain source line', () => {
  assert.deepEqual(
    quoteCardSources({ source: 'Plain', sourceCitations: [{ sourceName: 'Gita', sourceRef: '2.47' }, { sourceName: 'Purana' }] }),
    ['Gita · 2.47', 'Purana'],
  );
});

test('type size steps down as the quote gets longer, and the quote card never cuts or auto-shrinks text', () => {
  for (const format of QUOTE_CARD_FORMATS) {
    const sizes = [20, 120, 180, 260, 400].map((n) => quoteCardTypography(format, n, 0));
    for (let i = 1; i < sizes.length; i += 1) {
      assert.ok(sizes[i].quoteSize <= sizes[i - 1].quoteSize, `${format} monotonic`);
      assert.ok(sizes[i].quoteLine > sizes[i].quoteSize, `${format} line height above font size`);
    }
  }
  assert.ok(quoteCardTypography('story', 100, 20).quoteSize > quoteCardTypography('square', 100, 20).quoteSize);
  const card = read('components/share/ShoonayaShareCard.tsx');
  const quoteCard = card.slice(card.indexOf('export const ShoonayaQuoteCard'));
  assert.doesNotMatch(quoteCard, /adjustsFontSizeToFit/, 'shrank the font but not the line height in captured images');
  assert.match(quoteCard, /\{data\.text\}/);
  const quoteBlock = quoteCard.slice(quoteCard.indexOf('fontSize: type.quoteSize') - 200, quoteCard.indexOf('{data.attribution}'));
  assert.doesNotMatch(quoteBlock, /numberOfLines/, 'quote and attribution are never truncated');
});

test('share images are 3× the card in pixels on iOS too (view-shot takes points there)', () => {
  const helper = read('lib/share-card.ts');
  assert.match(helper, /const factor = Platform\.OS === 'ios' \? 3 \/ PixelRatio\.get\(\) : 3;/);
  assert.match(helper, /width: size\.width \* factor,/);
});

test('cards come in square and 9:16 story only', () => {
  assert.deepEqual([...QUOTE_CARD_FORMATS], ['square', 'story']);
  const card = read('components/share/ShoonayaShareCard.tsx');
  assert.match(card, /export const SHARE_CARD_SQUARE_HEIGHT = 360;/);
  assert.match(card, /export const SHARE_CARD_HEIGHT = 640;/);
  assert.match(card, /Shared from Shoonaya/);
});

test('Dharm Veer offers the card only for a qualifying quote; Vrat offers none (no mantra carries a source)', () => {
  const dv = read('app/dharm-veer/[id].tsx');
  assert.match(dv, /const quoteCard = hero \? dharmVeerQuoteCard\(hero, chapterLanguage\) : null;/);
  assert.match(dv, /\{quoteCard \? \(\s*<PressableSurface/);
  assert.match(dv, /\{quoteCard \? \(\s*<QuoteCardSheet/);
  for (const vrat of Object.values(VRAT_DATABASE)) {
    assert.ok(!('source' in vrat) && !('mantraSource' in vrat), `${vrat.id} has a mantra source; add its quote card`);
  }
  assert.doesNotMatch(read('app/vrat/[slug].tsx'), /QuoteCardSheet/);
});
