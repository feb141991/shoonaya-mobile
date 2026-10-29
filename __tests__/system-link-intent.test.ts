import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { beforeEach } from 'node:test';

import {
  canDeliverNotificationTap,
  deliverPendingNotificationTap,
  getPendingNotificationTap,
  NOTIFICATION_TAP_HOLD_MS,
  resetNotificationTapState,
} from '../lib/notificationTap';
import { holdSystemLinkIntent } from '../lib/systemLinkIntent';

beforeEach(() => resetNotificationTapState());

test('a cold product link waits through login and onboarding, preserving its event date', () => {
  assert.equal(holdSystemLinkIntent({ path: 'https://www.shoonaya.com/panchang?date=2026-10-29', initial: true }), '/');
  const held = getPendingNotificationTap();
  assert.equal(held?.href, '/panchang?date=2026-10-29');
  const ready = { appInteractive: true, identityKind: 'authenticated' as const, profileResolutionFailed: false, rootSegment: '(tabs)' };
  assert.equal(canDeliverNotificationTap({ ...ready, identityKind: 'unauthenticated', rootSegment: '(auth)' }), false);
  assert.equal(canDeliverNotificationTap({ ...ready, rootSegment: '(auth)' }), false);
  assert.equal(getPendingNotificationTap(), held);
  assert.equal(canDeliverNotificationTap(ready), true);
  const destinations: HrefLike[] = [];
  deliverPendingNotificationTap((href) => destinations.push(href));
  deliverPendingNotificationTap((href) => destinations.push(href));
  assert.deepEqual(destinations, ['/panchang?date=2026-10-29']);
});

type HrefLike = Parameters<Parameters<typeof deliverPendingNotificationTap>[0]>[0];

test('a warm link leaves navigation to the root and retains the Mandali item', () => {
  const path = 'shoonaya://mandali?postId=12345678-1234-1234-1234-123456789abc';
  assert.equal(holdSystemLinkIntent({ path, initial: false }), '');
  const destinations: HrefLike[] = [];
  deliverPendingNotificationTap((href) => destinations.push(href));
  assert.deepEqual(destinations, ['/mandali?postId=12345678-1234-1234-1234-123456789abc']);
  assert.equal(holdSystemLinkIntent({ path, initial: false }), '');
  assert.ok(getPendingNotificationTap(), 'a deliberate second opening of the same link is not deduplicated away');
});

test('the installed Expo Router does not navigate a warm empty href', () => {
  const source = readFileSync('node_modules/expo-router/build/link/linking.js', 'utf8');
  assert.match(source, /href = await nativeLinking\.redirectSystemPath\(\{ path: href, initial: false \}\)/);
  assert.match(source, /if \(href\) \{\s*listener\(href\);/, 'recheck this contract before upgrading Expo Router');
});

test('callbacks retain their fragments, and unsupported or untrusted URLs do not enter the queue', () => {
  for (const path of [
    'shoonaya://auth/callback#access_token=example&refresh_token=example',
    'shoonaya:///(auth)/login',
    'shoonaya://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081',
    'exp+shoonaya://expo-development-client/?url=x',
    'https://untrusted.example/panchang',
    'https://www.shoonaya.com/unknown-page',
    '/',
    'https://www.shoonaya.com/',
  ]) {
    for (const initial of [true, false]) assert.equal(holdSystemLinkIntent({ path, initial }), path);
    assert.equal(getPendingNotificationTap(), null);
  }
});

test('external aliases resolve to the same promised screen as notifications', () => {
  for (const [path, expected] of [
    ['/home?focus=shloka', '/shloka'],
    ['/home?focus=weekly-summary', '/my-progress'],
    ['/festivals/diwali', '/festival/diwali'],
    ['/nitya-karma/plans', '/nitya-plans'],
  ]) {
    holdSystemLinkIntent({ path, initial: true });
    assert.equal(getPendingNotificationTap()?.href, expected);
  }
});

test('a held system link follows the same expiry policy as a notification tap', () => {
  holdSystemLinkIntent({ path: '/my-progress', initial: true });
  const held = getPendingNotificationTap()!;
  let navigated = false;
  deliverPendingNotificationTap(() => { navigated = true; }, held.receivedAt + NOTIFICATION_TAP_HOLD_MS + 1);
  assert.equal(navigated, false);
  assert.equal(getPendingNotificationTap(), null);
});
