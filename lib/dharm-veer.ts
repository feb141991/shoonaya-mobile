/**
 * Shoonaya — Dharm Veer
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Handcrafted stories of forgotten and underappreciated heroes of Dharma.
 * Covers all four traditions — Hindu, Sikh, Buddhist, Jain — with genuine
 * depth: real trials, real sacrifice, real wisdom.
 *
 * A new hero surfaces on the home card every day via getDharmVeerOfTheDay().
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { DHARM_VEER_ROSTER_PART_1 } from './dharm-veer-roster/part-1';
import { DHARM_VEER_ROSTER_PART_2 } from './dharm-veer-roster/part-2';
import { DHARM_VEER_ROSTER_PART_3 } from './dharm-veer-roster/part-3';
import { DHARM_VEER_ROSTER_PART_4 } from './dharm-veer-roster/part-4';
import { DHARM_VEER_ROSTER_PART_5 } from './dharm-veer-roster/part-5';
import { DHARM_VEER_ROSTER_PART_6 } from './dharm-veer-roster/part-6';
import { DHARM_VEER_ROSTER_PART_7 } from './dharm-veer-roster/part-7';
import { DHARM_VEER_ROSTER_PART_8 } from './dharm-veer-roster/part-8';
import { DHARM_VEER_ROSTER_PART_9 } from './dharm-veer-roster/part-9';
import { DHARM_VEER_ROSTER_PART_10 } from './dharm-veer-roster/part-10';

export interface DharmVeer {
  id: string;
  name: string;
  nameLocal?: string;
  namePa?: string;
  era: string;
  eraLocal?: string;
  eraPa?: string;
  tradition: 'hindu' | 'sikh' | 'buddhist' | 'jain' | 'sufi' | 'tribal';
  region: string;
  regionLocal?: string;
  regionPa?: string;
  emoji: string;
  tagline: string;
  taglineLocal?: string;
  taglinePa?: string;
  /** 2–3 paragraph account of their life and mission */
  journey: string;
  journeyLocal?: string;
  journeyPa?: string;
  /** The defining test, sacrifice, or trial they endured */
  trial: string;
  trialLocal?: string;
  trialPa?: string;
  /** Their core teaching in plain language */
  teaching: string;
  teachingLocal?: string;
  teachingPa?: string;
  /** The moral for a modern seeker */
  moral: string;
  moralLocal?: string;
  moralPa?: string;
  /** How their legacy shaped the tradition or society */
  legacy?: string;
  legacyLocal?: string;
  legacyPa?: string;
  /** Primary scriptural or historical source */
  source?: string;
  sourceLocal?: string;
  sourcePa?: string;
  /** Detailed canonical citations with book/chapter/parva references */
  sourceCitations?: Array<{
    sourceName: string;
    sourceRef?: string;
    tier?: number;
  }>;
  /** Scene description for illustration — evokes their most iconic moment */
  illustrationPrompt?: string;
  quote?: {
    text: string;
    attribution: string;
  };
  quoteLocal?: {
    text: string;
    attribution: string;
  };
  quotePa?: {
    text: string;
    attribution: string;
  };
}

/**
 * Picks which language's text to show for a given field, given the viewer's
 * resolved local-content language. Punjabi copy falls back to the English
 * source when Punjabi has not been authored; showing Hindi to a Punjabi-
 * preferring reader would misrepresent the selected language.
 */
export function pickDharmVeerLocalizedText(
  english: string | undefined,
  hindi: string | undefined,
  punjabi: string | undefined,
  contentLanguage: 'hi' | 'pa',
): string | undefined {
  if (contentLanguage === 'pa') return punjabi || english;
  return hindi || english;
}

type DharmVeerCardCopySource = Pick<DharmVeer, 'name' | 'tagline'> & {
  id?: string;
  nameLocal?: string | null;
  namePa?: string | null;
  taglineLocal?: string | null;
  taglinePa?: string | null;
  era?: string | null;
  eraLocal?: string | null;
  eraPa?: string | null;
  region?: string | null;
  regionLocal?: string | null;
  regionPa?: string | null;
};

export function getDharmVeerCardCopy(
  hero: DharmVeerCardCopySource,
  language: 'en' | 'hi' | 'pa',
) {
  if (language === 'en') {
    return {
      name: hero.name,
      tagline: hero.tagline,
      era: hero.era,
      region: hero.region,
    };
  }

  // The API roster is authoritative for current English copy, while the
  // bundled reviewed roster can fill a missing localized field on older or
  // partially backfilled server rows.
  const bundled = hero.id ? DHARM_VEERS.find((item) => item.id === hero.id) : undefined;
  const nameLocal = hero.nameLocal || bundled?.nameLocal;
  const namePa = hero.namePa || bundled?.namePa;
  const taglineLocal = hero.taglineLocal || bundled?.taglineLocal;
  const taglinePa = hero.taglinePa || bundled?.taglinePa;
  const era = hero.era || bundled?.era;
  const eraLocal = hero.eraLocal || bundled?.eraLocal;
  const eraPa = hero.eraPa || bundled?.eraPa;
  const region = hero.region || bundled?.region;
  const regionLocal = hero.regionLocal || bundled?.regionLocal;
  const regionPa = hero.regionPa || bundled?.regionPa;
  const contentLanguage = language === 'pa' ? 'pa' : 'hi';
  return {
    name: language === 'pa' ? namePa || nameLocal || hero.name : nameLocal || hero.name,
    tagline: pickDharmVeerLocalizedText(hero.tagline, taglineLocal, taglinePa, contentLanguage),
    era: pickDharmVeerLocalizedText(era, eraLocal, eraPa, contentLanguage),
    region: pickDharmVeerLocalizedText(region, regionLocal, regionPa, contentLanguage),
  };
}

