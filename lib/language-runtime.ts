export const SUPPORTED_APP_LANGUAGES = ['en', 'hi', 'pa'] as const;

export type AppLanguage = (typeof SUPPORTED_APP_LANGUAGES)[number];
export type AppContentLanguage = AppLanguage;

export function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string'
    && (SUPPORTED_APP_LANGUAGES as readonly string[]).includes(value);
}

export function normalizeContentLanguage(value?: string | null): AppContentLanguage {
  return isAppLanguage(value) ? value : 'en';
}

export function resolveLanguageFallback<T>(
  translations: Partial<Record<AppLanguage, T>>,
  preferredLanguage?: string | null,
  fallbackLanguage: AppLanguage = 'en',
): T | null {
  const preferred = normalizeContentLanguage(preferredLanguage);
  return translations[preferred] ?? translations[fallbackLanguage] ?? null;
}

export function resolveEffectiveMeaningLanguage(
  appLanguage?: string | null,
  meaningLanguage?: string | null,
): AppContentLanguage {
  const requestedMeaning = normalizeContentLanguage(meaningLanguage);
  if (requestedMeaning !== 'en') return requestedMeaning;
  return normalizeContentLanguage(appLanguage);
}

export function getMeaningLabel(language?: string | null): string {
  switch (normalizeContentLanguage(language)) {
    case 'hi':
      return 'अर्थ';
    case 'pa':
      return 'ਅਰਥ';
    default:
      return 'Meaning';
  }
}

export function getLanguageInstruction(language?: string | null): string {
  switch (normalizeContentLanguage(language)) {
    case 'hi':
      return "Respond entirely in Hindi. Do not use English unless language is 'en'.";
    case 'pa':
      return "Respond entirely in Punjabi. Do not use English unless language is 'en'.";
    default:
      return 'Respond in clear, warm English.';
  }
}
