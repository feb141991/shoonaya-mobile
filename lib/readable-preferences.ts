import { type AppContentLanguage, normalizeContentLanguage, resolveEffectiveMeaningLanguage } from '@/lib/language-runtime';

export type ReaderDisplayMode = 'en' | 'local';

export interface ReadablePreferencesInput {
  appLanguage?: string | null;
  meaningLanguage?: string | null;
  transliterationLanguage?: string | null;
  showTransliteration?: boolean | null;
  scriptureScript?: string | null;
}

export interface ReadablePreferences {
  appLanguage: 'en' | 'hi' | 'pa';
  meaningLanguage: AppContentLanguage;
  effectiveMeaningLanguage: AppContentLanguage;
  transliterationLanguage: string;
  showTransliteration: boolean;
  scriptureScript: string;
  preferLocalLanguage: boolean;
}

function normalizeAppLanguage(value?: string | null): 'en' | 'hi' | 'pa' {
  return value === 'hi' || value === 'pa' ? value : 'en';
}

export function resolveReadablePreferences(
  input: ReadablePreferencesInput,
): ReadablePreferences {
  const appLanguage = normalizeAppLanguage(input.appLanguage);
  const meaningLanguage = normalizeContentLanguage(input.meaningLanguage);
  const effectiveMeaningLanguage = resolveEffectiveMeaningLanguage(appLanguage, meaningLanguage);

  return {
    appLanguage,
    meaningLanguage,
    effectiveMeaningLanguage,
    transliterationLanguage: input.transliterationLanguage ?? 'en',
    showTransliteration: input.showTransliteration ?? true,
    scriptureScript: input.scriptureScript ?? 'original',
    preferLocalLanguage: effectiveMeaningLanguage !== 'en',
  };
}

export function getInitialReaderDisplayMode(
  preferences: ReadablePreferences,
  hasLocalContent: boolean,
): ReaderDisplayMode {
  return hasLocalContent && preferences.preferLocalLanguage ? 'local' : 'en';
}
