// Quote cards (Phase 7 of docs/READER_EXPERIENCE_GRAND_PLAN.md, decision D4).
//
// Content rule: a card is offered only for text that is explicitly a quote,
// with its attribution, from an item that lists a source. Shoonaya's own
// explanations (journey, teaching, moral…) never go on a card as someone's
// words. Text is used exactly as stored; nothing is shortened or rephrased.

export type QuoteCardFormat = 'square' | 'story';
export const QUOTE_CARD_FORMATS: readonly QuoteCardFormat[] = ['square', 'story'];

export type QuoteCardContent = {
  text: string;
  attribution: string;
  /** Source lines shown small under the attribution (never empty). */
  sources: string[];
};

type Quote = { text?: string; attribution?: string } | undefined;

type DharmVeerQuoteSource = {
  quote?: Quote;
  quoteLocal?: Quote;
  quotePa?: Quote;
  source?: string;
  sourceCitations?: ReadonlyArray<{ sourceName: string; sourceRef?: string }>;
};

const has = (value: string | undefined | null): value is string => typeof value === 'string' && value.trim().length > 0;
const complete = (quote: Quote): quote is { text: string; attribution: string } => has(quote?.text) && has(quote?.attribution);

export type QuoteCardTypography = { quoteSize: number; quoteLine: number; attributionSize: number; attributionLine: number };

/**
 * Type size from the text length, so a quote is never cut and the shared
 * image matches the preview (`adjustsFontSizeToFit` shrank the font but not
 * the line height in the captured image). Sized for the longest roster
 * entries: quote 178 and attribution 244 characters (2026-10-08).
 */
export function quoteCardTypography(format: QuoteCardFormat, textLength: number, attributionLength: number): QuoteCardTypography {
  const load = textLength + attributionLength * 0.6;
  const tiers: Array<[number, QuoteCardTypography]> = format === 'square'
    ? [
        [110, { quoteSize: 19, quoteLine: 26, attributionSize: 11, attributionLine: 15 }],
        [170, { quoteSize: 16, quoteLine: 22, attributionSize: 10, attributionLine: 14 }],
        [240, { quoteSize: 14, quoteLine: 19, attributionSize: 9.5, attributionLine: 13 }],
        [Infinity, { quoteSize: 12, quoteLine: 16, attributionSize: 9, attributionLine: 12 }],
      ]
    : [
        [140, { quoteSize: 24, quoteLine: 34, attributionSize: 13, attributionLine: 19 }],
        [220, { quoteSize: 21, quoteLine: 30, attributionSize: 12.5, attributionLine: 18 }],
        [320, { quoteSize: 19, quoteLine: 27, attributionSize: 12, attributionLine: 17 }],
        [Infinity, { quoteSize: 17, quoteLine: 24, attributionSize: 11, attributionLine: 16 }],
      ];
  return tiers.find(([max]) => load <= max)![1];
}

/** Source lines: the citation list when present, otherwise the plain source line. */
export function quoteCardSources(item: Pick<DharmVeerQuoteSource, 'source' | 'sourceCitations'>): string[] {
  const cited = (item.sourceCitations ?? [])
    .filter((c) => has(c.sourceName))
    .map((c) => (has(c.sourceRef) ? `${c.sourceName.trim()} · ${c.sourceRef.trim()}` : c.sourceName.trim()));
  if (cited.length) return cited;
  return has(item.source) ? [item.source.trim()] : [];
}

/**
 * The Dharm Veer quote card for the language being read, or null when the
 * hero has no complete quote or no source. Hindi/Punjabi use that language's
 * quote only when it is complete (text + attribution); otherwise the English
 * quote — the card never mixes a translated text with another attribution.
 */
export function dharmVeerQuoteCard(hero: DharmVeerQuoteSource, language: 'en' | 'hi' | 'pa'): QuoteCardContent | null {
  const sources = quoteCardSources(hero);
  if (!sources.length) return null;
  const localized = language === 'pa' ? hero.quotePa : language === 'hi' ? hero.quoteLocal : undefined;
  const chosen = complete(localized) ? localized : complete(hero.quote) ? hero.quote : null;
  if (!chosen) return null;
  return { text: chosen.text.trim(), attribution: chosen.attribution.trim(), sources };
}
