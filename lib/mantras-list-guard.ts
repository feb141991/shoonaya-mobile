/**
 * Pulled out of app/mantras.tsx so this validation logic can be imported and executed
 * directly by a plain `tsx --test` run -- the screen itself can't be (it imports
 * react-native/expo-router at module scope, which that runner can't resolve).
 */

export type Mantra = {
  id: string;
  tradition: string;
  deity?: string;
  nameEn: string;
  nameLocal: string;
  // /api/bhakti/mantras always sends this (backend's Mantra.textTransliteration
  // is a required field), but it is NOT checked by isMantraList below: a
  // malformed value on one entry must never reject the whole fetched list.
  // Read it only through displayableTransliteration(), which treats
  // anything that isn't a non-empty string as "nothing to show" for that
  // entry alone.
  textTransliteration?: string;
  tags: string[];
};

export function isMantraList(value: unknown): value is Mantra[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Record<string, unknown>;
    return typeof candidate.id === 'string' &&
      typeof candidate.tradition === 'string' &&
      typeof candidate.nameEn === 'string' &&
      typeof candidate.nameLocal === 'string' &&
      Array.isArray(candidate.tags) && candidate.tags.every((tag) => typeof tag === 'string');
  });
}

/** Anything other than a non-empty string is treated as "no transliteration to show" for
 *  that one card -- an individual entry's malformed value must never affect whether the
 *  rest of an otherwise-valid mantra list can be read (see isMantraList above). */
export function displayableTransliteration(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}
