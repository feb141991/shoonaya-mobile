import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export const SUPPORTED_LANGUAGES = ['en', 'hi', 'pa'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function isValidAppLanguage(val: unknown): val is AppLanguage {
  return typeof val === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(val);
}

export function resolveLanguageFallback<T>(translations: Record<string, T>, preferredLang: string, fallbackLang: string = 'en'): T | null {
  if (translations[preferredLang]) return translations[preferredLang];
  if (translations[fallbackLang]) return translations[fallbackLang];
  return null;
}

describe('Language Normalization & Punjabi (pa) Compatibility Suite', () => {
  it('supports en, hi, pa as valid canonical languages', () => {
    assert.equal(isValidAppLanguage('en'), true);
    assert.equal(isValidAppLanguage('hi'), true);
    assert.equal(isValidAppLanguage('pa'), true);

    assert.equal(isValidAppLanguage('fr'), false);
    assert.equal(isValidAppLanguage(''), false);
    assert.equal(isValidAppLanguage(null), false);
  });

  it('builds valid language patch payloads with pa across all 3 language fields', () => {
    const payload = {
      app_language: 'pa' as AppLanguage,
      meaning_language: 'pa' as AppLanguage,
      transliteration_language: 'en' as AppLanguage,
    };

    assert.equal(isValidAppLanguage(payload.app_language), true);
    assert.equal(isValidAppLanguage(payload.meaning_language), true);
    assert.equal(isValidAppLanguage(payload.transliteration_language), true);
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
