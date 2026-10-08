import type { DharmVeer } from '@/lib/dharm-veer';
import type { VratData } from '@/lib/vrat-data';

export type ChapterType =
  | 'journey'
  | 'trial'
  | 'teaching'
  | 'legacy'
  | 'moral'
  | 'significance'
  | 'practice'
  | 'dos-donts'
  | 'mantra'
  | 'katha';

export interface ChapterQuote {
  text: string;
  attribution: string;
  isFallbackEnglish?: boolean;
}

export interface ChapterSourceCitation {
  sourceName: string;
  sourceRef?: string;
  tier?: number;
}

export interface ReaderChapter {
  id: string;
  type: ChapterType;
  title: string;
  stageLabel: string;
  iconName: string;
  content?: string;
  paragraphs?: string[];
  isFallbackEnglish?: boolean;
  quote?: ChapterQuote;
  sourceText?: string;
  sourceCitations?: ChapterSourceCitation[];
  fastingType?: string;
  breakFastTime?: string;
  dos?: string[];
  donts?: string[];
}

export interface KathaPayload {
  id: string;
  title: string;
  titleHi?: string;
  titlePa?: string;
  body: string[];
  bodyHi?: string[];
  bodyPa?: string[];
  phal?: string;
  phalHi?: string;
  phalPa?: string;
}

/**
 * Returns localized chapter titles for Dharm Veer narrative stages.
 */
function getDharmVeerStageTitles(language: 'en' | 'hi' | 'pa') {
  if (language === 'hi') {
    return {
      journey: 'जीवन यात्रा',
      trial: 'धर्म की परीक्षा',
      teaching: 'ज्ञान व शिक्षा',
      legacy: 'युगांतरकारी प्रभाव',
      moral: 'सार व नीति',
      chapterOf: (current: number, total: number) => `अध्याय ${current} / ${total}`,
    };
  }
  if (language === 'pa') {
    return {
      journey: 'ਜੀਵਨ ਯਾਤਰਾ',
      trial: 'ਧਰਮ ਦੀ ਕਸੌਟੀ',
      teaching: 'ਸਿੱਖਿਆ ਤੇ ਗਿਆਨ',
      legacy: 'ਇਤਿਹਾਸਕ ਵਿਰਾਸਤ',
      moral: 'ਸਾਰ ਤੇ ਸਿੱਖਿਆ',
      chapterOf: (current: number, total: number) => `ਅਧਿਆਇ ${current} / ${total}`,
    };
  }
  return {
    journey: 'The Journey',
    trial: 'Test of Dharma',
    teaching: 'Wisdom & Teaching',
    legacy: 'Living Legacy',
    moral: 'Essence & Moral',
    chapterOf: (current: number, total: number) => `Chapter ${current} of ${total}`,
  };
}

/**
 * Builds canonical chapters for a Dharm Veer hero.
 * Strict sequence:
 * 1. Journey
 * 2. Trial
 * 3. Teaching
 * 4. Legacy (when present and non-empty)
 * 5. Moral (closing on quote + attribution + sources)
 */
