import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it, beforeEach } from 'node:test';

// Node.js test environment polyfill for AsyncStorage web driver
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

import {
  saveReaderPosition,
  getReaderPosition,
  clearReaderPosition,
  clearAllReaderPositions,
  MAX_STORED_POSITIONS,
  MAX_POSITION_AGE_MS,
  MIN_SCROLL_OFFSET_TO_SAVE,
} from '../lib/readerPosition';
import { clearReaderPrefs } from '../lib/readerPrefs';

const readerShell = readFileSync(new URL('../components/reader/ReaderShell.tsx', import.meta.url), 'utf8');
const stotramScreen = readFileSync(new URL('../app/bhakti/stotram/[id].tsx', import.meta.url), 'utf8');
const dharmVeerScreen = readFileSync(new URL('../app/dharm-veer/[id].tsx', import.meta.url), 'utf8');
const kathaScreen = readFileSync(new URL('../app/bhakti/katha/[id].tsx', import.meta.url), 'utf8');
const vratScreen = readFileSync(new URL('../app/vrat/[slug].tsx', import.meta.url), 'utf8');
const festivalScreen = readFileSync(new URL('../app/festival/[slug].tsx', import.meta.url), 'utf8');

describe('Reader Experience Phase 3 - Pick up where you left off', () => {
  beforeEach(async () => {
    memoryStore.clear();
  });

  it('saves and retrieves reading position for a specific content item', async () => {
    await saveReaderPosition({
      userKey: 'user-1',
      contentId: 'stotram-hanuman-chalisa',
      contentVersion: '1.0',
      scrollOffsetY: 850,
      sectionTitle: 'Verse 14',
      sectionIndex: 14,
    });

    const pos = await getReaderPosition({
      userKey: 'user-1',
      contentId: 'stotram-hanuman-chalisa',
      contentVersion: '1.0',
    });

    assert.ok(pos, 'Expected saved position to exist');
    assert.equal(pos.contentId, 'stotram-hanuman-chalisa');
    assert.equal(pos.contentVersion, '1.0');
    assert.equal(pos.scrollOffsetY, 850);
    assert.equal(pos.sectionTitle, 'Verse 14');
    assert.equal(pos.sectionIndex, 14);
  });

  it('ignores or clears positions when scroll offset is below minimum threshold (< 100 pt)', async () => {
    // 1. Initial save at valid offset
    await saveReaderPosition({
      userKey: 'user-1',
      contentId: 'stotram-hanuman-chalisa',
      scrollOffsetY: 400,
    });
    let pos = await getReaderPosition({ userKey: 'user-1', contentId: 'stotram-hanuman-chalisa' });
    assert.ok(pos);

    // 2. User scrolled back near top (offset < MIN_SCROLL_OFFSET_TO_SAVE)
    await saveReaderPosition({
      userKey: 'user-1',
      contentId: 'stotram-hanuman-chalisa',
      scrollOffsetY: 50,
    });
    pos = await getReaderPosition({ userKey: 'user-1', contentId: 'stotram-hanuman-chalisa' });
    assert.equal(pos, null, 'Expected position to be cleared when scrolled back to top');
  });

  it('discards saved position when contentVersion changes', async () => {
    await saveReaderPosition({
      userKey: 'user-1',
      contentId: 'dharm-veer-bhagat-singh',
      contentVersion: '1.0',
      scrollOffsetY: 620,
      sectionTitle: 'Trial',
    });

    // Content updated to version 2.0
    const pos = await getReaderPosition({
      userKey: 'user-1',
      contentId: 'dharm-veer-bhagat-singh',
      contentVersion: '2.0',
    });
    assert.equal(pos, null, 'Expected position to be discarded upon content version mismatch');
  });

  it('discards entries older than 90 days', async () => {
    await saveReaderPosition({
      userKey: 'user-1',
      contentId: 'katha-savipati',
      scrollOffsetY: 500,
    });

    // Manually age the entry beyond 90 days
    const raw = memoryStore.get('@shoonaya/reader_positions_v1:user-1');
    assert.ok(raw);
    const parsed = JSON.parse(raw);
    parsed.entries['katha-savipati'].updatedAt = Date.now() - (MAX_POSITION_AGE_MS + 10000);
    memoryStore.set('@shoonaya/reader_positions_v1:user-1', JSON.stringify(parsed));

    const pos = await getReaderPosition({
      userKey: 'user-1',
      contentId: 'katha-savipati',
    });
    assert.equal(pos, null, 'Expected expired entry to be discarded');
  });

  it('enforces maximum bound of 50 items by keeping the most recently updated', async () => {
    // Save 55 distinct items with monotonically increasing timestamps
    for (let i = 1; i <= 55; i++) {
      await saveReaderPosition({
        userKey: 'user-1',
        contentId: `story-${i}`,
        scrollOffsetY: 200 + i,
        updatedAt: 1000000 + i * 1000,
      });
    }

    const raw = memoryStore.get('@shoonaya/reader_positions_v1:user-1');
    assert.ok(raw);
    const parsed = JSON.parse(raw);
    const keys = Object.keys(parsed.entries);

    assert.equal(keys.length, MAX_STORED_POSITIONS);
    assert.ok(parsed.entries['story-55'], 'Expected latest story-55 to be preserved');
    assert.ok(!parsed.entries['story-1'], 'Expected oldest story-1 to be pruned');
  });

  it('isolates saved positions by user key', async () => {
    await saveReaderPosition({
      userKey: 'user-A',
      contentId: 'vrat-ekadashi',
      scrollOffsetY: 340,
    });

    const userBPos = await getReaderPosition({
      userKey: 'user-B',
      contentId: 'vrat-ekadashi',
    });
    assert.equal(userBPos, null, 'User B must not read User A reading position');
  });

  it('clears specific item position when user selects Start over', async () => {
    await saveReaderPosition({
      userKey: 'user-1',
      contentId: 'festival-diwali',
      scrollOffsetY: 720,
    });

    await clearReaderPosition({
      userKey: 'user-1',
      contentId: 'festival-diwali',
    });

    const pos = await getReaderPosition({
      userKey: 'user-1',
      contentId: 'festival-diwali',
    });
    assert.equal(pos, null);
  });

  it('sweeps all stored positions when clearReaderPrefs is invoked on sign-out/switch', async () => {
    await saveReaderPosition({
      userKey: 'guest',
      contentId: 'stotram-shiva-tandava',
      scrollOffsetY: 600,
    });

    await clearReaderPrefs();

    const pos = await getReaderPosition({
      userKey: 'guest',
      contentId: 'stotram-shiva-tandava',
    });
    assert.equal(pos, null, 'clearReaderPrefs must clear reader positions');
  });

  it('wires position restore UI, auto-scroll, and debounced save in ReaderShell', () => {
    // Verifies resume prompt banner
    assert.match(readerShell, /Resuming from \{resumePrompt\.sectionTitle \|\| 'earlier'\}/);
    assert.match(readerShell, /accessibilityLabel="Start over from beginning"/);
    assert.match(readerShell, /handleStartOver/);

    // Verifies position load on mount
    assert.match(readerShell, /getReaderPosition\(\{ contentId, contentVersion \}\)/);
    assert.match(readerShell, /internalScrollRef\.current\?\.scrollTo\(\{ y: savedPos\.scrollOffsetY, animated: true \}\)/);

    // Verifies debounced save on scroll
    assert.match(readerShell, /saveReaderPosition\(\{/);
  });

  it('wires contentId into all 5 ReaderShell screen surfaces', () => {
    assert.match(stotramScreen, /contentId=\{`stotram-\$\{stotram\.id\}`\}/);
    assert.match(dharmVeerScreen, /contentId=\{`dharm-veer-\$\{hero\.id\}`\}/);
    assert.match(kathaScreen, /contentId=\{`katha-\$\{katha\.id\}`\}/);
    assert.match(vratScreen, /contentId=\{`vrat-\$\{slug\}`\}/);
    assert.match(festivalScreen, /contentId=\{`festival-\$\{slug\}`\}/);
  });
});
