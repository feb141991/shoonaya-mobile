import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Node.js test environment polyfill for AsyncStorage
const memoryStore = new Map<string, string>();
if (typeof window === 'undefined' || !(window as any).localStorage) {
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => memoryStore.get(key) ?? null,
      setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
      removeItem: (key: string) => memoryStore.delete(key),
      clear: () => memoryStore.clear(),
      get length() {
        return memoryStore.size;
      },
      key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
    },
  };
}

import { DHARM_VEERS } from '@/lib/dharm-veer';
import { VRAT_DATABASE } from '@/lib/vrat-data';
import {
  getDharmVeerChapters,
  getVratChapters,
  type ReaderChapter,
  type KathaPayload,
} from '@/lib/readerChapters';
import {
  getReaderLayoutMode,
  setReaderLayoutMode,
  clearReaderPrefs,
} from '@/lib/readerPrefs';

const chapterFolioViewSource = readFileSync(new URL('../components/reader/ChapterFolioView.tsx', import.meta.url), 'utf8');
const readerShellSource = readFileSync(new URL('../components/reader/ReaderShell.tsx', import.meta.url), 'utf8');
const readerSettingsSheetSource = readFileSync(new URL('../components/reader/ReaderSettingsSheet.tsx', import.meta.url), 'utf8');
const dharmVeerScreenSource = readFileSync(new URL('../app/dharm-veer/[id].tsx', import.meta.url), 'utf8');
const vratScreenSource = readFileSync(new URL('../app/vrat/[slug].tsx', import.meta.url), 'utf8');