export function getDharmVeerChapters(
  hero: DharmVeer,
  language: 'en' | 'hi' | 'pa' = 'en'
): ReaderChapter[] {
  const titles = getDharmVeerStageTitles(language);
  const chapters: ReaderChapter[] = [];

  // Helper to resolve localized text with English fallback and tracking
  const resolveField = (
    enVal?: string,
    hiVal?: string,
    paVal?: string
  ): { text: string; isFallbackEnglish: boolean } => {
    if (language === 'pa') {
      if (paVal && paVal.trim()) {
        return { text: paVal.trim(), isFallbackEnglish: false };
      }
      return { text: (enVal || '').trim(), isFallbackEnglish: true };
    }
    if (language === 'hi') {
      if (hiVal && hiVal.trim()) {
        return { text: hiVal.trim(), isFallbackEnglish: false };
      }
      return { text: (enVal || '').trim(), isFallbackEnglish: true };
    }
    return { text: (enVal || '').trim(), isFallbackEnglish: false };
  };

  // 1. Journey
  const journey = resolveField(hero.journey, hero.journeyLocal, hero.journeyPa);
  if (journey.text) {
    chapters.push({
      id: 'journey',
      type: 'journey',
      title: titles.journey,
      stageLabel: '', // Set in second pass once total is known
      iconName: 'book-open',
      content: journey.text,
      isFallbackEnglish: journey.isFallbackEnglish,
    });
  }

  // 2. Trial
  const trial = resolveField(hero.trial, hero.trialLocal, hero.trialPa);
  if (trial.text) {
    chapters.push({
      id: 'trial',
      type: 'trial',
      title: titles.trial,
      stageLabel: '',
      iconName: 'shield',
      content: trial.text,
      isFallbackEnglish: trial.isFallbackEnglish,
    });
  }

  // 3. Teaching
  const teaching = resolveField(hero.teaching, hero.teachingLocal, hero.teachingPa);
  if (teaching.text) {
    chapters.push({
      id: 'teaching',
      type: 'teaching',
      title: titles.teaching,
      stageLabel: '',
      iconName: 'target',
      content: teaching.text,
      isFallbackEnglish: teaching.isFallbackEnglish,
    });
  }

  // 4. Legacy (only when present and non-empty)
  const legacy = resolveField(hero.legacy, hero.legacyLocal, hero.legacyPa);
  if (legacy.text) {
    chapters.push({
      id: 'legacy',
      type: 'legacy',
      title: titles.legacy,
      stageLabel: '',
      iconName: 'award',
      content: legacy.text,
      isFallbackEnglish: legacy.isFallbackEnglish,
    });
  }

  // 5. Moral (closing on quote + attribution + source citations)
  const moral = resolveField(hero.moral, hero.moralLocal, hero.moralPa);
  if (moral.text) {
    // Resolve quote
    let quote: ChapterQuote | undefined;
    if (language === 'pa' && hero.quotePa?.text) {
      quote = {
        text: hero.quotePa.text,
        attribution: hero.quotePa.attribution,
        isFallbackEnglish: false,
      };
    } else if (language === 'hi' && hero.quoteLocal?.text) {
      quote = {
        text: hero.quoteLocal.text,
        attribution: hero.quoteLocal.attribution,
        isFallbackEnglish: false,
      };
    } else if (hero.quote?.text) {
      quote = {
        text: hero.quote.text,
        attribution: hero.quote.attribution,
        isFallbackEnglish: language !== 'en',
      };
    }

    // Resolve source
    const source = resolveField(hero.source, hero.sourceLocal, hero.sourcePa);

    chapters.push({
      id: 'moral',
      type: 'moral',
      title: titles.moral,
      stageLabel: '',
      iconName: 'feather',
      content: moral.text,
      isFallbackEnglish: moral.isFallbackEnglish,
      quote,
      sourceText: source.text || undefined,
      sourceCitations: hero.sourceCitations ?? [],
    });
  }

  // Populate stage labels with exact chapter denominator
  const total = chapters.length;
  for (let i = 0; i < total; i++) {
    chapters[i].stageLabel = titles.chapterOf(i + 1, total);
  }

  return chapters;
}

/**
 * Returns localized chapter titles for Vrat sections.
 */
function getVratStageTitles(language: 'en' | 'hi' | 'pa') {
  if (language === 'hi') {
    return {
      significance: 'पावन महत्व',
      practice: 'व्रत विधि व नियम',
      dosDonts: 'करणीय व वर्जनीय नियम',
      mantra: 'पवित्र मंत्र',
      katha: 'व्रत कथा',
      chapterOf: (current: number, total: number) => `भाग ${current} / ${total}`,
    };
  }
  if (language === 'pa') {
    return {
      significance: 'ਪਵਿੱਤਰ ਮਹੱਤਵ',
      practice: 'ਵਰਤ ਨਿਯਮ ਤੇ ਵਿਧੀ',
      dosDonts: 'ਕਰਨ ਯੋਗ ਅਤੇ ਮਨਾਹੀਆਂ',
      mantra: 'ਪਵਿੱਤਰ ਮੰਤਰ',
      katha: 'ਵਰਤ ਕਥਾ',
      chapterOf: (current: number, total: number) => `ਭਾਗ ${current} / ${total}`,
    };
  }
  return {
    significance: 'Significance',
    practice: 'Practice Rules',
    dosDonts: "Do's & Don'ts",
    mantra: 'Sacred Mantra',
    katha: 'Vrat Katha',
    chapterOf: (current: number, total: number) => `Part ${current} of ${total}`,
  };
}

/**
 * Builds canonical chapters for a Vrat.
 * Strict sequence:
 * 1. Significance
 * 2. Practice Rules
 * 3. Do's & Don'ts (when present)
 * 4. Sacred Mantra (when present)
 * 5. Katha (when linked and provided)
 */
