import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { DHARM_VEERS, pickDharmVeerLocalizedText } from '../lib/dharm-veer';
import { VRAT_DATABASE } from '../lib/vrat-data';
import {
  DHARM_VEER_CHAPTER_ORDER,
  buildDharmVeerChapters,
  buildVratChapters,
  clampChapterIndex,
  usesChapterLayout,
} from '../lib/readerChapters';
import { chapterSwipe } from '../lib/readerChrome';

// Phase 6 (docs/READER_EXPERIENCE_GRAND_PLAN.md): chapters come only from
// existing fields; every hero and every vrat renders all its chapters with no
// empty page; a missing translation shows English, flagged for the label.

const filled = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const filledList = (value: unknown) => Array.isArray(value) && value.some(filled);

test('every Dharm Veer: chapters are exactly its non-empty story fields, in order, in all three languages', () => {
  assert.ok(DHARM_VEERS.length >= 76, `roster size ${DHARM_VEERS.length}`);
  for (const hero of DHARM_VEERS) {
    const expected = DHARM_VEER_CHAPTER_ORDER.filter((key) => filled(hero[key]));
    for (const language of ['en', 'hi', 'pa'] as const) {
      const chapters = buildDharmVeerChapters(hero, language);
      assert.deepEqual(chapters.map((c) => c.key), expected, `${hero.id} ${language}`);
      assert.equal(chapters[0].key, 'journey', `${hero.id} opens with the journey`);
      assert.equal(chapters.at(-1)?.key, 'moral', `${hero.id} closes with the moral`);
      for (const chapter of chapters) {
        assert.ok(chapter.text.trim().length > 0, `${hero.id} ${language} ${chapter.key} is not empty`);
        // Same text the one-page layout shows (pickDharmVeerLocalizedText).
        const shown = language === 'en'
          ? hero[chapter.key]
          : pickDharmVeerLocalizedText(hero[chapter.key], hero[`${chapter.key}Local`], hero[`${chapter.key}Pa`], language);
        assert.equal(chapter.text, shown, `${hero.id} ${language} ${chapter.key} text`);
        const translated = language === 'hi' ? hero[`${chapter.key}Local`] : language === 'pa' ? hero[`${chapter.key}Pa`] : 'n/a';
        assert.equal(chapter.fallback, language !== 'en' && !filled(translated), `${hero.id} ${language} ${chapter.key} fallback flag`);
      }
    }
  }
});

test('Dharm Veer: Punjabi never borrows Hindi; a missing Punjabi chapter is English and flagged', () => {
  const chapters = buildDharmVeerChapters({ journey: 'J', journeyLocal: 'जे', trial: 'T', teaching: 'Te', moral: 'M', moralPa: 'ਮ' }, 'pa');
  assert.deepEqual(chapters, [
    { key: 'journey', text: 'J', fallback: true },
    { key: 'trial', text: 'T', fallback: true },
    { key: 'teaching', text: 'Te', fallback: true },
    { key: 'moral', text: 'ਮ', fallback: false },
  ]);
});

test('every vrat: chapters are exactly its non-empty sections; no katha chapter until the katha has text', () => {
  const entries = Object.values(VRAT_DATABASE);
  assert.ok(entries.length > 0);
  for (const vrat of entries) {
    const expected = [
      filled(vrat.significance) ? 'significance' : null,
      filled(vrat.practice) || filled(vrat.fastingType) || filled(vrat.breakFastTime) ? 'practice' : null,
      filledList(vrat.dos) || filledList(vrat.donts) ? 'dosDonts' : null,
      filled(vrat.mantra) ? 'mantra' : null,
    ].filter(Boolean);
    for (const hindi of [false, true]) {
      assert.deepEqual(buildVratChapters(vrat, hindi).map((c) => c.key), expected, `${vrat.id} hindi=${hindi}`);
      assert.deepEqual(buildVratChapters(vrat, hindi, { body: [] }).map((c) => c.key), expected, `${vrat.id} empty katha adds no page`);
      const withKatha = buildVratChapters(vrat, hindi, { body: ['Once upon a time'] });
      assert.deepEqual(withKatha.map((c) => c.key), [...expected, 'katha'], `${vrat.id} katha last`);
      if (!hindi) assert.ok(withKatha.every((c) => !c.fallback), `${vrat.id} English is never a fallback`);
    }
  }
});

test('Vrat: Hindi page flags only the sections that have no Hindi text', () => {
  const chapters = buildVratChapters(
    { significance: 'S', significanceLocal: 'स', practice: 'P', dos: ['d'], dosLocal: ['द'], donts: ['x'], mantra: 'Om', mantraLocal: 'ॐ' },
    true,
    { body: ['b'], bodyHi: [] },
  );
  assert.deepEqual(chapters, [
    { key: 'significance', fallback: false },
    { key: 'practice', fallback: true },
    { key: 'dosDonts', fallback: true },
    { key: 'mantra', fallback: false },
    { key: 'katha', fallback: true },
  ]);
});

test('chapter layout applies only with the chapters pref and more than one chapter', () => {
  assert.equal(usesChapterLayout('chapters', 5), true);
  assert.equal(usesChapterLayout('chapters', 1), false);
  assert.equal(usesChapterLayout('scroll', 5), false);
  assert.deepEqual([-1, 0, 2, 4, 9, 2.7].map((i) => clampChapterIndex(i, 5)), [0, 0, 2, 4, 4, 2]);
  assert.equal(clampChapterIndex(3, 0), 0);
});

test('chapterSwipe: quick horizontal swipes turn chapters; scrolls, slow drags and edge-back swipes do not', () => {
  const at = (x: number, y: number, t: number) => ({ x, y, t });
  assert.equal(chapterSwipe(at(300, 400, 0), at(150, 410, 250)), 1);
  assert.equal(chapterSwipe(at(100, 400, 0), at(260, 390, 250)), -1);
  assert.equal(chapterSwipe(at(200, 400, 0), at(150, 400, 250)), 0, 'too short');
  assert.equal(chapterSwipe(at(300, 400, 0), at(200, 250, 250)), 0, 'mostly vertical (a scroll)');
  assert.equal(chapterSwipe(at(300, 400, 0), at(100, 400, 900)), 0, 'too slow');
  assert.equal(chapterSwipe(at(10, 400, 0), at(250, 400, 200)), 0, 'left-edge back gesture');
});

test('Dharm Veer and Vrat hand their chapters to ReaderShell; positions are stored per layout', () => {
  const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  for (const file of ['app/dharm-veer/[id].tsx', 'app/vrat/[slug].tsx']) {
    const src = read(file);
    assert.match(src, /chapterLayout=\{\{\s*titles: chapters\.map/, `${file} passes chapter titles`);
    assert.match(src, /fallback: chapters\.map\(\(chapter\) => chapter\.fallback\)/, `${file} passes fallback flags`);
    assert.match(src, /usesChapterLayout\(readerPrefs\.layout, chapters\.length\)/, `${file} uses the shared layout rule`);
  }
  const shell = read('components/reader/ReaderShell.tsx');
  assert.match(shell, /usesChapterLayout\(prefs\.layout, chapterTitles\.length\)/);
  assert.match(shell, /const effectiveVersion = chaptered \? `\$\{progressVersion\}:chapters` : progressVersion;/);
  assert.doesNotMatch(shell, /saveReadingPosition\(progressId, progressVersion/, 'saves always use the per-layout version');
});
