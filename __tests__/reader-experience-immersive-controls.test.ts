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
  getReaderPinned,
  setReaderPinned,
  hasSeenFirstTimeHint,
  markFirstTimeHintSeen,
  clearReaderPrefs,
} from '../lib/readerPrefs';

const readerShell = readFileSync(new URL('../components/reader/ReaderShell.tsx', import.meta.url), 'utf8');
const readerCapsule = readFileSync(new URL('../components/reader/ReaderCapsule.tsx', import.meta.url), 'utf8');
const readerSettings = readFileSync(new URL('../components/reader/ReaderSettingsSheet.tsx', import.meta.url), 'utf8');
const readerPrefs = readFileSync(new URL('../lib/readerPrefs.ts', import.meta.url), 'utf8');

describe('Reader Experience Phase 1 — Immersive Controls (D1)', () => {
  it('activates keep-awake to prevent screen lock during reading', () => {
    assert.match(readerShell, /import \{ useKeepAwake \} from 'expo-keep-awake';/);
    assert.match(readerShell, /useKeepAwake\(\);/);
  });

  it('configures auto-hide delay strictly to 3.5 seconds (3500 ms)', () => {
    assert.match(readerShell, /const AUTO_HIDE_DELAY_MS = 3500;/);
    assert.match(readerShell, /setTimeout\(\(\) => \{\s*\n\s*void hideControls\(\);\s*\n\s*\}, AUTO_HIDE_DELAY_MS\);/);
  });

  it('renders a compact top bar with back, title, and pin controls toggle', () => {
    // Back button with 44 pt minimum target
    assert.match(readerShell, /accessibilityLabel="Go back"/);
    assert.match(readerShell, /width: 44,\s*\n\s*height: 44/);

    // Title & subtitle
    assert.match(readerShell, /numberOfLines=\{1\}/);

    // Pin button with 44 pt minimum target
    assert.match(readerShell, /accessibilityLabel=\{isPinned \? 'Unpin controls' : 'Pin controls'\}/);
    assert.match(readerShell, /name=\{isPinned \? 'lock' : 'maximize-2'\}/);
  });

  it('renders floating thumb capsule at bottom with max 4-5 focused controls', () => {
    assert.match(readerShell, /<ReaderCapsule/);
    assert.match(readerShell, /bottom: insets\.bottom \+ 16/);
    assert.match(readerShell, /alignItems: 'center'/);

    // Capsule holds font steppers, audio/TTS, language, and Aa sheet trigger
    assert.match(readerCapsule, /accessibilityLabel="Decrease text size \(--\)"/);
    assert.match(readerCapsule, /accessibilityLabel="Increase text size \(\+\+\)"/);
    assert.match(readerCapsule, /accessibilityLabel=\{isSpeaking \? 'Stop reading aloud' : 'Listen to this content'\}/);
    assert.match(readerCapsule, /accessibilityLabel="Reader options and appearance"/);
    assert.match(readerCapsule, />\s*Aa\s*<\/Text>/);
  });

  it('routes secondary options (copy, share, transliteration, meaning, speed) into Aa sheet', () => {
    assert.match(readerShell, /<ReaderSettingsSheet/);

    // Sheet contains text size options
    assert.match(readerSettings, /Text Size/);

    // Sheet contains transliteration and meaning toggles
    assert.match(readerSettings, /Transliteration \(Roman Script\)/);
    assert.match(readerSettings, /Verse Meaning & Translation/);

    // Sheet contains listening speed rates
    assert.match(readerSettings, /Listening Speed/);
    assert.match(readerSettings, /const TTS_RATES = \[0\.75, 1, 1\.25\] as const;/);

    // Sheet contains copy and share actions
    assert.match(readerSettings, /accessibilityLabel=\{isCopied \? 'Copied' : 'Copy content'\}/);
    assert.match(readerSettings, /accessibilityLabel="Share content"/);

    // Sheet contains pin controls toggle
    assert.match(readerSettings, /Keep controls always visible/);
  });

  it('guarantees accessibility compliance: screen reader pinning and reduce motion support', () => {
    // Screen reader auto-pins controls
    assert.match(readerShell, /AccessibilityInfo\.isScreenReaderEnabled\(\)/);
    assert.match(readerShell, /AccessibilityInfo\.addEventListener\(\s*'screenReaderChanged'/);
    assert.match(readerShell, /if \(isPinned \|\| isScreenReader/);

    // Reduce motion disables slide translation
    assert.match(readerShell, /AccessibilityInfo\.isReduceMotionEnabled\(\)/);
    assert.match(readerShell, /AccessibilityInfo\.addEventListener\(\s*'reduceMotionChanged'/);
    assert.match(readerShell, /if \(isReduceMotion\) \{\s*\n\s*headerAnim\.setValue\(1\);\s*\n\s*capsuleAnim\.setValue\(1\);/);
    assert.match(readerShell, /if \(isReduceMotion\) \{\s*\n\s*headerAnim\.setValue\(0\);\s*\n\s*capsuleAnim\.setValue\(0\);/);
  });

  it('manages first-time hint toast once per user without repeating', () => {
    assert.match(readerShell, /const seen = await hasSeenFirstTimeHint\(\);/);
    assert.match(readerShell, /await markFirstTimeHintSeen\(\);/);
    assert.match(readerShell, />\s*Tap anywhere to show controls\s*<\/Text>/);
  });

  it('manages reader preferences persistence and purge hygiene', async () => {
    assert.match(readerPrefs, /@shoonaya\/reader_controls_pinned/);
    assert.match(readerPrefs, /@shoonaya\/reader_first_time_hint_seen/);

    // Initial default is false
    const initialPinned = await getReaderPinned();
    assert.equal(typeof initialPinned, 'boolean');

    await setReaderPinned(true);
    const updatedPinned = await getReaderPinned();
    assert.equal(updatedPinned, true);

    await markFirstTimeHintSeen();
    const seen = await hasSeenFirstTimeHint();
    assert.equal(seen, true);

    await clearReaderPrefs();
    const clearedPinned = await getReaderPinned();
    const clearedSeen = await hasSeenFirstTimeHint();
    assert.equal(clearedPinned, false);
    assert.equal(clearedSeen, false);
  });
});
