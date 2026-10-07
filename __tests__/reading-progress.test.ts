import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import test from 'node:test';

// readingProgress imports AsyncStorage/appIdentity (React Native); stub them
// to test the pure rules directly.
const loader = Module as unknown as { _load: (...a: unknown[]) => unknown };
const originalLoad = loader._load;
loader._load = function (request: unknown, ...rest: unknown[]) {
  if (request === '@react-native-async-storage/async-storage') return { default: {} };
  if (request === '@/lib/appIdentity') return { getAppIdentity: () => ({ kind: 'loading' }), useAppIdentity: () => ({ kind: 'loading' }) };
  return originalLoad.call(this, request, ...rest);
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rp = require('../lib/readingProgress') as typeof import('../lib/readingProgress');

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-07T12:00:00Z');

test('keys combine content id and version, so a language change starts fresh', () => {
  assert.equal(rp.readingProgressKey('dharm-veer:sri-rama', 'en'), 'dharm-veer:sri-rama@en');
  assert.notEqual(rp.readingProgressKey('dharm-veer:sri-rama', 'en'), rp.readingProgressKey('dharm-veer:sri-rama', 'hi'));
});

test('prune keeps exactly the 50 most recent entries within 90 days', () => {
  const entries: Record<string, { ratio: number; updatedAt: number }> = {};
  for (let i = 0; i < 60; i += 1) entries[`c${i}@en`] = { ratio: 0.5, updatedAt: NOW - i * 60_000 };
  entries['old@en'] = { ratio: 0.5, updatedAt: NOW - 91 * DAY };
  const pruned = rp.pruneReadingProgress(entries, NOW);
  assert.equal(Object.keys(pruned).length, 50);
  assert.ok(!('old@en' in pruned));
  assert.ok('c0@en' in pruned && 'c49@en' in pruned);
  assert.ok(!('c50@en' in pruned));
});

test('parse accepts only valid v1 entries and drops malformed ones', () => {
  const raw = JSON.stringify({
    v: 1,
    entries: {
      'a@en': { ratio: 0.4, updatedAt: NOW },
      'b@en': { page: 3, label: 'Trial', updatedAt: NOW },
      'bad-ratio@en': { ratio: 1.5, updatedAt: NOW },
      'bad-page@en': { page: -1, updatedAt: NOW },
      'no-time@en': { ratio: 0.4 },
      'empty@en': { updatedAt: NOW },
    },
  });
  assert.deepEqual(rp.parseReadingProgress(raw), {
    'a@en': { ratio: 0.4, updatedAt: NOW },
    'b@en': { page: 3, label: 'Trial', updatedAt: NOW },
  });
  for (const bad of [null, '', 'x', JSON.stringify({ v: 2, entries: {} }), JSON.stringify({ entries: {} })]) {
    assert.deepEqual(rp.parseReadingProgress(bad), {}, String(bad));
  }
});

test('only a real mid-read position is offered for resume', () => {
  assert.equal(rp.isResumableRatio(0.42), true);
  for (const ratio of [undefined, 0, 0.03, 0.98, 1]) assert.equal(rp.isResumableRatio(ratio), false, String(ratio));
});

test('nothing is read or written when signed out', async () => {
  assert.equal(await rp.getReadingPosition('dharm-veer:sri-rama', 'en'), null);
  await rp.saveReadingPosition('dharm-veer:sri-rama', 'en', { ratio: 0.5 }); // must not throw or touch storage
});

test('reading progress is cleared at all four sign-out / account-switch purge points', () => {
  const layout = fs.readFileSync(path.join(__dirname, '../app/_layout.tsx'), 'utf8');
  assert.equal((layout.match(/void clearAllReadingProgress\(\);/g) ?? []).length, 4);
});

test('every ReaderShell reader passes a progress id with a language-dependent version', () => {
  for (const [file, id] of [
    ['app/dharm-veer/[id].tsx', 'dharm-veer:'],
    ['app/bhakti/stotram/[id].tsx', 'stotram:'],
    ['app/bhakti/katha/[id].tsx', 'katha:'],
    ['app/vrat/[slug].tsx', 'vrat:'],
    ['app/festival/[slug].tsx', 'festival:'],
  ] as const) {
    const src = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.ok(src.includes(`progressId={\`${id}`), `${file} progressId`);
    assert.match(src, /progressVersion=\{/, `${file} progressVersion`);
  }
});
