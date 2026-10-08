import type { DharmVeer } from '@/lib/dharm-veer';
import type { VratData } from '@/lib/vrat-data';
import type { ShoonayaShareCardData } from '@/components/share/ShoonayaShareCard';

export type ReaderShareFormat = 'story' | 'square';

export function buildDharmVeerQuoteShareCard(
  hero: DharmVeer,
  quote: { text: string; attribution: string } | undefined,
  format: ReaderShareFormat,
  display?: { title?: string; subtitle?: string },
): ShoonayaShareCardData | null {
  const citations = hero.sourceCitations?.filter((citation) => citation.sourceName.trim()) ?? [];
  if (!quote?.text.trim() || !quote.attribution.trim() || citations.length === 0) return null;

  const primarySource = citations[0];
  const otherSourceCount = citations.length - 1;
  const source = `${primarySource.sourceName}${primarySource.sourceRef ? ` — ${primarySource.sourceRef}` : ''}${otherSourceCount ? ` (+${otherSourceCount} reference${otherSourceCount === 1 ? '' : 's'})` : ''}`;

  return {
    tradition: hero.tradition,
    format,
    layout: 'sacredText',
    title: display?.title ?? hero.name,
    subtitle: display?.subtitle ?? hero.tagline,
    source,
    headlineValue: quote.text.trim(),
    caption: `— ${quote.attribution.trim()}`,
    footer: 'Shared from Shoonaya',
  };
}

export function buildVratMantraShareCard(
  vrat: VratData,
  mantra: string,
  format: ReaderShareFormat,
  language: 'en' | 'hi' = 'en',
): ShoonayaShareCardData | null {
  const citation = vrat.mantraSourceCitations?.[language];
  if (!mantra.trim() || !citation?.sourceName.trim()) return null;

  return {
    tradition: 'universal',
    format,
    layout: 'sacredText',
    title: vrat.name,
    subtitle: vrat.tagline,
    source: `${citation.sourceName}${citation.sourceRef ? ` — ${citation.sourceRef}` : ''}`,
    headlineValue: mantra.trim(),
    footer: 'Shared from Shoonaya',
  };
}
