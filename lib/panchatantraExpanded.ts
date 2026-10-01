/**
 * Panchatantra Expanded Content Provider
 * 
 * Provides versioned snapshot access to the 60+ depth-expanded
 * Panchatantra stories (6 paragraphs English + 6 paragraphs Devanagari Hindi,
 * single emoji portrait, 5 min duration).
 */

import expandedSnapshot from '@/assets/data/panchatantra-expanded-snapshot.json';

export interface ExpandedPanchatantraEntry {
  id: string;
  portrait: string;
  durationMin: number;
  body: string[];
  bodyHi: string[];
}

const EXPANDED_MAP = new Map<string, ExpandedPanchatantraEntry>();

(expandedSnapshot as ExpandedPanchatantraEntry[]).forEach((item) => {
  if (item && item.id) {
    EXPANDED_MAP.set(item.id, item);
  }
});

/**
 * Returns the expanded 6-paragraph entry for a given Panchatantra story ID, if available.
 */
export function getExpandedPanchatantraStory(id: string): ExpandedPanchatantraEntry | undefined {
  if (!id) return undefined;
  return EXPANDED_MAP.get(id.trim());
}

/**
 * Enhances a katha object with expanded 6-paragraph body, bodyHi, and portrait
 * if an expanded version exists in the versioned snapshot.
 */
export function enhanceWithExpandedPanchatantra<T extends { id: string; body: string[]; bodyHi?: string[]; portrait?: string; durationMin?: number }>(
  katha: T
): T {
  const expanded = getExpandedPanchatantraStory(katha.id);
  if (!expanded) return katha;

  return {
    ...katha,
    body: expanded.body.length > katha.body.length ? expanded.body : katha.body,
    bodyHi: expanded.bodyHi?.length ? expanded.bodyHi : katha.bodyHi,
    portrait: expanded.portrait || katha.portrait,
    durationMin: expanded.durationMin || katha.durationMin || 5,
  };
}
