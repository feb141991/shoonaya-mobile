import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

// Node.js test environment polyfill for AsyncStorage web driver
if (typeof window === 'undefined' || !(window as any).localStorage) {
  const memoryStore = new Map<string, string>();
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

import {
  READER_THEMES,
  getReaderTheme,
  ReaderThemeKey,
} from '../lib/constants';
import {
  getReaderThemeChoice,
  setReaderThemeChoice,
  clearReaderPrefs,
} from '../lib/readerPrefs';

const readerShell = readFileSync(new URL('../components/reader/ReaderShell.tsx', import.meta.url), 'utf8');
const readerSettings = readFileSync(new URL('../components/reader/ReaderSettingsSheet.tsx', import.meta.url), 'utf8');
const storybookView = readFileSync(new URL('../components/reader/PanchatantraStorybookView.tsx', import.meta.url), 'utf8');

function relativeLuminance(hex: string): number {
  const num = parseInt(hex.replace('#', ''), 16);
  const rgb = [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  const sRGB = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Reader Experience Phase 2 - Paper Themes (D2)', () => {
  it('defines all three paper themes in READER_THEMES: bhojpatra, sandhya, templeNight', () => {
    const keys = Object.keys(READER_THEMES) as ReaderThemeKey[];
    assert.deepEqual(keys.sort(), ['bhojpatra', 'sandhya', 'templeNight']);

    assert.equal(READER_THEMES.bhojpatra.bg, '#F7F3E8');
    assert.equal(READER_THEMES.bhojpatra.text, '#2A2118');
    assert.equal(READER_THEMES.bhojpatra.isDark, false);

    assert.equal(READER_THEMES.sandhya.bg, '#131722');
    assert.equal(READER_THEMES.sandhya.text, '#E8D8B8');
    assert.equal(READER_THEMES.sandhya.isDark, true);

    assert.equal(READER_THEMES.templeNight.bg, '#0C0D0E');
    assert.equal(READER_THEMES.templeNight.text, '#F4F0E8');
    assert.equal(READER_THEMES.templeNight.isDark, true);
  });

  it('guarantees WCAG AAA contrast (>= 7:1) for body text and AA (>= 4.5:1) for dim text in every theme', () => {
    // Bhojpatra (parchment)
    const bhojpatraBodyContrast = contrastRatio(READER_THEMES.bhojpatra.bg, READER_THEMES.bhojpatra.text);
    const bhojpatraDimContrast = contrastRatio(READER_THEMES.bhojpatra.bg, READER_THEMES.bhojpatra.dim);
    assert.ok(bhojpatraBodyContrast >= 7.0, `Bhojpatra body contrast is ${bhojpatraBodyContrast.toFixed(2)} (expected >= 7.0)`);
    assert.ok(bhojpatraDimContrast >= 4.5, `Bhojpatra dim contrast is ${bhojpatraDimContrast.toFixed(2)} (expected >= 4.5)`);

    // Sandhya (twilight)
    const sandhyaBodyContrast = contrastRatio(READER_THEMES.sandhya.bg, READER_THEMES.sandhya.text);
    const sandhyaDimContrast = contrastRatio(READER_THEMES.sandhya.bg, READER_THEMES.sandhya.dim);
    assert.ok(sandhyaBodyContrast >= 7.0, `Sandhya body contrast is ${sandhyaBodyContrast.toFixed(2)} (expected >= 7.0)`);
    assert.ok(sandhyaDimContrast >= 4.5, `Sandhya dim contrast is ${sandhyaDimContrast.toFixed(2)} (expected >= 4.5)`);

    // Temple Night (obsidian)
    const templeBodyContrast = contrastRatio(READER_THEMES.templeNight.bg, READER_THEMES.templeNight.text);
    const templeDimContrast = contrastRatio(READER_THEMES.templeNight.bg, READER_THEMES.templeNight.dim);
    assert.ok(templeBodyContrast >= 7.0, `Temple Night body contrast is ${templeBodyContrast.toFixed(2)} (expected >= 7.0)`);
    assert.ok(templeDimContrast >= 4.5, `Temple Night dim contrast is ${templeDimContrast.toFixed(2)} (expected >= 4.5)`);
  });

  it('resolves theme correctly with getReaderTheme() and defaults according to system appearance', () => {
    assert.equal(getReaderTheme('bhojpatra').key, 'bhojpatra');
    assert.equal(getReaderTheme('sandhya').key, 'sandhya');
    assert.equal(getReaderTheme('templeNight').key, 'templeNight');

    // Light mode fallback -> Bhojpatra
    assert.equal(getReaderTheme(null, false).key, 'bhojpatra');
    // Dark mode fallback -> Temple Night
    assert.equal(getReaderTheme(null, true).key, 'templeNight');
  });

  it('persists and clears paper theme preference in AsyncStorage', async () => {
    await clearReaderPrefs();
    const initial = await getReaderThemeChoice();
    assert.equal(initial, null);

    await setReaderThemeChoice('sandhya');
    const saved = await getReaderThemeChoice();
    assert.equal(saved, 'sandhya');

    await setReaderThemeChoice('bhojpatra');
    const updated = await getReaderThemeChoice();
    assert.equal(updated, 'bhojpatra');

    await clearReaderPrefs();
    const cleared = await getReaderThemeChoice();
    assert.equal(cleared, null);
  });

  it('wires Paper Tone selector into ReaderSettingsSheet with minimum 44 pt touch targets', () => {
    assert.match(readerSettings, /Paper Tone/);
    assert.match(readerSettings, /onSelectPaperTheme/);
    assert.match(readerSettings, /accessibilityLabel=\{`Paper tone \$\{themeTokens\.label\}`\}/);
    assert.match(readerSettings, /height:\s*48/);
  });

  it('applies activePaperTheme dynamically to ReaderShell surfaces and controls', () => {
    assert.match(readerShell, /activePaperTheme = getReaderTheme\(paperThemeKey, isDark\)/);
    assert.match(readerShell, /bgBase = shellBackgroundColor \?\? activePaperTheme\.bg/);
    assert.match(readerShell, /bgCard = shellHeaderBackgroundColor \?\? activePaperTheme\.glass/);
    assert.match(readerShell, /onSelectPaperTheme=\{handleSelectPaperTheme\}/);
  });

  it('uses READER_THEMES tokens in PanchatantraStorybookView instead of untokenized literals', () => {
    assert.match(storybookView, /import \{[\s\S]*?READER_THEMES[\s\S]*?\} from ['"]@\/lib\/constants['"]/);
    assert.match(storybookView, /storybookTheme = isDark \? READER_THEMES\.templeNight : READER_THEMES\.bhojpatra/);
    assert.doesNotMatch(storybookView, /const parchmentBg = isDark \? "#14100C" : "#FAF6EE";/);
  });
});