describe('Reader Experience Phase 6 - Chapter Layout & Folio Engine', () => {
  beforeEach(() => {
    memoryStore.clear();
  });

  it('guarantees all 76 Dharm Veer heroes render strictly valid, non-empty chapters in exact sequence', () => {
    assert.equal(DHARM_VEERS.length, 76, 'Expected 76 cornerstone heroes in roster');

    for (const hero of DHARM_VEERS) {
      const chapters = getDharmVeerChapters(hero, 'en');

      // Every hero in the canonical roster has journey, trial, teaching, legacy, and moral
      assert.ok(chapters.length >= 4, `Hero ${hero.id} must have at least 4 chapters`);
      assert.equal(chapters[0].type, 'journey', `Hero ${hero.id} chapter 1 must be journey`);
      assert.equal(chapters[1].type, 'trial', `Hero ${hero.id} chapter 2 must be trial`);
      assert.equal(chapters[2].type, 'teaching', `Hero ${hero.id} chapter 3 must be teaching`);

      if (chapters.length === 5) {
        assert.equal(chapters[3].type, 'legacy', `Hero ${hero.id} chapter 4 must be legacy`);
        assert.equal(chapters[4].type, 'moral', `Hero ${hero.id} chapter 5 must be moral`);
      } else {
        assert.equal(chapters[3].type, 'moral', `Hero ${hero.id} chapter 4 must be moral`);
      }

      // No chapter may have empty content
      for (const ch of chapters) {
        assert.ok(ch.title && ch.title.trim().length > 0, `Chapter ${ch.id} on hero ${hero.id} missing title`);
        assert.ok(ch.content && ch.content.trim().length > 0, `Chapter ${ch.id} on hero ${hero.id} has empty content`);
        assert.ok(ch.stageLabel && ch.stageLabel.includes(String(chapters.length)), `Stage label must include total chapters`);
      }

      // Final moral chapter must close on quote + attribution and cite source
      const moralChapter = chapters[chapters.length - 1];
      assert.ok(moralChapter.quote, `Hero ${hero.id} moral chapter must include quote`);
      assert.ok(moralChapter.quote?.text, `Hero ${hero.id} quote text must be non-empty`);
      assert.ok(moralChapter.quote?.attribution, `Hero ${hero.id} quote attribution must be non-empty`);
      assert.ok(hero.sourceCitations && hero.sourceCitations.length > 0, `Hero ${hero.id} must have source citations`);
      assert.equal(moralChapter.sourceCitations?.length, hero.sourceCitations.length);
    }
  });

  it('labels fallback English chapters visibly when localized translation is unauthored', () => {
    // Find hero with Punjabi translations and one without
    const sikhHero = DHARM_VEERS.find((h) => h.tradition === 'sikh' && h.journeyPa);
    const nonSikhHero = DHARM_VEERS.find((h) => h.tradition !== 'sikh' && !h.journeyPa);

    assert.ok(sikhHero, 'Expected at least one hero with authored Punjabi content');
    assert.ok(nonSikhHero, 'Expected at least one hero without authored Punjabi content');

    const sikhChapters = getDharmVeerChapters(sikhHero, 'pa');
    assert.equal(sikhChapters[0].isFallbackEnglish, false, 'Authored Punjabi journey must not be marked as fallback');
    assert.equal(sikhChapters[0].title, 'ਜੀਵਨ ਯਾਤਰਾ');

    const fallbackChapters = getDharmVeerChapters(nonSikhHero, 'pa');
    assert.equal(fallbackChapters[0].isFallbackEnglish, true, 'Unauthored Punjabi journey must fallback to English and be flagged');
    assert.equal(fallbackChapters[0].content, nonSikhHero.journey);
  });

  it('guarantees all 8 Vrats render non-empty chapters in canonical order with no empty page', () => {
    const vratKeys = Object.keys(VRAT_DATABASE);
    assert.equal(vratKeys.length, 8, 'Expected 8 canonical vrats in database');

    for (const key of vratKeys) {
      const vrat = VRAT_DATABASE[key];
      const chapters = getVratChapters(vrat, 'en');

      assert.ok(chapters.length >= 3, `Vrat ${key} must have at least 3 chapters`);
      assert.equal(chapters[0].type, 'significance', `Vrat ${key} chapter 1 must be significance`);
      assert.equal(chapters[1].type, 'practice', `Vrat ${key} chapter 2 must be practice`);

      // Verify no chapter has empty text or empty list
      for (const ch of chapters) {
        assert.ok(ch.title && ch.title.trim().length > 0, `Vrat ${key} chapter ${ch.id} missing title`);
        if (ch.type === 'dos-donts') {
          const hasItems = (ch.dos && ch.dos.length > 0) || (ch.donts && ch.donts.length > 0);
          assert.ok(hasItems, `Vrat ${key} dos-donts chapter must contain at least one item`);
        } else {
          assert.ok(ch.content && ch.content.trim().length > 0, `Vrat ${key} chapter ${ch.id} has empty content`);
        }
      }

      // Check practice chapter captures fasting type when present
      const practiceCh = chapters.find((c) => c.type === 'practice');
      if (vrat.fastingType) {
        assert.equal(practiceCh?.fastingType, vrat.fastingType, `Vrat ${key} practice chapter should include fastingType`);
      }
    }
  });

  it('omits dos-donts chapter for vrats that do not author guidelines (puranmashi, uposatha)', () => {
    const puranmashi = VRAT_DATABASE['puranmashi'];
    const chapters = getVratChapters(puranmashi, 'en');

    const hasDosDonts = chapters.some((c) => c.type === 'dos-donts');
    assert.equal(hasDosDonts, false, 'Puranmashi without dos/donts must not render an empty dos-donts chapter');
    assert.equal(chapters.length, 3, 'Expected 3 chapters: significance, practice, mantra');
  });

  it('integrates linked katha paragraphs cleanly into Vrat chapter 5 without new paragraph splits', () => {
    const ekadashi = VRAT_DATABASE['ekadashi'];
    const mockKatha: KathaPayload = {
      id: 'katha-ekadashi-mock',
      title: 'Mokshada Ekadashi Mahatmya',
      titleHi: 'मोक्षदा एकादशी महात्म्य',
      body: [
        'In the golden era of Satya Yuga, King Vaikhanasa ruled the realm of Champaka with righteous wisdom.',
        'Deep within the sacred hermitage of Sage Parvata, the secret remedy for his fathers salvation was revealed.',
      ],
      bodyHi: [
        'सत्ययुग में चम्पक नगरी में राजा वैखानस धर्मपूर्वक प्रजा का पालन करते थे।',
        'पर्वत मुनि के पावन आश्रम में जाकर उन्होंने पितरों के उद्धार का उपाय जाना।',
      ],
    };

    const chapters = getVratChapters(ekadashi, 'en', mockKatha);
    assert.equal(chapters.length, 5, 'Ekadashi with linked katha should have 5 chapters');
    const kathaCh = chapters[4];
    assert.equal(kathaCh.type, 'katha');
    assert.equal(kathaCh.title, 'Mokshada Ekadashi Mahatmya');
    assert.equal(kathaCh.paragraphs?.length, 2);
    assert.equal(kathaCh.paragraphs?.[0], mockKatha.body[0]);

    // Test in Hindi
    const chaptersHi = getVratChapters(ekadashi, 'hi', mockKatha);
    const kathaChHi = chaptersHi[4];
    assert.equal(kathaChHi.title, 'मोक्षदा एकादशी महात्म्य');
    assert.equal(kathaChHi.paragraphs?.[0], mockKatha.bodyHi?.[0]);
  });

  it('persists and clears reader layout mode preference across sessions', async () => {
    // Default layout mode is 'chapters'
    const defaultMode = await getReaderLayoutMode();
    assert.equal(defaultMode, 'chapters');

    // Persist 'continuous'
    await setReaderLayoutMode('continuous');
    const updatedMode = await getReaderLayoutMode();
    assert.equal(updatedMode, 'continuous');

    // Swept by clearReaderPrefs
    await clearReaderPrefs();
    const sweptMode = await getReaderLayoutMode();
    assert.equal(sweptMode, 'chapters');
  });

  it('verifies ChapterFolioView structure, touch targets, and accessibility', () => {
    // Verifies beads and stage indicator
    assert.match(chapterFolioViewSource, /styles\.beadsContainer/);
    assert.match(chapterFolioViewSource, /styles\.topStageBar/);

    // Verifies minimum 44 pt touch target for interactive controls
    assert.match(chapterFolioViewSource, /minHeight:\s*44/);
    assert.match(chapterFolioViewSource, /accessibilityLabel="Go to previous chapter"/);
    assert.match(chapterFolioViewSource, /accessibilityLabel="Go to next chapter"/);

    // Verifies pagingEnabled on horizontal ScrollView
    assert.match(chapterFolioViewSource, /horizontal/);
    assert.match(chapterFolioViewSource, /pagingEnabled/);
  });

  it('wires ChapterFolioView and layoutMode into Dharm Veer and Vrat screens', () => {
    // Dharm Veer screen wiring
    assert.match(dharmVeerScreenSource, /<ChapterFolioView/);
    assert.match(dharmVeerScreenSource, /getDharmVeerChapters/);
    assert.match(dharmVeerScreenSource, /activeSectionIndex=\{activeChapterIndex\}/);
    assert.match(dharmVeerScreenSource, /layoutMode=\{layoutMode\}/);
    assert.match(dharmVeerScreenSource, /onSelectLayoutMode=\{handleSelectLayoutMode\}/);

    // Vrat screen wiring
    assert.match(vratScreenSource, /<ChapterFolioView/);
    assert.match(vratScreenSource, /getVratChapters/);
    assert.match(vratScreenSource, /activeSectionIndex=\{activeChapterIndex\}/);
    assert.match(vratScreenSource, /layoutMode=\{layoutMode\}/);
    assert.match(vratScreenSource, /onSelectLayoutMode=\{handleSelectLayoutMode\}/);

    // ReaderSettingsSheet wiring
    assert.match(readerSettingsSheetSource, /Layout Style/);
    assert.match(readerSettingsSheetSource, /Folio Chapters/);
    assert.match(readerSettingsSheetSource, /Continuous/);
  });
});