export function getVratChapters(
  vrat: VratData,
  language: 'en' | 'hi' | 'pa' = 'en',
  linkedKatha?: KathaPayload | null
): ReaderChapter[] {
  const titles = getVratStageTitles(language);
  const chapters: ReaderChapter[] = [];

  // Helper for text localization
  const resolveText = (
    enVal?: string,
    hiVal?: string
  ): { text: string; isFallbackEnglish: boolean } => {
    if (language === 'hi' && hiVal && hiVal.trim()) {
      return { text: hiVal.trim(), isFallbackEnglish: false };
    }
    const fallback = (enVal || '').trim();
    return { text: fallback, isFallbackEnglish: language !== 'en' && !!fallback };
  };

  // Helper for arrays
  const resolveArray = (
    enArr?: string[],
    hiArr?: string[]
  ): string[] => {
    if (language === 'hi' && hiArr && hiArr.length > 0) {
      return hiArr;
    }
    return enArr ?? [];
  };

  // 1. Significance
  const significance = resolveText(vrat.significance, vrat.significanceLocal);
  if (significance.text) {
    chapters.push({
      id: 'significance',
      type: 'significance',
      title: titles.significance,
      stageLabel: '',
      iconName: 'sun',
      content: significance.text,
      isFallbackEnglish: significance.isFallbackEnglish,
    });
  }

  // 2. Practice Rules
  const practice = resolveText(vrat.practice, vrat.practiceLocal);
  if (practice.text) {
    const breakFastTime = language === 'hi' && vrat.breakFastTimeLocal
      ? vrat.breakFastTimeLocal
      : vrat.breakFastTime;

    chapters.push({
      id: 'practice',
      type: 'practice',
      title: titles.practice,
      stageLabel: '',
      iconName: 'check-circle',
      content: practice.text,
      isFallbackEnglish: practice.isFallbackEnglish,
      fastingType: vrat.fastingType,
      breakFastTime,
    });
  }

  // 3. Do's & Don'ts (only when present)
  const dos = resolveArray(vrat.dos, vrat.dosLocal);
  const donts = resolveArray(vrat.donts, vrat.dontsLocal);
  if (dos.length > 0 || donts.length > 0) {
    chapters.push({
      id: 'dos-donts',
      type: 'dos-donts',
      title: titles.dosDonts,
      stageLabel: '',
      iconName: 'list',
      dos,
      donts,
      isFallbackEnglish: language === 'hi' && (!vrat.dosLocal?.length && !vrat.dontsLocal?.length),
    });
  }

  // 4. Sacred Mantra (when present)
  const mantra = resolveText(vrat.mantra, vrat.mantraLocal);
  if (mantra.text) {
    chapters.push({
      id: 'mantra',
      type: 'mantra',
      title: titles.mantra,
      stageLabel: '',
      iconName: 'disc',
      content: mantra.text,
      isFallbackEnglish: mantra.isFallbackEnglish,
    });
  }

  // 5. Katha (when linked and payload available)
  if (vrat.kathaId && linkedKatha) {
    let kathaParagraphs: string[] = [];
    let isFallback = false;

    if (language === 'hi' && linkedKatha.bodyHi?.length) {
      kathaParagraphs = linkedKatha.bodyHi;
    } else if (language === 'pa' && linkedKatha.bodyPa?.length) {
      kathaParagraphs = linkedKatha.bodyPa;
    } else if (linkedKatha.body?.length) {
      kathaParagraphs = linkedKatha.body;
      isFallback = language !== 'en';
    }

    if (kathaParagraphs.length > 0) {
      const kathaTitle = (language === 'hi' && linkedKatha.titleHi)
        ? linkedKatha.titleHi
        : (language === 'pa' && linkedKatha.titlePa)
          ? linkedKatha.titlePa
          : linkedKatha.title || titles.katha;

      chapters.push({
        id: 'katha',
        type: 'katha',
        title: kathaTitle,
        stageLabel: '',
        iconName: 'book',
        paragraphs: kathaParagraphs,
        isFallbackEnglish: isFallback,
      });
    }
  }

  // Populate stage labels with exact chapter denominator
  const total = chapters.length;
  for (let i = 0; i < total; i++) {
    chapters[i].stageLabel = titles.chapterOf(i + 1, total);
  }

  return chapters;
}
