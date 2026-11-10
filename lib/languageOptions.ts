import { SUPPORTED_APP_LANGUAGES, type AppLanguage } from '@/lib/language-runtime';

/**
 * Which languages Settings offers a person. English and Hindi are offered to everyone. Punjabi is a choice for Sikh profiles only (the
 * tradition whose practice and Gurbani it serves), plus anyone whose profile already holds Punjabi, so a saved choice never vanishes from the
 * list it was made in.
 *
 * This decides what is OFFERED, not what the app can render: every Punjabi string, the generated content and the backend producers stay in
 * place. Tradition is self-declared, so this is a content scope and not a security boundary. `tradition` that is missing, unknown or not yet
 * loaded counts as not Sikh, which hides Punjabi rather than offering it by mistake.
 */

const ALWAYS_OFFERED: readonly AppLanguage[] = ['en', 'hi'];

export function isSikhTradition(tradition: string | null | undefined): boolean {
  return typeof tradition === 'string' && tradition.trim().toLowerCase() === 'sikh';
}

/** The languages to list for one row. `currentValue` is that row's saved value (app, meaning or transliteration language). */
export function offeredLanguages(
  tradition: string | null | undefined,
  currentValue?: string | null,
): AppLanguage[] {
  const offerPunjabi = isSikhTradition(tradition) || currentValue === 'pa';
  return SUPPORTED_APP_LANGUAGES.filter((key) => ALWAYS_OFFERED.includes(key) || (key === 'pa' && offerPunjabi));
}
