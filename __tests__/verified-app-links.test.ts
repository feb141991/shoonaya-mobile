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
        data?: Array<{ scheme?: string; host?: string; pathPrefix?: string }>;
      }>;
    };
  };
}

const config = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')) as AppConfig;

test('iOS declares the canonical Shoonaya associated domain', () => {
  assert.deepEqual(config.expo.ios.associatedDomains, ['applinks:www.shoonaya.com']);
});

test('Android verifies only supported public Shoonaya route families', () => {
  const filter = config.expo.android.intentFilters?.[0];
  assert.equal(filter?.action, 'VIEW');
  assert.equal(filter?.autoVerify, true);
  assert.deepEqual(filter?.category, ['BROWSABLE', 'DEFAULT']);
  assert.deepEqual(
    filter?.data?.map(entry => entry.pathPrefix),
    ['/panchang', '/vrat', '/festival', '/bhakti', '/pathshala', '/dharm-veer', '/live-darshan', '/seva', '/mantras'],
  );
  assert.ok(filter?.data?.every(entry => entry.scheme === 'https' && entry.host === 'www.shoonaya.com'));
});
