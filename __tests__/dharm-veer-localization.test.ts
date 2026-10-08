import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { pickDharmVeerLocalizedText } from '../lib/dharm-veer';

const screen = readFileSync(new URL('../app/dharm-veer/[id].tsx', import.meta.url), 'utf8');

describe('Dharm Veer localized reader', () => {
  it('falls back to the source language instead of Hindi when Punjabi is absent', () => {
    assert.equal(pickDharmVeerLocalizedText('English source', 'Hindi copy', undefined, 'pa'), 'English source');
    assert.equal(pickDharmVeerLocalizedText('English source', 'Hindi copy', 'Punjabi copy', 'pa'), 'Punjabi copy');
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
