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
    assert.match(stotram, /await handlers\.stopTTS\(\);\s*await audio\.stop\(\);/);
    assert.match(katha, /onBeforeBack=\{handlers\.stopTTS\}/);
  });

  it('uses a deliberate 0.75x default TTS speed and preserves only complete translations', () => {
    assert.match(stotram, /useState<0\.75 \| 1 \| 1\.25>\(0\.75\)/);
    assert.match(katha, /useState<0\.75 \| 1 \| 1\.25>\(0\.75\)/);
    assert.match(stotram, /verses\.every\(\(verse\) => Boolean\(verse\.meaning_hi\)\)/);
    assert.match(stotram, /verses\.every\(\(verse\) => Boolean\(verse\.meaning_pa\)\)/);
  });

  it('makes Tirtha navigable when it was opened outside its tab history', () => {
    assert.match(tirtha, /<BackButton fallbackHref="\/\(tabs\)" handleHardwareBack \/>/);
  });

  it('returns a completed Mood flow to the previous screen before using Home as a fallback', () => {
    assert.match(mood, /if \(router\.canGoBack\(\)\) router\.back\(\);\s*else router\.replace\('\/\(tabs\)'\);/);
  });

  it('returns direct Pathshala lesson entries to the Pathshala hub, including after completion', () => {
    assert.match(backButton, /pathname\.startsWith\('\/pathshala'\)\) return '\/\(tabs\)\/pathshala'/);
    assert.match(pathshalaLesson, /else router\.replace\('\/\(tabs\)\/pathshala'\);/);
    assert.match(pathshalaLesson, /setTimeout\(returnToPathshala, 650\)/);
  });
});
