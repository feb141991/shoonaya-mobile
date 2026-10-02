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

/**
 * Creates an offline standalone FullKatha from the expanded snapshot if available.
 * Guarantees zero-network offline rendering for Panchatantra stories.
 */
export function createOfflinePanchatantraKatha(id: string) {
  const expanded = getExpandedPanchatantraStory(id);
  if (!expanded) return null;

  const rawName = id.replace(/^panchatantra-/, '');
  const titleWords = rawName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1));
  const defaultTitle = titleWords.join(' ');

  return {
    id: expanded.id,
    tradition: 'hindu',
    occasion: 'general',
    title: defaultTitle,
    preview: expanded.body[0]?.slice(0, 150) ?? '',
    body: expanded.body,
    bodyHi: expanded.bodyHi,
    phal: 'Wisdom from the Panchatantra.',
    durationMin: expanded.durationMin || 5,
    tags: ['panchatantra', 'wisdom', 'ethics'],
    portrait: expanded.portrait,
  };
}

