import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../lib/productAnalyticsRuntime.ts', import.meta.url), 'utf8');

test('stale consent-cache reads cannot enable analytics after an identity switch', () => {
  const initialize = source.match(/export async function initializeProductAnalytics\([\s\S]*?\n\}/)?.[0];
  assert.ok(initialize);
  assert.match(initialize, /const generation = \+\+initializationGeneration/);
  assert.match(initialize, /if \(generation !== initializationGeneration \|\| activeUserId !== userId\) return;/);
  assert.ok(initialize.indexOf('await AsyncStorage.getItem') < initialize.indexOf('generation !== initializationGeneration'));
  const firstConsentRead = initialize.indexOf('AsyncStorage.getItem');
  assert.ok(firstConsentRead > 0);
  assert.ok(initialize.indexOf('setNativeAnalyticsEnabled(false)') < firstConsentRead);
  assert.ok(initialize.indexOf('setNativePracticeAnalyticsEnabled(false)') < firstConsentRead);
});

test('withdrawal disables local recording before awaiting storage or the network', () => {
  const revoke = source.match(/export async function revokeProductAnalyticsConsent\([\s\S]*?\n\}/)?.[0];
  assert.ok(revoke);
  assert.ok(revoke.indexOf('setNativeAnalyticsEnabled(false)') < revoke.indexOf('await AsyncStorage.setItem'));
  assert.match(revoke, /await deleteNativeAnalyticsHistory\(userId\)/);
});

test('consent withdrawal is bound to the user that requested it, not a later active account', () => {
  assert.match(source, /withdraw: async \(userId\) =>/);
  assert.match(source, /method: 'DELETE',[\s\S]*?expectedUserId: userId/);
});

test('practice-consent withdrawal closes the local practice gate immediately', () => {
  const revoke = source.match(/export async function revokePracticeAnalyticsConsent\([\s\S]*?\n\}/)?.[0];
  assert.ok(revoke);
  assert.ok(revoke.indexOf('setNativePracticeAnalyticsEnabled(false)') < revoke.indexOf('await AsyncStorage.setItem'));
});
