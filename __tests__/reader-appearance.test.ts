import assert from 'node:assert/strict';
import test from 'node:test';

import { READER_PAPER, themeColor, type ReaderPaperKey } from '../lib/constants';
import { readerControlsPalette, readerTheme, resolveReaderPaper } from '../lib/readerAppearance';

// WCAG 2.x relative luminance / contrast ratio (opaque hex colours only).
function luminance(hex: string) {
  const v = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const PAPERS = Object.keys(READER_PAPER) as ReaderPaperKey[];

test('exactly the three approved papers exist', () => {
  assert.deepEqual(PAPERS.sort(), ['bhojpatra', 'sandhya', 'templeNight']);
});

test('approved page/ink pairs are unchanged', () => {
  assert.equal(READER_PAPER.bhojpatra.page, '#F7F3E8');
  assert.equal(READER_PAPER.bhojpatra.text, '#2A2118');
  assert.equal(READER_PAPER.sandhya.page, '#131722');
  assert.equal(READER_PAPER.sandhya.text, '#E8D8B8');
  assert.equal(READER_PAPER.templeNight.page, '#0C0D0E');
});

for (const paper of PAPERS) {
  test(`${paper}: text >= 7:1, dim >= 4.5:1 on page and card; accent >= 4.5:1 on page`, () => {
    const t = READER_PAPER[paper];
    for (const surface of [t.page, t.card]) {
      assert.ok(contrast(t.text, surface) >= 7, `${paper} text on ${surface}: ${contrast(t.text, surface).toFixed(2)}`);
      assert.ok(contrast(t.dim, surface) >= 4.5, `${paper} dim on ${surface}: ${contrast(t.dim, surface).toFixed(2)}`);
    }
    assert.ok(contrast(t.accent, t.page) >= 4.5, `${paper} accent: ${contrast(t.accent, t.page).toFixed(2)}`);
  });
}

test('auto follows the device: light -> Bhojpatra, dark -> Temple Night; explicit choices win', () => {
  assert.equal(resolveReaderPaper('auto', false), 'bhojpatra');
  assert.equal(resolveReaderPaper('auto', true), 'templeNight');
  for (const paper of PAPERS) {
    assert.equal(resolveReaderPaper(paper, false), paper);
    assert.equal(resolveReaderPaper(paper, true), paper);
  }
});

test('readerTheme keeps themeColor()s exact keys, swaps surfaces and ink, keeps brand', () => {
  for (const paper of PAPERS) {
    const { isDark, theme } = readerTheme(paper);
    const base = themeColor(isDark);
    assert.equal(isDark, READER_PAPER[paper].isDark);
    assert.deepEqual(Object.keys(theme).sort(), Object.keys(base).sort());
    assert.equal(theme.bg, READER_PAPER[paper].page);
    assert.equal(theme.card, READER_PAPER[paper].card);
    assert.equal(theme.text, READER_PAPER[paper].text);
    assert.equal(theme.dim, READER_PAPER[paper].dim);
    assert.equal(theme.brand, base.brand);
  }
});

test('controls palette uses the paper accent and page', () => {
  for (const paper of PAPERS) {
    const palette = readerControlsPalette(paper);
    assert.equal(palette.accent, READER_PAPER[paper].accent);
    assert.equal(palette.page, READER_PAPER[paper].page);
    assert.equal(palette.capsule, READER_PAPER[paper].card);
  }
});
