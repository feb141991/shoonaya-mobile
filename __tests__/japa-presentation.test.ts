import assert from 'node:assert/strict';
import test from 'node:test';
import {
  capitalize,
  formatDuration,
  getCompletionTitle,
  getMantraScriptFont,
  getSpiritualTimeWindow,
} from '../lib/japaPresentation';

test('Japa presentation helpers preserve the existing display rules', () => {
  assert.equal(getMantraScriptFont('गायत्री', { serifBold: 'serif', devanagariBold: 'devanagari' }), 'devanagari');
  assert.equal(getMantraScriptFont('Gayatri', { serifBold: 'serif', devanagariBold: 'devanagari' }), 'serif');
  assert.equal(getCompletionTitle('sikh'), 'Simran Complete');
  assert.equal(getCompletionTitle('hindu'), 'माला पूर्ण हुई');
  assert.equal(formatDuration(125), '2m 05s');
  assert.equal(capitalize(null), 'Dharma');
  assert.equal(capitalize('sikh'), 'Sikh');
});

test('spiritual time window remains deterministic when the clock is injected', () => {
  assert.equal(getSpiritualTimeWindow(new Date('2026-11-12T04:00:00')), 'brahma_muhurta');
  assert.equal(getSpiritualTimeWindow(new Date('2026-11-12T12:00:00')), 'midday');
  assert.equal(getSpiritualTimeWindow(new Date('2026-11-12T21:00:00')), 'night');
});

test('JapaScreen declares no React component inside its render body', async () => {
  // A component declared inside JapaScreen is a new type on every render, so
  // React remounts it on every bead tap (MeruCrownApex did, until 2026-11-12).
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const source = readFileSync(join(process.cwd(), 'app/(tabs)/japa.tsx'), 'utf8');
  const bodyStart = source.indexOf('export default function JapaScreen()');
  assert.ok(bodyStart > 0, 'JapaScreen not found');
  const body = source.slice(bodyStart);
  assert.doesNotMatch(body, /^[ \t]+function [A-Z]\w*\s*\(/m);
  assert.doesNotMatch(body, /^[ \t]+const [A-Z]\w*\s*=\s*\([^)]*\)\s*=>\s*[(<]/m);
});