type DharmVeerQuote = { text: string; attribution: string };

/**
 * The hero's quote for the reader's language, chosen as a whole: the Hindi
 * (`quoteLocal`) or Punjabi (`quotePa`) quote when it has both text and
 * attribution, otherwise the English quote. Same rule as
 * pickDharmVeerLocalizedText (Punjabi never falls back to Hindi), and text
 * and attribution always come from the same quote. Used by the reader and
 * the quote card so the two always match.
 */
export function pickDharmVeerQuote(
  hero: { quote?: Partial<DharmVeerQuote>; quoteLocal?: Partial<DharmVeerQuote>; quotePa?: Partial<DharmVeerQuote> },
  contentLanguage: 'en' | 'hi' | 'pa',
): DharmVeerQuote | null {
  const complete = (q: Partial<DharmVeerQuote> | undefined): q is DharmVeerQuote =>
    !!q && typeof q.text === 'string' && q.text.trim().length > 0 && typeof q.attribution === 'string' && q.attribution.trim().length > 0;
  const localized = contentLanguage === 'pa' ? hero.quotePa : contentLanguage === 'hi' ? hero.quoteLocal : undefined;
  if (complete(localized)) return { text: localized.text.trim(), attribution: localized.attribution.trim() };
  if (complete(hero.quote)) return { text: hero.quote.text.trim(), attribution: hero.quote.attribution.trim() };
  return null;
}

// The roster text lives in ./dharm-veer-roster/. Order is data: keep it.
export const DHARM_VEERS: DharmVeer[] = [
  ...DHARM_VEER_ROSTER_PART_1,
  ...DHARM_VEER_ROSTER_PART_2,
  ...DHARM_VEER_ROSTER_PART_3,
  ...DHARM_VEER_ROSTER_PART_4,
  ...DHARM_VEER_ROSTER_PART_5,
  ...DHARM_VEER_ROSTER_PART_6,
  ...DHARM_VEER_ROSTER_PART_7,
  ...DHARM_VEER_ROSTER_PART_8,
  ...DHARM_VEER_ROSTER_PART_9,
  ...DHARM_VEER_ROSTER_PART_10,
];

// ── Tradition Metadata ─────────────────────────────────────────────────────

export const TRADITION_META: Record<string, { label: string; labelLocal: string; dharmVeerLocal: string; emoji: string; color: string }> = {
  hindu:    { label: 'Sanatan Dharma', labelLocal: 'सनातन धर्म', dharmVeerLocal: 'धर्म वीर', emoji: '🪷', color: 'rgba(255, 120, 0, 0.12)' },
  sikh:     { label: 'Sikhi',          labelLocal: 'ਸਿੱਖੀ',     dharmVeerLocal: 'ਧਰਮ ਵੀਰ', emoji: '☬', color: 'rgba(0, 100, 255, 0.12)' },
  buddhist: { label: 'Buddha Dhamma',  labelLocal: 'बुद्ध धम्म', dharmVeerLocal: 'धर्म वीर', emoji: '☸️', color: 'rgba(255, 200, 0, 0.12)' },
  jain:     { label: 'Jain Dharma',    labelLocal: 'जैन धर्म',   dharmVeerLocal: 'धर्म वीर', emoji: '🤲', color: 'rgba(0, 200, 50, 0.12)' },
  sufi:     { label: 'Sufi Path',      labelLocal: 'सूफ़ी मार्ग', dharmVeerLocal: 'धर्म वीर', emoji: '🕊️', color: 'rgba(140, 90, 220, 0.12)' },
  tribal:   { label: 'Adivasi Wisdom', labelLocal: 'आदिवासी ज्ञान', dharmVeerLocal: 'धर्म वीर', emoji: '🌿', color: 'rgba(60, 160, 90, 0.12)' },
};

// ── Rotation logic ─────────────────────────────────────────────────────────

/**
 * Returns the Dharm Veer for today from a given roster. Changes every
 * calendar day. Tradition-aware: shuffles same-tradition heroes higher in
 * the rotation.
 *
 * This is the SAME algorithm (epoch, IST offset, day-index, weighted pool)
 * as web's `selectDharmVeerOfTheDayFromRoster` in
 * `src/lib/dharm-veer-db.ts` — deliberately kept byte-for-byte equivalent
 * so native and web never disagree on "today's hero" for the same roster.
 *
 * Callers should pass the roster fetched from `GET /api/dharm-veer/roster`
 * (the canonical, DB-backed source). `DHARM_VEERS` below is a 12-hero local
 * fixture kept only as a last-resort, explicitly-opted-into fallback — it is
 * intentionally NOT the default `roster` here, so a caller can't silently
 * end up back on stale local content without asking for it by name.
 */
