import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const screen = readFileSync(new URL('../app/dharm-veer/[id].tsx', import.meta.url), 'utf8');

describe('Dharm Veer localized reader', () => {
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
    assert.match(screen, /\{tagline \? \(/);
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
