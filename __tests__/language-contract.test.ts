import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  SUPPORTED_APP_LANGUAGES,
  isAppLanguage,
  normalizeContentLanguage,
  resolveLanguageFallback,
  type AppLanguage,
} from '../lib/language-runtime';

describe('Language Normalization & Punjabi (pa) Compatibility Suite', () => {
  it('supports en, hi, pa as valid canonical languages', () => {
    assert.deepEqual(SUPPORTED_APP_LANGUAGES, ['en', 'hi', 'pa']);
    assert.equal(isAppLanguage('en'), true);
    assert.equal(isAppLanguage('hi'), true);
    assert.equal(isAppLanguage('pa'), true);

    assert.equal(isAppLanguage('fr'), false);
    assert.equal(isAppLanguage(''), false);
    assert.equal(isAppLanguage(null), false);
    assert.equal(normalizeContentLanguage('pa'), 'pa');
    assert.equal(normalizeContentLanguage(null), 'en');
  });

  it('builds valid language patch payloads with pa across all 3 language fields', () => {
    const payload = {
      app_language: 'pa' as AppLanguage,
      meaning_language: 'pa' as AppLanguage,
      transliteration_language: 'en' as AppLanguage,
    };

    assert.equal(isAppLanguage(payload.app_language), true);
    assert.equal(isAppLanguage(payload.meaning_language), true);
    assert.equal(isAppLanguage(payload.transliteration_language), true);
  });

  it('falls back cleanly to English when Punjabi text is not yet authored for a key', () => {
    const mockCopy = {
      en: 'Welcome to Shoonaya',
      hi: 'शून्या में आपका स्वागत है',
    };

    const resolved = resolveLanguageFallback(mockCopy, 'pa', 'en');
    assert.equal(resolved, 'Welcome to Shoonaya');
  });

  it('returns Punjabi copy when available', () => {
    const mockCopy = {
      en: 'Peace',
      hi: 'शांति',
      pa: 'ਸ਼ਾਂਤੀ',
    };

    const resolved = resolveLanguageFallback(mockCopy, 'pa', 'en');
    assert.equal(resolved, 'ਸ਼ਾਂਤੀ');
  });
});
