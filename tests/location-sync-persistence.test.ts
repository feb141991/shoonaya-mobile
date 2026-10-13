import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../lib/locationSync.ts', import.meta.url), 'utf8');

test('confirmed location write is owner-scoped and requires exact database read-back', () => {
  const writer = source.match(/async function writeLocationIfChanged\([\s\S]*?\n\}/)?.[0];
  assert.ok(writer, 'the confirmed location writer should exist');
  assert.match(writer, /\.update\(\{ latitude: lat, longitude: lon, city: geocoded\.city, country: geocoded\.country \|\| null \}\)/);
  assert.match(writer, /\.eq\('id', userId\)[\s\S]*\.select\('id, latitude, longitude, city, country'\)[\s\S]*\.single\(\)/);
  assert.match(writer, /data\.id !== userId/);
  assert.match(writer, /data\.latitude !== lat \|\| data\.longitude !== lon \|\| data\.city !== geocoded\.city/);
  assert.ok(writer.indexOf('if (error || !data') < writer.indexOf('lastSyncedUserId = userId'), 'cache is marked synced only after validated read-back');
});

test('passive location sync never prompts or writes when permission is not already granted', () => {
  const sync = source.match(/export async function syncDeviceLocationIfPermitted\([\s\S]*?\n\}/)?.[0];
  assert.ok(sync, 'passive sync should exist');
  assert.match(sync, /getForegroundPermissionsAsync\(\)/);
  assert.match(sync, /if \(permission\.status !== 'granted'\) return;/);
  assert.doesNotMatch(sync, /requestForegroundPermissionsAsync/);
  assert.ok(sync.indexOf("permission.status !== 'granted'") < sync.indexOf('getPosition()'));
  assert.match(sync, /writeLocationIfChanged\(userId, position\.coords\.latitude, position\.coords\.longitude\)/);
});

test('the only location permission prompt remains attached to the explicit request path', () => {
  const explicit = source.match(/export async function requestAndSyncDeviceLocation\([\s\S]*?\n\}/)?.[0];
  assert.ok(explicit, 'explicit location update path should exist');
  assert.match(explicit, /requestForegroundPermissionsAsync\(\)/);
  assert.match(explicit, /return await writeLocationIfChanged/);
});
