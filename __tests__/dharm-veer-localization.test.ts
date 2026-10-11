import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { DHARM_VEERS, getDharmVeerCardCopy, pickDharmVeerLocalizedText, pickDharmVeerQuote } from '../lib/dharm-veer';

const screen = readFileSync(new URL('../app/dharm-veer/[id].tsx', import.meta.url), 'utf8');
const archive = readFileSync(new URL('../app/dharm-veer.tsx', import.meta.url), 'utf8');
const home = readFileSync(new URL('../app/(tabs)/index.tsx', import.meta.url), 'utf8');
const bhakti = readFileSync(new URL('../app/(tabs)/bhakti.tsx', import.meta.url), 'utf8');
const quiz = readFileSync(new URL('../app/quiz.tsx', import.meta.url), 'utf8');

describe('Dharm Veer localized reader', () => {
  it('falls back to the source language instead of Hindi when Punjabi is absent', () => {
    assert.equal(pickDharmVeerLocalizedText('English source', 'Hindi copy', undefined, 'pa'), 'English source');
    assert.equal(pickDharmVeerLocalizedText('English source', 'Hindi copy', 'Punjabi copy', 'pa'), 'Punjabi copy');
  });

  it('uses the selected language for Dharm Veer cards, with English fallback for missing translations', () => {
    const hero = {
      name: 'Sri Krishna', nameLocal: 'श्री कृष्ण', namePa: 'ਸ੍ਰੀ ਕ੍ਰਿਸ਼ਨ',
      tagline: 'English tagline', taglineLocal: 'हिंदी परिचय', taglinePa: 'ਪੰਜਾਬੀ ਜਾਣ-ਪਛਾਣ',
    };
    assert.deepEqual(getDharmVeerCardCopy(hero, 'hi'), {
      name: 'श्री कृष्ण', tagline: 'हिंदी परिचय', era: undefined, region: undefined,
    });
    assert.deepEqual(getDharmVeerCardCopy(hero, 'pa'), {
      name: 'ਸ੍ਰੀ ਕ੍ਰਿਸ਼ਨ', tagline: 'ਪੰਜਾਬੀ ਜਾਣ-ਪਛਾਣ', era: undefined, region: undefined,
    });
    assert.equal(getDharmVeerCardCopy({ name: 'Hero', tagline: 'English' }, 'hi').tagline, 'English');
    const partialServerHero = { id: 'sri-krishna', name: 'Sri Krishna', tagline: 'Server English copy' };
    const copyWithBundledTranslation = getDharmVeerCardCopy(partialServerHero, 'hi');
    assert.equal(copyWithBundledTranslation.name, 'श्री कृष्ण');
    assert.equal(copyWithBundledTranslation.tagline, DHARM_VEERS.find((item) => item.id === 'sri-krishna')?.taglineLocal);
  });

  it('renders localized names and descriptions on archive and Home cards', () => {
    assert.match(archive, /const \{ language \} = useLanguage\(\)/);
    assert.match(archive, /getDharmVeerCardCopy\(liveTodayHero, language\)/);
    assert.match(archive, /getDharmVeerCardCopy\(hero, language\)/);
    assert.match(home, /getDharmVeerCardCopy\(state\.dharmVeer, language\)/);
    assert.match(bhakti, /धर्म और साहस के प्रेरक जीवन-प्रसंग/);
    assert.match(quiz, /धर्म के वीरों और रक्षकों की प्रेरक कथाएँ पढ़ें/);
  });

  it('quote: a Punjabi reader without a Punjabi quote gets the English quote, never the Hindi one', () => {
    const hero = {
      quote: { text: 'English words', attribution: 'English author' },
      quoteLocal: { text: 'हिंदी शब्द', attribution: 'हिंदी लेखक' },
    };
    assert.deepEqual(pickDharmVeerQuote(hero, 'pa'), { text: 'English words', attribution: 'English author' });
    assert.deepEqual(pickDharmVeerQuote(hero, 'hi'), { text: 'हिंदी शब्द', attribution: 'हिंदी लेखक' });
    assert.deepEqual(pickDharmVeerQuote({ ...hero, quotePa: { text: 'ਪੰਜਾਬੀ', attribution: 'ਲੇਖਕ' } }, 'pa'), { text: 'ਪੰਜਾਬੀ', attribution: 'ਲੇਖਕ' });
  });

  it('quote: text and attribution always come from the same quote', () => {
    const hero = { quote: { text: 'E', attribution: 'EA' }, quotePa: { text: 'ਪ', attribution: '' } };
    assert.deepEqual(pickDharmVeerQuote(hero, 'pa'), { text: 'E', attribution: 'EA' });
    assert.equal(pickDharmVeerQuote({ quote: { text: 'E', attribution: ' ' } }, 'en'), null);
  });

  it('quote: across the roster, Punjabi readers see Punjabi exactly where a complete Punjabi quote exists, else English', () => {
    let punjabi = 0;
    for (const hero of DHARM_VEERS) {
      const shown = pickDharmVeerQuote(hero, 'pa');
      const hasPa = !!hero.quotePa?.text?.trim() && !!hero.quotePa?.attribution?.trim();
      assert.equal(shown?.text, (hasPa ? hero.quotePa! : hero.quote!).text.trim(), hero.id);
      if (hasPa) punjabi += 1;
      else assert.notEqual(shown?.text, hero.quoteLocal?.text?.trim(), `${hero.id} must not show Hindi to a Punjabi reader`);
    }
    assert.equal(punjabi, DHARM_VEERS.filter((h) => h.quotePa?.text?.trim() && h.quotePa?.attribution?.trim()).length);
  });

  it('quote: the reader page uses the shared picker (same quote as the share card)', () => {
    assert.match(screen, /pickDharmVeerQuote\(hero, showLocal \? localContentLanguage : 'en'\)/);
    assert.doesNotMatch(screen, /hero\?\.quoteLocal\?\.text \|\|/, 'old chain fell back from Punjabi to Hindi');
  });

  it('does not hide the language control when only the decorative tagline is absent', () => {
    assert.match(screen, /const hasCompleteLocalContent = !!hero\?\.nameLocal && !!hero\?\.journeyLocal/);
    assert.doesNotMatch(screen, /hasCompleteLocalContent = !!hero\?\.nameLocal && !!hero\?\.taglineLocal/);
  });

  it('uses Hindi or Punjabi labels instead of a generic local-language toggle', () => {
    assert.match(screen, /toggleLabel: 'हिंदी'/);
    assert.match(screen, /toggleLabel: 'ਪੰਜਾਬੀ'/);
    assert.doesNotMatch(screen, /हिं\/Local/);
  });

  it('does not show an English tagline while the local reader is active and no local tagline exists', () => {
    assert.doesNotMatch(screen, /const tagline = lang === 'local' \? hero\?\.taglineLocal : hero\?\.tagline/);
    assert.match(screen, /pickDharmVeerLocalizedText\(hero\?\.tagline, hero\?\.taglineLocal, hero\?\.taglinePa, localContentLanguage\)/);
    // An empty tagline is passed as undefined; the banner renders it only when set.
    assert.match(screen, /tagline=\{tagline \|\| undefined\}/);
  });

  it('resolves Hindi vs Punjabi from the VIEWER\'s own preference, not hero.tradition', () => {
    // Previously getReaderCopy(tradition, language) branched on
    // `tradition === 'sikh'`, showing Punjabi copy over Hindi data for Sikh
    // heroes regardless of the viewer's own language, and Hindi regardless
    // of a Punjabi-preferring viewer's choice for every other tradition.
    assert.doesNotMatch(screen, /getReaderCopy\(hero\?\.tradition/);
    assert.match(screen, /function getReaderCopy\(language: 'en' \| 'hi' \| 'pa'\)/);
    assert.match(screen, /resolveLocalContentLanguage\(preferences\)/);
  });
});
