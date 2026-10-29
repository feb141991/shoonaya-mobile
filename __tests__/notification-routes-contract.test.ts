import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { routeForNotificationTap } from '../lib/notificationTap';
import { pathFromUrlLike, resolveNativeRoute } from '../lib/routes';

/**
 * The contract between what the backend writes into a notification and what the app opens.
 *
 * Every row is a URL a backend producer puts in `notifications.action_url` or in the push `data.url`
 * (Sanatan Sangam/Shoonaya, checked 2026-10-29), the screen the app must open for it, and where it comes from. When a
 * producer gains or changes a URL, add or change its row here; a row whose screen does not exist fails the test, which
 * is the point: a notification must never be sent towards a screen the app cannot show.
 *
 * `noNativeScreen` marks the one honest exception: a destination the app has no screen for, which opens the inbox with
 * the tapped notification in it.
 */
const BACKEND_URLS: Array<{ source: string; url: string; opens: string; noNativeScreen?: true }> = [
  { source: 'cron/tithi-reminder (push, absolute)', url: 'https://www.shoonaya.com/panchang', opens: '/panchang' },
  { source: 'cron/nitya-reminder, -madhyahn, -sandhya, brahma-muhurta; nitya-candidate-producer', url: '/nitya-karma', opens: '/nitya-karma' },
  { source: 'cron/nitya-reminder (push, absolute)', url: 'https://www.shoonaya.com/nitya-karma', opens: '/nitya-karma' },
  { source: 'cron/japa-reminder; japa-candidate-producer', url: '/japa', opens: '/japa' },
  { source: 'cron/japa-reminder (push, absolute)', url: 'https://www.shoonaya.com/japa', opens: '/japa' },
  { source: 'cron/mood-reminder, -evening; mood-candidate-producer', url: '/discover/mood', opens: '/mood' },
  { source: 'cron/sattvic-reminder; sattvic-candidate-producer', url: '/bhakti/zen', opens: '/bhakti/zen' },
  { source: 'cron/shloka-reminder; shloka-candidate-producer; notification-delivery-policy', url: '/home?focus=shloka', opens: '/shloka' },
  { source: 'cron/weekly-summary (Home has no section to focus)', url: '/home?focus=weekly-summary', opens: '/(tabs)' },
  { source: 'cron/pitru-paksha-reminder (absolute)', url: 'https://www.shoonaya.com/home', opens: '/(tabs)' },
  { source: 'admin/broadcast (absolute), digest/generate, notifications/diagnostics', url: '/home', opens: '/(tabs)' },
  { source: 'quiz-candidate-producer; notification-delivery-policy', url: '/quiz', opens: '/quiz' },
  { source: 'sankalpa-midpoint-candidate', url: '/sankalpa', opens: '/sankalpa' },
  { source: 'kul-family-remembrance-candidate', url: '/kul?section=family', opens: '/kul?section=family' },
  { source: 'api/sanskar/schedule', url: '/kul', opens: '/kul' },
  { source: 'notification-delivery-policy fallback for sanskar_milestone', url: '/kul/sanskara', opens: '/kul' },
  { source: 'cron/guided-plan-reminder', url: '/nitya-karma/plans', opens: '/nitya-plans' },
  { source: 'cron/journal-anniversary (the app has no journal screen)', url: '/sadhana/journal?focus=anniversary', opens: '/notifications', noNativeScreen: true },
  { source: 'api/notifications/milestone', url: '/my-progress', opens: '/my-progress' },
  { source: 'api/seva-tier/check', url: '/seva', opens: '/seva' },
  { source: 'cron/aarti-notify (absolute)', url: 'https://www.shoonaya.com/live-darshan', opens: '/live-darshan' },
  { source: 'dharm-veer-candidate-producer; learning-pilot-scheduler', url: '/dharm-veer/hero-1', opens: '/dharm-veer/hero-1' },
  { source: 'cron/festival-reminder, vrat-reminder, observance-scheduler (festival, absolute)', url: 'https://www.shoonaya.com/festivals/diwali', opens: '/festival/diwali' },
  { source: 'pradosha, sankranti, series candidate producers', url: '/festivals/maha-shivaratri', opens: '/festival/maha-shivaratri' },
  { source: 'buildObservanceActionPath with no slug', url: '/panchang', opens: '/panchang' },
  { source: 'buildObservanceActionPath (vrat)', url: '/vrat/ekadashi', opens: '/vrat/ekadashi' },
  { source: 'parana-candidate-producer', url: '/vrat/papankusha-ekadashi', opens: '/vrat/papankusha-ekadashi' },
  { source: 'buildObservanceActionPath (vrat, no slug)', url: '/vrat', opens: '/vrat' },
  { source: 'a vrat slug that is a series member', url: '/vrat/durga-ashtami', opens: '/festival/durga-ashtami' },
  { source: 'Mandali triggers (8: connection_*, post_reaction, comment_reaction, user_blocked, content_reported)', url: '/mandali', opens: '/mandali' },
  { source: 'digest/generate action', url: '/pathshala', opens: '/(tabs)/pathshala' },
  { source: 'notification-delivery-policy default for an unknown type', url: '/discover/mood', opens: '/mood' },
];

