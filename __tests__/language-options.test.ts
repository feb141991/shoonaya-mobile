import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { isSikhTradition, offeredLanguages } from '../lib/languageOptions';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('English and Hindi are offered to every tradition, including unknown ones', () => {
  for (const tradition of ['hindu', 'buddhist', 'jain', 'none', 'sikh', '', null, undefined, 'unknown']) {
    const offered = offeredLanguages(tradition as never);
    assert.ok(offered.includes('en') && offered.includes('hi'), String(tradition));
  }
});

test('Punjabi is offered to Sikh profiles only', () => {
  assert.deepEqual(offeredLanguages('sikh'), ['en', 'hi', 'pa']);
  assert.deepEqual(offeredLanguages(' Sikh '), ['en', 'hi', 'pa'], 'case and spaces do not hide it');
  for (const tradition of ['hindu', 'buddhist', 'jain', 'none', '', '   ', null, undefined, 'sikhism', 'unknown']) {
    assert.deepEqual(offeredLanguages(tradition as never), ['en', 'hi'], `${String(tradition)}: not Sikh, or not loaded, hides Punjabi`);
  }
  assert.equal(isSikhTradition('sikh'), true);
  assert.equal(isSikhTradition('sikhism'), false);
});

test('a saved Punjabi choice stays in its own row even without the Sikh tradition', () => {
  assert.deepEqual(offeredLanguages('hindu', 'pa'), ['en', 'hi', 'pa']);
  assert.deepEqual(offeredLanguages('hindu', 'hi'), ['en', 'hi']);
  assert.deepEqual(offeredLanguages('hindu', null), ['en', 'hi']);
});

test('Settings builds all three language rows from the tradition-aware list, not the full list', () => {
  const screen = read('../app/settings/detail-screen.tsx');
  assert.match(screen, /offeredLanguages\(profileTradition, settings\[row\.key\]\)/);
  assert.doesNotMatch(screen, /SUPPORTED_APP_LANGUAGES\.map/, 'the unfiltered list must not come back');
  assert.doesNotMatch(screen, /const LANGUAGES = /);
});

test('the runtime still supports Punjabi: only the offer is gated, no content or type was removed', () => {
  const runtime = read('../lib/language-runtime.ts');
  assert.match(runtime, /SUPPORTED_APP_LANGUAGES = \['en', 'hi', 'pa'\] as const/);
});
