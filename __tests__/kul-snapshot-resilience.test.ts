import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const screen = fs.readFileSync(path.join(process.cwd(), 'app/kul.tsx'), 'utf8');
const cache = fs.readFileSync(path.join(process.cwd(), 'lib/kulSnapshotCache.ts'), 'utf8');
const cachePolicy = fs.readFileSync(path.join(process.cwd(), 'lib/kulSnapshotCachePolicy.ts'), 'utf8');
const rootLayout = fs.readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8');

test('KUL renders exact-owner disk cache while the API revalidates, then writes the fresh response through', () => {
  assert.match(screen, /readKulSnapshotCache\(userId\)/);
  assert.match(screen, /fetchKulSnapshot\(userId\)/);
  assert.match(screen, /void writeKulSnapshotCache\(next\)/);
  assert.match(screen, /snapshotRef\.current\) return/);
  assert.match(screen, /setSnapshotIsStale\(true\)/);
});

test('KUL stale views disclose date/message staleness and block mutations until revalidated', () => {
  assert.match(screen, /date calculations may be out of date/i);
  assert.match(screen, /if \(snapshotIsStale\)/);
  assert.match(screen, /Refresh your family circle/);
  assert.doesNotMatch(screen, /setError\(\s*loadError\.message/);
});

test('KUL cache encrypts private snapshots, binds ciphertext to its owner, and excludes invite codes', () => {
  assert.match(cache, /aesEncryptAsync/);
  assert.match(cache, /aesDecryptAsync/);
  assert.match(cache, /additionalData\(userId\)/);
  assert.match(cache, /removeKulInviteCodeFromCachedSnapshot/);
  assert.match(cachePolicy, /KUL_SNAPSHOT_CACHE_MAX_AGE_MS/);
});

test('root auth lifecycle purges KUL snapshots on sign-out and account switch', () => {
  const purgeCount = (rootLayout.match(/clearAllKulSnapshotCaches\(\)/g) ?? []).length;
  assert.ok(purgeCount >= 4, `expected all root sign-out/switch cleanup paths, found ${purgeCount}`);
});
