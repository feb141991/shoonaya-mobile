import assert from 'node:assert/strict';
import test from 'node:test';

import { mapSystemPath } from '../lib/systemLinkRoute';

test('the names the website and backend use are renamed to the screens that exist', () => {
  assert.equal(mapSystemPath('https://www.shoonaya.com/festivals/diwali'), '/festival/diwali');
  assert.equal(mapSystemPath('shoonaya://festivals/diwali'), '/festival/diwali');
  assert.equal(mapSystemPath('/festivals/diwali?ref=email'), '/festival/diwali?ref=email');
  assert.equal(mapSystemPath('https://www.shoonaya.com/home'), '/');
  assert.equal(mapSystemPath('shoonaya://home'), '/');
  assert.equal(mapSystemPath('https://www.shoonaya.com/discover/mood'), '/mood');
  assert.equal(mapSystemPath('https://www.shoonaya.com/rashiphal'), '/rashiphala');
});

test('a series member listed under /vrat opens the festival screen, like a tapped notification', () => {
  assert.equal(mapSystemPath('https://www.shoonaya.com/vrat/durga-ashtami'), '/festival/durga-ashtami');
  assert.equal(mapSystemPath('https://www.shoonaya.com/vrat/ekadashi'), 'https://www.shoonaya.com/vrat/ekadashi');
});

test('links that already match a screen are returned exactly as received', () => {
  for (const link of [
    'https://www.shoonaya.com/panchang',
    'https://www.shoonaya.com/festival/diwali',
    'https://www.shoonaya.com/kul/join?code=abc',
    'shoonaya://dharm-veer/hero-1',
    '/pathshala/path-1/lesson-2',
  ]) {
    assert.equal(mapSystemPath(link), link);
  }
});

test('a dated Panchang link is not collapsed to today: a wrong date must not be shown as the right one', () => {
  const link = 'https://www.shoonaya.com/panchang/2026-10-29';
  assert.equal(mapSystemPath(link), '/panchang?date=2026-10-29');
});

test('the sign-in return and development-client links reach Expo Router untouched', () => {
  for (const link of [
    'shoonaya://auth/callback?code=abc',
    'shoonaya://auth/callback#access_token=abc&refresh_token=def',
    'shoonaya:///(auth)/login',
    'shoonaya://expo-development-client/?url=http%3A%2F%2F192.168.1.2%3A8081',
    'exp+shoonaya://expo-development-client/?url=x',
  ]) {
    assert.equal(mapSystemPath(link), link, link);
  }
});

test('the root, empty and unparseable links are returned as received', () => {
  for (const link of ['/', 'https://www.shoonaya.com/', 'https://www.shoonaya.com', '', 'shoonaya://']) {
    assert.equal(mapSystemPath(link), link, JSON.stringify(link));
  }
});

test('a path that is not one of ours is left for Expo Router to handle', () => {
  const link = 'https://www.shoonaya.com/some/page/we/never/made';
  assert.equal(mapSystemPath(link), link);
});

test('system aliases retain the same destinations as push taps', () => {
  assert.equal(mapSystemPath('/home?focus=weekly-summary'), '/my-progress');
  assert.equal(mapSystemPath('/home?focus=shloka'), '/shloka');
  assert.equal(mapSystemPath('/nitya-karma/plans'), '/nitya-plans');
  assert.equal(mapSystemPath('/kul/sanskara'), '/kul');
});
