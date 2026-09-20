/**
 * Manual verification for lib/routes.ts's pure functions (pathFromUrlLike,
 * resolveNativeRoute) — no React Native/Expo dependency, so they run
 * directly under Node. `npm test` (node:test, via __tests__/*.test.ts and
 * tests/*.test.ts) now covers the rest of the app, but this script lives
 * outside both globs and stays as the documented, re-runnable substitute
 * called out in the notification-system fix task:
 *
 *   npx tsx scripts/verify-route-parsing.ts
 *
 * Exits non-zero if any assertion fails, so it's CI-usable as-is even
 * without wiring it into the node:test suite.
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

// --- resolveNativeRoute — prefix-collision and missing-dispatch fixes ---
// Bhakti sub-routes previously swallowed by the blanket '/bhakti' fallback.
assertEqual('resolveNativeRoute("/bhakti/stotram/hanuman-chalisa")', resolveNativeRoute('/bhakti/stotram/hanuman-chalisa'), '/bhakti/stotram/hanuman-chalisa');
assertEqual('resolveNativeRoute("/bhakti/katha/bhagavad-gita-katha")', resolveNativeRoute('/bhakti/katha/bhagavad-gita-katha'), '/bhakti/katha/bhagavad-gita-katha');
assertEqual('resolveNativeRoute("/bhakti/katha")', resolveNativeRoute('/bhakti/katha'), '/bhakti/katha');
assertEqual('resolveNativeRoute("/bhakti/browse")', resolveNativeRoute('/bhakti/browse'), '/bhakti/browse');
assertEqual('resolveNativeRoute("/bhakti/zen")', resolveNativeRoute('/bhakti/zen'), '/bhakti/zen');
assertEqual('resolveNativeRoute("/bhakti/insights")', resolveNativeRoute('/bhakti/insights'), '/bhakti/insights');
// Bare /bhakti must still land on the hub tab (regression check).
assertEqual('resolveNativeRoute("/bhakti")', resolveNativeRoute('/bhakti'), '/(tabs)/bhakti');
// Another seeker's profile, previously hijacked by the blanket '/profile' fallback.
assertEqual('resolveNativeRoute("/profile/abc123")', resolveNativeRoute('/profile/abc123'), '/profile/abc123');
// Screens that had no dispatch line at all.
assertEqual('resolveNativeRoute("/shloka")', resolveNativeRoute('/shloka'), '/shloka');
assertEqual('resolveNativeRoute("/my-progress/ledger")', resolveNativeRoute('/my-progress/ledger'), '/my-progress/ledger');
assertEqual('resolveNativeRoute("/mantras")', resolveNativeRoute('/mantras'), '/mantras');
assertEqual('resolveNativeRoute("/name-story")', resolveNativeRoute('/name-story'), '/name-story');
assertEqual('resolveNativeRoute("/festival-quiz/sharad-navratri")', resolveNativeRoute('/festival-quiz/sharad-navratri'), '/festival-quiz/sharad-navratri');
assertEqual('resolveNativeRoute("/settings")', resolveNativeRoute('/settings'), '/settings');
assertEqual('resolveNativeRoute("/settings/notifications")', resolveNativeRoute('/settings/notifications'), '/settings/notifications');
assertEqual('resolveNativeRoute("/nitya-ashrama")', resolveNativeRoute('/nitya-ashrama'), '/nitya-ashrama');
assertEqual('resolveNativeRoute("/nitya-dincharya")', resolveNativeRoute('/nitya-dincharya'), '/nitya-dincharya');
assertEqual('resolveNativeRoute("/nitya-plans")', resolveNativeRoute('/nitya-plans'), '/nitya-plans');
// Mood check-in notification routing (PWA /discover/mood and native /mood)
assertEqual('resolveNativeRoute("/discover/mood")', resolveNativeRoute('/discover/mood'), '/mood');
assertEqual('resolveNativeRoute("/mood")', resolveNativeRoute('/mood'), '/mood');
// Unchanged neighbor, regression check.
assertEqual('resolveNativeRoute("/nitya-karma")', resolveNativeRoute('/nitya-karma'), '/nitya-karma');

console.log(allPassed ? '\nAll assertions passed.' : '\nSome assertions FAILED.');
process.exit(allPassed ? 0 : 1);
