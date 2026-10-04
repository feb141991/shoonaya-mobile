import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// The screen imports React Native and is covered here through its visible
// contract, following the repo's source-level UI regression-test convention.
const screen = readFileSync(new URL('../app/rashiphala.tsx', import.meta.url), 'utf8');

test('Native Rashiphal presents the selected six-graha content as reflections, not facts', () => {
  assert.match(screen, /Selected Transit Reflections/);
  assert.match(screen, /data\.gocharSummary/);
  assert.doesNotMatch(screen, /Transit Facts/);
});

test('Native Rashiphal renders every supplied selected-graha card', () => {
  assert.match(screen, /data\.transitHighlights\.map\(/);
  assert.doesNotMatch(screen, /transitHighlights\.slice\(0,\s*4\)/);
});

test('Native Rashiphal does not encode editorial tone as success or danger color', () => {
  assert.doesNotMatch(screen, /function toneStyle\(/);
  assert.doesNotMatch(screen, /COLORS\.(?:success|danger)(?:Bg|Border)?/);
});

test('Native Rashiphal requires a chosen or saved Rashi rather than silently assuming Aries', () => {
  assert.match(screen, /rashi: string \| null/);
  assert.match(screen, /Choose your Chandra Rashi/);
  assert.doesNotMatch(screen, /useState<string>\('aries'\)/);
  assert.doesNotMatch(screen, /\?\? 'aries'/);
});

test('Native Rashiphal scopes private Dasha readings to the active identity and selected sign', () => {
  assert.match(screen, /loadedReading\?\.identityKey === identityKey && loadedReading\.rashi === selectedRashi/);
  assert.match(screen, /setLoadedReading\(\{ identityKey, rashi: requestedRashi, value:/);
  assert.match(screen, /setLoadedReading\(null\)/);
});

test('Native Rashiphal labels and shares the server spiritual date with the editorial caveat', () => {
  assert.match(screen, /data\?\.spiritualDate/);
  assert.match(screen, /formatRashiphalaSpiritualDate/);
  assert.match(screen, /\$\{data\.accuracyNote\}/);
  assert.doesNotMatch(screen, /new Date\(\)\.toLocaleDateString/);
});
