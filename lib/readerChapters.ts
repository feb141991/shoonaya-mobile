// Chapter lists for the chaptered reader (Phase 6 of
// docs/READER_EXPERIENCE_GRAND_PLAN.md).
//
// Content rule (plan §3): chapters come only from fields that already exist,
// in a fixed order, and a chapter exists only when its field has text. No
// text is split, generated or translated here. When the reader asked for
// Hindi/Punjabi and a field has no translation, the English text is shown
// and the chapter is flagged `fallback` so the screen can label it "English"
// (never machine-filled).

export type ChapterLanguage = 'en' | 'hi' | 'pa';

export type ReaderChapter<Key extends string> = {
  key: Key;
  /** English text was used because the translation does not exist. */
  fallback: boolean;
};

const has = (value: string | undefined | null): value is string => typeof value === 'string' && value.trim().length > 0;
const hasList = (value: readonly string[] | undefined | null): value is readonly string[] => Array.isArray(value) && value.some(has);

// ── Dharm Veer ──────────────────────────────────────────────────────────

export type DharmVeerChapterKey = 'journey' | 'trial' | 'teaching' | 'legacy' | 'moral';
export const DHARM_VEER_CHAPTER_ORDER: readonly DharmVeerChapterKey[] = ['journey', 'trial', 'teaching', 'legacy', 'moral'];

type LocalizedFields = Partial<Record<DharmVeerChapterKey | `${DharmVeerChapterKey}Local` | `${DharmVeerChapterKey}Pa`, string>>;

export type DharmVeerChapter = ReaderChapter<DharmVeerChapterKey> & { text: string };

/**
 * Journey · Trial · Teaching · Legacy (when present) · Moral. Hindi uses the
 * `*Local` fields and Punjabi the `*Pa` fields, matching
 * pickDharmVeerLocalizedText (Punjabi never falls back to Hindi).
 */
export function buildDharmVeerChapters(hero: LocalizedFields, language: ChapterLanguage): DharmVeerChapter[] {
  const chapters: DharmVeerChapter[] = [];
  for (const key of DHARM_VEER_CHAPTER_ORDER) {
    const english = hero[key];
    if (!has(english)) continue;
    const translated = language === 'hi' ? hero[`${key}Local`] : language === 'pa' ? hero[`${key}Pa`] : undefined;
    const useTranslation = language !== 'en' && has(translated);
    chapters.push({
      key,
      text: useTranslation ? (translated as string) : english,
      fallback: language !== 'en' && !useTranslation,
    });
  }
  return chapters;
}

// ── Vrat ────────────────────────────────────────────────────────────────

export type VratChapterKey = 'significance' | 'practice' | 'dosDonts' | 'mantra' | 'katha';

type VratChapterSource = {
  significance?: string;
  significanceLocal?: string;
  practice?: string;
  practiceLocal?: string;
  fastingType?: string;
  breakFastTime?: string;
  dos?: readonly string[];
  dosLocal?: readonly string[];
  donts?: readonly string[];
  dontsLocal?: readonly string[];
  mantra?: string;
  mantraLocal?: string;
};

/** The linked katha, once loaded (Vrat `kathaId`). */
export type LinkedKathaSource = { body?: readonly string[]; bodyHi?: readonly string[] };

/**
 * Significance · Practice (with fast type and parana) · Do's & Don'ts ·
 * Mantra · Katha (only when the linked katha has been loaded and has text).
 * Vrat data is English + Hindi only; `hindi` is the screen's "show Hindi".
 */
export function buildVratChapters(vrat: VratChapterSource, hindi: boolean, katha?: LinkedKathaSource | null): ReaderChapter<VratChapterKey>[] {
  const chapters: ReaderChapter<VratChapterKey>[] = [];
  if (has(vrat.significance)) {
    chapters.push({ key: 'significance', fallback: hindi && !has(vrat.significanceLocal) });
  }
  if (has(vrat.practice) || has(vrat.fastingType) || has(vrat.breakFastTime)) {
    chapters.push({ key: 'practice', fallback: hindi && has(vrat.practice) && !has(vrat.practiceLocal) });
  }
  if (hasList(vrat.dos) || hasList(vrat.donts)) {
    const dosFallback = hasList(vrat.dos) && !hasList(vrat.dosLocal);
    const dontsFallback = hasList(vrat.donts) && !hasList(vrat.dontsLocal);
    chapters.push({ key: 'dosDonts', fallback: hindi && (dosFallback || dontsFallback) });
  }
  if (has(vrat.mantra)) {
    chapters.push({ key: 'mantra', fallback: hindi && !has(vrat.mantraLocal) });
  }
  if (katha && hasList(katha.body)) {
    chapters.push({ key: 'katha', fallback: hindi && !hasList(katha.bodyHi) });
  }
  return chapters;
}

/**
 * Whether a reader shows one chapter per page. ReaderShell and the screen
 * both call this with the same reader pref, so they always agree.
 */
export function usesChapterLayout(layout: 'chapters' | 'scroll', chapterCount: number) {
  return layout === 'chapters' && chapterCount > 1;
}

/** Keeps a chapter index valid when the list changes (language switch, katha loaded). */
export function clampChapterIndex(index: number, count: number) {
  if (count <= 0) return 0;
  return Math.min(Math.max(0, Math.trunc(index)), count - 1);
}
