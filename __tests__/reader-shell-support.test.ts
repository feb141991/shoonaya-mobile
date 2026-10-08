import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { isReaderRoute } from '../lib/readerRoutes';
import { READER_COPY } from '../lib/readerCopy';

// readerPrefs imports AsyncStorage/appIdentity (React Native); test its pure
// parser by loading only that function's module scope via a light stub.
import Module from 'node:module';
const originalLoad = (Module as unknown as { _load: (...a: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...a: unknown[]) => unknown })._load = function (request: unknown, ...rest: unknown[]) {
  if (request === '@react-native-async-storage/async-storage') return { default: {} };
  if (request === '@/lib/appIdentity') return { getAppIdentity: () => ({ kind: 'loading' }), useAppIdentity: () => ({ kind: 'loading' }) };
  return originalLoad.call(this, request, ...rest);
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parseReaderPrefs, readerPrefsOwner, DEFAULT_READER_PREFS } = require('../lib/readerPrefs') as typeof import('../lib/readerPrefs');

test('reader routes: every reader screen, and no list page', () => {
  const readers = [
    ['dharm-veer', '[id]'],
    ['bhakti', 'stotram', '[id]'],
    ['bhakti', 'katha', '[id]'],
    ['vrat', '[slug]'],
    ['festival', '[slug]'],
    ['pathshala', '[pathId]', '[lessonId]'],
  ];
  const notReaders = [
    ['dharm-veer'], ['vrat'], ['festival'], ['bhakti'], ['bhakti', 'katha'], ['bhakti', 'browse'],
    ['pathshala'], ['pathshala', '[pathId]'], ['(tabs)'], ['(tabs)', 'mandali'], [],
  ];
  assert.deepEqual(readers.filter((s) => !isReaderRoute(s)), []);
  assert.deepEqual(notReaders.filter((s) => isReaderRoute(s)), []);
});

test('reader prefs: only a v1 record is read; anything else is the default', () => {
  assert.deepEqual(parseReaderPrefs(JSON.stringify({ v: 1, pinned: true, tapHintSeen: true })), { pinned: true, tapHintSeen: true, paper: 'auto', layout: 'chapters' });
  assert.deepEqual(parseReaderPrefs(JSON.stringify({ v: 1, pinned: 'yes', paper: 'neon', layout: 'grid' })), { pinned: false, tapHintSeen: false, paper: 'auto', layout: 'chapters' });
  assert.equal(parseReaderPrefs(JSON.stringify({ v: 1, layout: 'scroll' })).layout, 'scroll');
  for (const raw of [null, '', 'not json', JSON.stringify({ v: 2, pinned: true }), JSON.stringify({ pinned: true })]) {
    assert.deepEqual(parseReaderPrefs(raw), DEFAULT_READER_PREFS, String(raw));
  }
});

test('reader prefs are keyed per account, per guest, and never stored when signed out', () => {
  assert.equal(readerPrefsOwner({ kind: 'authenticated', userId: 'u1' }), 'user_u1');
  assert.equal(readerPrefsOwner({ kind: 'guest' }), 'guest');
  assert.equal(readerPrefsOwner({ kind: 'unauthenticated' }), null);
  assert.equal(readerPrefsOwner({ kind: 'loading' }), null);
});

test('reader copy: en, hi and pa define the same keys, none empty', () => {
  const keys = Object.keys(READER_COPY.en).sort();
  for (const lang of ['en', 'hi', 'pa'] as const) {
    const copy = READER_COPY[lang];
    assert.deepEqual(Object.keys(copy).sort(), keys, lang);
    for (const [key, value] of Object.entries(copy)) {
      const text = typeof value === 'function' ? (value as (x: string) => string)('X') : value;
      assert.ok(String(text).trim().length > 0, `${lang}.${key}`);
    }
  }
});

test('reader prefs are cleared at all four sign-out / account-switch purge points', () => {
  const layout = fs.readFileSync(path.join(__dirname, '../app/_layout.tsx'), 'utf8');
  assert.equal((layout.match(/void clearAllReaderPrefs\(\);/g) ?? []).length, 4);
  assert.equal((layout.match(/accountDeletion\.clear\(\);/g) ?? []).length, 4);
});