export function selectDharmVeerOfTheDayFromRoster(
  roster: DharmVeer[],
  userTradition?: string | null,
  dateOrDateStr?: string | Date
): DharmVeer {
  const effectiveRoster = roster.length > 0 ? roster : DHARM_VEERS;

  const epoch = new Date('2024-01-01T00:00:00.000Z').getTime();
  let dayN: number;

  if (typeof dateOrDateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateOrDateStr)) {
    const target = new Date(`${dateOrDateStr}T12:00:00.000Z`).getTime();
    dayN = Math.floor((target - epoch) / (1000 * 60 * 60 * 24));
  } else if (dateOrDateStr instanceof Date) {
    dayN = Math.floor((dateOrDateStr.getTime() - epoch) / (1000 * 60 * 60 * 24));
  } else {
    const now   = new Date();
    // Fallback: Use spiritual date (midnight IST offset) so it changes consistently
    const ist   = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    dayN  = Math.floor((ist.getTime() - epoch) / (1000 * 60 * 60 * 24));
  }
  const slot  = dayN; // one hero per day

  if (!userTradition) {
    return effectiveRoster[slot % effectiveRoster.length];
  }

  // Build a weighted pool: same-tradition heroes appear twice, others once.
  // This ensures variety — never stuck cycling only 8 (or 1) heroes.
  const same  = effectiveRoster.filter(h => h.tradition === userTradition);
  const other = effectiveRoster.filter(h => h.tradition !== userTradition);
  const pool  = [...same, ...same, ...other]; // tradition heroes weighted 2×

  return (pool.length > 0 ? pool : effectiveRoster)[slot % (pool.length > 0 ? pool.length : effectiveRoster.length)];
}

/**
 * @deprecated Local-fixture-only rotation. Kept only for reference / true
 * offline fallback callers that have explicitly decided to accept stale,
 * non-canonical content. New code should fetch the roster from
 * `GET /api/dharm-veer/roster` and call `selectDharmVeerOfTheDayFromRoster`
 * instead — see `app/dharm-veer.tsx`.
 */
export function getDharmVeerOfTheDay(userTradition?: string | null): DharmVeer {
  return selectDharmVeerOfTheDayFromRoster(DHARM_VEERS, userTradition);
}

// ── Client-side Rotation logic ─────────────────────────────────────────────

/**
 * Pure function to select a Dharm Veer for the user based on history and tradition.
 * Implements a no-repeat window (default 14) and tradition-awareness.
 */
export function selectDharmVeer({
  userTradition,
  historyIds,
  roster,
  festivalTags = [],
  noRepeatWindow = 14,
}: {
  userTradition?: string | null;
  historyIds: string[];
  roster: DharmVeer[];
  festivalTags?: string[];
  noRepeatWindow?: number;
}): DharmVeer {
  if (roster.length === 0) {
    throw new Error('selectDharmVeer requires a non-empty roster');
  }
  type TaggedDharmVeer = DharmVeer & { tags?: string[] };

  // 1. Separate heroes by tradition
  const sameTradition = roster.filter(h => h.tradition === userTradition);
  const otherTradition = roster.filter(h => h.tradition !== userTradition);

  // 2. Identify recently seen based on window
  const recentIds = new Set(historyIds.slice(-noRepeatWindow));

  // 3. Find candidates not seen recently
  const freshSame = sameTradition.filter(h => !recentIds.has(h.id));
  const freshOther = otherTradition.filter(h => !recentIds.has(h.id));

  // 4. Boost by festival/tags if provided
  if (festivalTags.length > 0) {
    const freshBoosted = [...freshSame, ...freshOther].find(h =>
      festivalTags.some(tag => (h as TaggedDharmVeer).tags?.includes(tag))
    );
    if (freshBoosted) return freshBoosted;
  }

  // 5. Prefer fresh same-tradition heroes
  if (freshSame.length > 0) {
    return freshSame[0]; // Could shuffle deterministically, but first available is fine for a stable roster
  }

  // 6. Occasional cross-tradition (if no fresh same-tradition)
  if (freshOther.length > 0) {
    return freshOther[0];
  }

  // 7. Graceful degradation: roster is exhausted (smaller than no-repeat window).
  // Pick the least recently shown item from their tradition (the one that appeared earliest in history)
  if (sameTradition.length > 0) {
    // Sort sameTradition by index in historyIds (lower index = older)
    // If not in history, index is -1, which shouldn't happen here since freshSame is empty
    const sortedByOldest = [...sameTradition].sort((a, b) => {
      const idxA = historyIds.indexOf(a.id);
      const idxB = historyIds.indexOf(b.id);
      return idxA - idxB;
    });
    return sortedByOldest[0];
  }

  // 8. Absolute fallback
  return roster[0];
}
