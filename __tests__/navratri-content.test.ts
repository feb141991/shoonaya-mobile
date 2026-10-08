import assert from 'node:assert/strict';
import test from 'node:test';

import { getNavratriConduct, getNavratriMantra, getNavratriPujaItems, isNavratriObservance } from '../lib/navratri-content';
import { OBSERVANCE_SERIES_CONTENT_SNAPSHOT } from '../lib/observance-series-content.generated';

const series = (key: string) => {
  const found = OBSERVANCE_SERIES_CONTENT_SNAPSHOT.series.find((s) => s.definitionKey === key);
  assert.ok(found, key);
  return found;
};
const words = (text?: string) => (text ? text.trim().split(/\s+/).length : 0);

// Sharad slug of the same Navadurga form, by Chaitra day number.
const SHARAD_FORM: Record<number, string> = {
  1: 'navratri-day-1-shailaputri',
  2: 'navratri-day-2-brahmacharini',
  3: 'navratri-day-3-chandraghanta',
  4: 'navratri-day-4-kushmanda',
  5: 'navratri-day-5-skandamata',
  6: 'navratri-day-6-katyayani',
  7: 'navratri-day-7-kalaratri',
  8: 'durga-ashtami',
  9: 'maha-navami',
};

test('every Chaitra Navratri day gets the Navratri conduct, samagri and its own goddess\'s dhyana verse', () => {
  const chaitra = series('chaitra-navratri');
  assert.equal(chaitra.children.length, 9);
  const navarna = getNavratriMantra('sharad-navratri', 'en').sanskrit;
  for (const child of chaitra.children) {
    assert.equal(isNavratriObservance(child.slug), true, child.slug);
    for (const lang of ['en', 'hi', 'pa'] as const) {
      assert.ok(getNavratriConduct(child.slug, lang).dos.length >= 5, `${child.slug} ${lang} dos`);
      assert.ok(getNavratriPujaItems(child.slug, lang).length >= 5, `${child.slug} ${lang} samagri`);
      const mantra = getNavratriMantra(child.slug, lang);
      const sharad = getNavratriMantra(SHARAD_FORM[child.sequence], lang);
      assert.deepEqual(mantra, sharad, `${child.slug} ${lang} uses the ${SHARAD_FORM[child.sequence]} verse`);
      assert.notEqual(mantra.sanskrit, navarna, `${child.slug} must not fall back to the generic Navarna mantra`);
    }
  }
  assert.equal(isNavratriObservance('chaitra-navratri'), true);
  assert.equal(isNavratriObservance('gupt-navratri-day-1'), false, 'Gupt Navratri is out of scope');
});

test('Chaitra significance is full length; new Hindi/Punjabi stay pending until reviewed', () => {
  for (const child of series('chaitra-navratri').children) {
    const sig = child.significance!;
    assert.ok(words(sig.value.en) >= 60, `${child.slug} en ${words(sig.value.en)} words`);
    assert.ok(words(sig.value.hi) >= 60, `${child.slug} hi ${words(sig.value.hi)} words`);
    assert.ok(words(sig.value.pa) >= 60, `${child.slug} pa ${words(sig.value.pa)} words`);
    assert.deepEqual(sig.translationStatus, { en: 'source', hi: 'pending', pa: 'pending' }, child.slug);
    assert.equal(sig.status, 'source_backed', child.slug);
    assert.ok(sig.sourceRefs.length >= 1, child.slug);
    for (const ref of sig.sourceRefs) {
      assert.ok(!ref.sourceName.includes('Rashtriya Panchang'), `${child.slug}: the Panchang is a calendar source, not a narrative one`);
      if (ref.sourceName.startsWith('Navadurga Dhyana')) {
        assert.equal(ref.tier, 2, `${child.slug}: dhyana verses are cited below tier 1`);
        assert.equal(ref.confidence, 'medium', child.slug);
      }
    }
  }
});

test('Sharad Navratri day texts are unchanged by the Chaitra work', () => {
  const sharad = series('sharad-navratri');
  assert.equal(sharad.children.length, 10);
  for (const child of sharad.children) {
    assert.deepEqual(child.significance?.translationStatus, { en: 'source', hi: 'reviewed_translation', pa: 'reviewed_translation' }, child.slug);
  }
});

test('the day-3 dhyana verse uses the standard reading', () => {
  const verse = getNavratriMantra('navratri-day-3-chandraghanta', 'en').sanskrit;
  assert.match(verse, /प्रसादं तनुते मह्यं/);
  assert.doesNotMatch(verse, /प्रसादिं/);
});
