import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const backButton = readFileSync(new URL('../components/ui/BackButton.tsx', import.meta.url), 'utf8');
const readerShell = readFileSync(new URL('../components/reader/ReaderShell.tsx', import.meta.url), 'utf8');
const readerControls = readFileSync(new URL('../hooks/useReaderControls.ts', import.meta.url), 'utf8');
const stotram = readFileSync(new URL('../app/bhakti/stotram/[id].tsx', import.meta.url), 'utf8');
const katha = readFileSync(new URL('../app/bhakti/katha/[id].tsx', import.meta.url), 'utf8');
const tirtha = readFileSync(new URL('../app/(tabs)/tirtha.tsx', import.meta.url), 'utf8');
const mood = readFileSync(new URL('../app/mood.tsx', import.meta.url), 'utf8');
const pathshalaLesson = readFileSync(new URL('../app/pathshala/[pathId]/[lessonId].tsx', import.meta.url), 'utf8');

describe('reader navigation and audio lifecycle', () => {
  it('uses Bhakti as the direct-entry parent for all Bhakti routes', () => {
    assert.match(backButton, /pathname\.startsWith\('\/bhakti'\)\) return '\/\(tabs\)\/bhakti'/);
    assert.match(stotram, /fallbackBackUrl="\/\(tabs\)\/bhakti"/);
    assert.match(katha, /fallbackBackUrl="\/\(tabs\)\/bhakti"/);
  });

  it('stops reader audio before navigating and invalidates an in-flight TTS request', () => {
    assert.match(readerShell, /onBeforeBack\?: \(\) => void \| Promise<void>/);
    assert.match(backButton, /Promise\.resolve\(onBeforeBack\(\)\)\.finally\(navigateBack\)/);
    assert.match(readerControls, /ttsRequestIdRef\.current \+= 1/);
    assert.match(readerControls, /requestId !== ttsRequestIdRef\.current \|\| !mountedRef\.current/);
    // Phase 4: back ends the verse-recitation chain (which stops TTS) and the recorded track.
    assert.match(stotram, /await stopRecitation\(\);\s*await audio\.stop\(\);/);
    assert.match(stotram, /const stopRecitation = async \(\) => \{\s*chainRef\.current \+= 1;\s*setRecitation\(null\);\s*await handlers\.stopTTS\(\);/);
    assert.match(katha, /onBeforeBack=\{handlers\.stopTTS\}/);
  });

  it('uses a deliberate 0.75x default TTS speed and preserves only complete translations', () => {
    assert.match(stotram, /useState<0\.75 \| 1 \| 1\.25>\(0\.75\)/);
    assert.match(katha, /useState<0\.75 \| 1 \| 1\.25>\(0\.75\)/);
    assert.match(stotram, /verses\.every\(\(verse\) => Boolean\(verse\.meaning_hi\)\)/);
    assert.match(stotram, /verses\.every\(\(verse\) => Boolean\(verse\.meaning_pa\)\)/);
  });

  it('makes Tirtha navigable when it was opened outside its tab history', () => {
    assert.match(tirtha, /<BackButton[^>]*fallbackHref="\/\(tabs\)"[^>]*handleHardwareBack/);
  });

  it('returns a completed Mood flow to the previous screen before using Home as a fallback', () => {
    assert.match(mood, /if \(router\.canGoBack\(\)\) router\.back\(\);\s*else router\.replace\('\/\(tabs\)'\);/);
  });

  it('returns direct Pathshala lesson entries to the Pathshala hub, including after completion', () => {
    assert.match(backButton, /pathname\.startsWith\('\/pathshala'\)\) return '\/\(tabs\)\/pathshala'/);
    assert.match(pathshalaLesson, /else router\.replace\('\/\(tabs\)\/pathshala'\);/);
    assert.match(pathshalaLesson, /PathshalaCompletionModal/);
    assert.match(pathshalaLesson, /returnToPathshala/);
  });

  it('guarantees Mantras and Pathshala path details return to their respective hubs with hardware back support', () => {
    const mantrasSrc = readFileSync(new URL('../app/mantras.tsx', import.meta.url), 'utf8');
    const pathDetailSrc = readFileSync(new URL('../app/pathshala/[pathId].tsx', import.meta.url), 'utf8');

    assert.match(backButton, /pathname\.startsWith\('\/mantras'\)\) return '\/\(tabs\)\/bhakti'/);
    assert.match(mantrasSrc, /<BackButton fallbackHref="\/\(tabs\)\/bhakti" handleHardwareBack/);
    assert.match(pathDetailSrc, /<BackButton showLabel=\{false\} iconSize=\{22\} iconColor=\{text\} fallbackHref="\/\(tabs\)\/pathshala" handleHardwareBack \/>/);
  });

  it('guarantees back navigation to tab hubs navigates directly to prevent slot remount reset to Home', () => {
    assert.match(backButton, /targetPath\.startsWith\('\/\(tabs\)\/'\)/);
    assert.match(backButton, /router\.replace\(target\)/);
  });

  it('guarantees ReaderShell renders explicit smaller/larger text steppers while reading, clamped to the presets', () => {
    // Phase 1 of docs/READER_EXPERIENCE_GRAND_PLAN.md moved the steppers from
    // the header row into the floating capsule (components/reader/ReaderControls.tsx).
    const capsuleSrc = readFileSync(new URL('../components/reader/ReaderControls.tsx', import.meta.url), 'utf8');
    assert.match(capsuleSrc, /testID="reader-font-smaller"/);
    assert.match(capsuleSrc, /testID="reader-font-larger"/);
    assert.match(readerShell, /onDecrease: \(\) => setFontStep\(Math\.max\(0, fontStep - 1\)\)/);
    assert.match(readerShell, /onIncrease: \(\) => setFontStep\(Math\.min\(fontPresets\.length - 1, fontStep \+ 1\)\)/);
    assert.match(readerShell, /canDecrease: fontStep > 0/);
    assert.match(readerShell, /canIncrease: fontStep < fontPresets\.length - 1/);
  });

  it('guarantees TTS bounds text under backend limits and persists native audio to cache file', () => {
    assert.match(readerControls, /const MAX_TTS_LIMIT = 2800;/);
    assert.match(readerControls, /FileSystem\.writeAsStringAsync\(localPath, data\.audioContent/);
    assert.match(readerControls, /FileSystem\.EncodingType\.Base64/);
  });

  it('guarantees Panchatantra storybook narrations pass active scene text rather than dumping whole multi-thousand char text', () => {
    const storybookSrc = readFileSync(new URL('../components/reader/PanchatantraStorybookView.tsx', import.meta.url), 'utf8');
    assert.match(storybookSrc, /onTTS\?: \(sceneText\?: string\) => void;/);
    assert.match(storybookSrc, /onTTS\(currentSceneText\);/);
    assert.match(katha, /onTTS=\{\(sceneText\) => handlers\.toggleTTS\(sceneText \|\| textToCopy/);
  });
});


