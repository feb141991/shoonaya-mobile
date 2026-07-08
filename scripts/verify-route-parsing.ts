/**
 * Manual verification for lib/routes.ts's pure functions (pathFromUrlLike,
 * resolveNativeRoute) — no React Native/Expo dependency, so they run
 * directly under Node. This repo has no test runner configured (no
 * jest/vitest in package.json), so this script is the documented,
 * re-runnable substitute called out in the notification-system fix task:
 *
 *   npx tsx scripts/verify-route-parsing.ts
 *
 * Exits non-zero if any assertion fails, so it's CI-usable as-is even
 * without a real test framework wired up.
 */
import type { Href } from 'expo-router';

import { pathFromUrlLike, resolveNativeRoute } from '../lib/routes';

let allPassed = true;

function assertEqual(label: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) allPassed = false;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}  ->  actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`);
}

// --- pathFromUrlLike -------------------------------------------------------

assertEqual('pathFromUrlLike("/profile")', pathFromUrlLike('/profile'), '/profile');
assertEqual('pathFromUrlLike("profile")', pathFromUrlLike('profile'), '/profile');

assertEqual(
  'pathFromUrlLike("https://shoonaya.com/profile")',
  pathFromUrlLike('https://shoonaya.com/profile'),
  '/profile'
);
assertEqual(
  'pathFromUrlLike("https://www.shoonaya.com/panchang?x=1")',
  pathFromUrlLike('https://www.shoonaya.com/panchang?x=1'),
  '/panchang?x=1'
);

// shoonaya:// deep links — the WHATWG URL parser treats whatever sits
// between "://" and the next "/", "?", or end as the *host* for ANY
// scheme, not just http(s), so both slash-count variants a link author
// might reasonably produce need to resolve the same way.
assertEqual(
  'pathFromUrlLike("shoonaya://notifications")',
  pathFromUrlLike('shoonaya://notifications'),
  '/notifications'
);
assertEqual(
  'pathFromUrlLike("shoonaya:///dharm-veer/foo")',
  pathFromUrlLike('shoonaya:///dharm-veer/foo'),
  '/dharm-veer/foo'
);
assertEqual(
  'pathFromUrlLike("shoonaya://dharm-veer/foo")',
  pathFromUrlLike('shoonaya://dharm-veer/foo'),
  '/dharm-veer/foo'
);
assertEqual(
  'pathFromUrlLike("shoonaya://path?x=1")',
  pathFromUrlLike('shoonaya://path?x=1'),
  '/path?x=1'
);

// Malformed / unsupported values fall back safely (null), never throw.
assertEqual('pathFromUrlLike(null)', pathFromUrlLike(null), null);
assertEqual('pathFromUrlLike(undefined)', pathFromUrlLike(undefined), null);
assertEqual('pathFromUrlLike("")', pathFromUrlLike(''), null);
assertEqual('pathFromUrlLike("https://[") — malformed', pathFromUrlLike('https://['), null);
assertEqual('pathFromUrlLike("shoonaya://[") — malformed', pathFromUrlLike('shoonaya://['), null);

// --- resolveNativeRoute — end to end through the shoonaya:// + dharm-veer/[id] fix ---

function resolveFromUrlLike(value: string): Href | '(pathFromUrlLike returned null)' {
  const path = pathFromUrlLike(value);
  return path === null ? '(pathFromUrlLike returned null)' : resolveNativeRoute(path);
}

assertEqual(
  'resolveNativeRoute(pathFromUrlLike("shoonaya://dharm-veer/sri-krishna"))',
  resolveFromUrlLike('shoonaya://dharm-veer/sri-krishna'),
  '/dharm-veer/sri-krishna'
);
assertEqual('resolveNativeRoute("/dharm-veer")', resolveNativeRoute('/dharm-veer'), '/dharm-veer');
assertEqual('resolveNativeRoute("/profile")', resolveNativeRoute('/profile'), '/(tabs)/profile');
assertEqual(
  'resolveNativeRoute(pathFromUrlLike("shoonaya://notifications"))',
  resolveFromUrlLike('shoonaya://notifications'),
  '/notifications'
);

console.log(allPassed ? '\nAll assertions passed.' : '\nSome assertions FAILED.');
process.exit(allPassed ? 0 : 1);
