import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

interface AppConfig {
  expo: {
    ios: { associatedDomains?: string[] };
    android: {
      intentFilters?: Array<{
        action: string;
        autoVerify?: boolean;
        category?: string[];
        data?: Array<{ scheme?: string; host?: string; path?: string; pathPrefix?: string }>;
      }>;
    };
  };
}

const config = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')) as AppConfig;

test('iOS declares the canonical Shoonaya associated domain', () => {
  assert.deepEqual(config.expo.ios.associatedDomains, [
    'applinks:www.shoonaya.com',
    'applinks:shoonaya.com',
  ]);
});

test('Android verifies only supported public Shoonaya route families', () => {
  const filter = config.expo.android.intentFilters?.[0];
  assert.equal(filter?.action, 'VIEW');
  assert.equal(filter?.autoVerify, true);
  assert.deepEqual(filter?.category, ['BROWSABLE', 'DEFAULT']);

  const allowedHosts = new Set(['www.shoonaya.com', 'shoonaya.com']);
  assert.ok(filter?.data?.every(entry => entry.scheme === 'https' && entry.host && allowedHosts.has(entry.host)));

  const rootEntries = filter?.data?.filter(entry => entry.path === '/');
  assert.equal(rootEntries?.length, 2);
  assert.deepEqual(rootEntries?.map(e => e.host).sort(), ['shoonaya.com', 'www.shoonaya.com']);

  const expectedPrefixes = [
    '/panchang',
    '/vrat',
    '/festival',
    '/festivals',
    '/bhakti',
    '/pathshala',
    '/dharm-veer',
    '/live-darshan',
    '/seva',
    '/mantras',
    '/kul',
    '/home',
    '/mandali',
    '/my-progress',
    '/nitya-karma',
    '/nitya-plans',
    '/notifications',
    '/shloka',
    '/rashiphala',
    '/rashiphal',
    '/kundali',
    '/sankalpa',
    '/settings',
    '/features',
    '/about',
    '/guest',
  ];

  for (const host of ['www.shoonaya.com', 'shoonaya.com']) {
    const hostPrefixes: Array<string | undefined> = (filter?.data ?? [])
      .filter(entry => entry.host === host && entry.pathPrefix)
      .map(e => e.pathPrefix);
    assert.deepEqual(hostPrefixes, expectedPrefixes);
  }
});