// ── The app's screens ───────────────────────────────────────────────────────

const APP_DIR = join(__dirname, '..', 'app');

function listScreens(): string[] {
  const screens: string[] = [];
  const walk = (dir: string, prefix: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full, `${prefix}/${name}`);
      } else if (name.endsWith('.tsx') && !name.startsWith('_layout') && !name.startsWith('+')) {
        const route = `${prefix}/${name.replace(/\.tsx$/, '')}`.replace(/\/index$/, '').replace(/\/\([^/)]+\)/g, '');
        screens.push(route === '' ? '/' : route);
      }
    }
  };
  walk(APP_DIR, '');
  return screens;
}

const SCREENS = listScreens();

/** Does a route such as "/(tabs)/pathshala" or "/festival/diwali?x=1" land on a screen that exists? */
function screenExists(route: string): boolean {
  const pathname = (route.split('?')[0].replace(/\/\([^/)]+\)/g, '') || '/');
  return SCREENS.some((screen) => {
    if (screen === pathname) return true;
    if (!screen.includes('[')) return false;
    return new RegExp(`^${screen.replace(/\[[^\]]+\]/g, '[^/]+')}$`).test(pathname);
  });
}

test('the screen scan sees the screens it should (guards against a scan that silently finds nothing)', () => {
  for (const known of ['/shloka', '/my-progress', '/nitya-plans', '/kul/join', '/mood', '/pathshala', '/festival/[slug]']) {
    assert.ok(SCREENS.includes(known) || known === '/pathshala', `${known} not found among ${SCREENS.length} screens`);
  }
  assert.ok(SCREENS.length > 40);
  assert.equal(screenExists('/festival/diwali'), true);
  assert.equal(screenExists('/(tabs)/pathshala'), true);
  assert.equal(screenExists('/sadhana/journal'), false);
  assert.equal(screenExists('/kul/sanskara'), false);
});

// ── Backend URL -> screen ───────────────────────────────────────────────────

for (const row of BACKEND_URLS) {
  test(`notification url ${row.url} (${row.source}) opens ${row.opens}`, () => {
    // The route table, as the inbox uses it (the url as stored) ...
    const path = pathFromUrlLike(row.url)!;
    assert.equal(String(resolveNativeRoute(path, '/notifications')), row.opens);
    // ... and a tap on the push, exactly as the tap handler does it.
    assert.equal(String(routeForNotificationTap({ type: 'general', url: row.url })), row.opens);

    if (row.noNativeScreen) {
      assert.equal(row.opens, '/notifications');
    } else {
      assert.ok(screenExists(row.opens), `${row.opens} is not a screen in app/`);
      assert.notEqual(row.opens, '/notifications', 'a real destination must not be the inbox fallback');
    }
  });
}

test('the only notification destinations that open Home are the ones that mean Home', () => {
  const opensHome = BACKEND_URLS.filter((row) => row.opens === '/(tabs)').map((row) => row.url);
  // Decision recorded 2026-10-29: Pitru Paksha should open the Panchang, which needs a backend change to its url;
  // until that ships it is listed here so no other notification starts opening Home by accident.
  assert.deepEqual(opensHome.sort(), ['/home', '/home?focus=weekly-summary', 'https://www.shoonaya.com/home'].sort());
});

// ── Screen -> reachable ─────────────────────────────────────────────────────

/**
 * Screens that are not notification or link targets, with the reason. A screen missing from the route table and from
 * this list is one a notification or a shared link can never reach, which is how /my-progress and /nitya-plans went
 * unlinked. Add a screen's route to resolveNativeRoute, or list it here with the reason.
 */
const NOT_A_LINK_TARGET: Record<string, string> = {
  '/': 'the index route; it redirects to the tabs',
  '/login': 'sign-in flow',
  '/onboarding': 'onboarding flow, entered by the startup router only',
  '/sanctuary-preparing': 'shown once after onboarding by the onboarding flow',
  '/auth/callback': 'sign-in return, handled by the auth code and left untouched by the system-link mapping',
  '/ai-chat': 'Dharma Mitra chat: opened from inside the app; no producer links to it',
  '/dyuta': 'a game, opened from inside the app',
  '/play': 'a game, opened from inside the app',
  '/pathshala/insights': 'opened from inside Pathshala',
  '/pathshala/saved': 'opened from inside Pathshala',
};

test('every screen can be reached by a link, or is listed with the reason it cannot', () => {
  const unreachable: string[] = [];
  for (const screen of SCREENS) {
    if (screen in NOT_A_LINK_TARGET) continue;
    // A dynamic screen is probed with a plausible value.
    const probe = screen.replace(/\[[^\]]+\]/g, 'sample');
    const resolved = String(resolveNativeRoute(probe, '/__unreachable__' as unknown as Parameters<typeof resolveNativeRoute>[1]));
    if (resolved === '/__unreachable__') unreachable.push(screen);
  }
  assert.deepEqual(unreachable, [], `screens no link can open: ${unreachable.join(', ')}`);
});

test('every entry in the not-a-link-target list is a real screen', () => {
  for (const screen of Object.keys(NOT_A_LINK_TARGET)) {
    assert.ok(SCREENS.includes(screen), `${screen} is listed but is not a screen (remove it)`);
  }
});
