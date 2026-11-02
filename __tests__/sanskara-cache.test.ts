import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createSanskaraCache } from '../lib/sanskaraCache';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('the cache is keyed by user and expires', () => {
  let t = 1_000;
  const cache = createSanskaraCache<string>(60_000, () => t);
  cache.set('a', 'A-data', cache.ticket());
  assert.equal(cache.get('a'), 'A-data');
  assert.equal(cache.get('b'), null, 'another user never sees it');
  t += 59_999;
  assert.equal(cache.get('a'), 'A-data');
  t += 2;
  assert.equal(cache.get('a'), null, 'expired after 60 seconds');
});

test('a read that started before a clear cannot store its result afterwards', () => {
  const cache = createSanskaraCache<string>();
  const ticket = cache.ticket(); // a fetch begins
  cache.clear('a'); // a write finishes meanwhile
  assert.equal(cache.set('a', 'pre-write data', ticket), false);
  assert.equal(cache.get('a'), null);
  assert.equal(cache.set('a', 'fresh', cache.ticket()), true, 'a fetch that began after the clear stores normally');
  assert.equal(cache.get('a'), 'fresh');
});

test('clearing everything (sign-out) drops every identity and refuses in-flight stores', () => {
  const cache = createSanskaraCache<string>();
  cache.set('a', 'A', cache.ticket());
  cache.set('b', 'B', cache.ticket());
  const inFlight = cache.ticket();
  cache.clear();
  assert.equal(cache.get('a'), null);
  assert.equal(cache.get('b'), null);
  assert.equal(cache.set('a', 'late', inFlight), false);
});

test('wiring: the read path stores with a ticket, and sign-out clears the cache', () => {
  const lib = read('lib/sanskara.ts');
  assert.match(lib, /const ticket = overviewCache\.ticket\(\)/);
  assert.match(lib, /overviewCache\.set\(userId, overview, ticket\)/);
  const layout = read('app/_layout.tsx');
  const signedOut = layout.slice(layout.indexOf("event === 'SIGNED_OUT'"), layout.indexOf("event === 'SIGNED_OUT'") + 400);
  assert.match(signedOut, /clearSanskaraCache\(\)/, 'SIGNED_OUT must clear the Sanskara cache');
});

test('wiring: the screen follows identity changes and drops late responses', () => {
  const screen = read('app/kul/sanskara.tsx');
  assert.match(screen, /supabase\.auth\.onAuthStateChange/, 'the screen must follow sign-in changes, not read the user once');
  assert.match(screen, /sub\.subscription\.unsubscribe\(\)/);
  assert.match(screen, /const isCurrent = \(\) => seq === loadSeqRef\.current && identityRef\.current === userId/);
  const load = screen.slice(screen.indexOf('const loadData'), screen.indexOf('// Active Subject computation'));
  const guard = load.indexOf('if (!isCurrent()) return;');
  assert.ok(guard >= 0, 'the load must check isCurrent');
  assert.ok(guard < load.indexOf('setOverview(overviewData)'), 'identity check precedes publishing');
  assert.ok(load.lastIndexOf('if (!isCurrent()) return;') > load.indexOf('catch'), 'a late failure must not be published either');
});
