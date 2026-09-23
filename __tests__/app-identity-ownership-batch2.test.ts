import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// Second batch of the reliability-plan item 5 auth-waterfall sweep
// (__tests__/app-identity-ownership.test.ts covers the first batch --
// home/japa/mandali/profile/bhakti/tirtha/login/languageContext/
// sacredCalendarSheet/nitya-dincharya/quiz/seva). Kept as a separate file
// rather than appended to that one because a concurrent session was
// actively extending it while this batch was in progress.
test('Shloka, Nitya Karma, Mantras, Panchang, Japa Insights, Notifications and Settings consume the root-published identity instead of independently re-checking guest/session state', () => {
  const shloka = fs.readFileSync(path.join(process.cwd(), 'app/shloka.tsx'), 'utf8');
  const nityaKarma = fs.readFileSync(path.join(process.cwd(), 'app/nitya-karma.tsx'), 'utf8');
  const mantras = fs.readFileSync(path.join(process.cwd(), 'app/mantras.tsx'), 'utf8');
  const panchang = fs.readFileSync(path.join(process.cwd(), 'app/panchang.tsx'), 'utf8');
  const japaInsights = fs.readFileSync(path.join(process.cwd(), 'app/japa-insights.tsx'), 'utf8');
  const notifications = fs.readFileSync(path.join(process.cwd(), 'app/notifications.tsx'), 'utf8');
  const settingsDetail = fs.readFileSync(path.join(process.cwd(), 'app/settings/detail-screen.tsx'), 'utf8');
  const mood = fs.readFileSync(path.join(process.cwd(), 'lib/mood.ts'), 'utf8');

  for (const [name, src] of [
    ['shloka', shloka],
    ['nityaKarma', nityaKarma],
    ['mantras', mantras],
    ['panchang', panchang],
    ['japaInsights', japaInsights],
    ['notifications', notifications],
    ['settingsDetail', settingsDetail],
  ] as const) {
    assert.match(src, /useAppIdentity\(\)/, `${name} should call useAppIdentity()`);
    assert.doesNotMatch(src, /isGuestMode\(/, `${name} should not independently read the guest flag`);
    assert.doesNotMatch(src, /supabase\.auth\.getUser\(/, `${name} should not independently re-verify the session`);
  }

  // Panchang's loadPanchangContext preserves its TelemetryIdentity return
  // contract exactly -- callers (recordRouteOpen/recordRefreshFailure) rely
  // on it, so the migration must only change the identity *source*, not the
  // shape callers see.
  assert.match(panchang, /identity: TelemetryIdentity = \{ kind: 'guest' \}/);
  assert.match(panchang, /identity = \{ kind: 'authenticated', userId: appIdentity\.userId \}/);

  // Each load/effect pair gates on 'loading' before running, so a screen
  // never flashes an empty "loaded" state for one frame while identity is
  // still resolving -- the exact bug class already fixed once on Home's
  // guest calendarStatus path.
  for (const [name, src] of [
    ['shloka', shloka],
    ['mantras', mantras],
    ['japaInsights', japaInsights],
    ['notifications', notifications],
    ['settingsDetail', settingsDetail],
  ] as const) {
    const loadingGuardCount = (src.match(/if \(appIdentity\.kind === 'loading'\) return;/g) ?? []).length;
    assert.ok(loadingGuardCount >= 2, `${name} should gate both its load function and its calling effect on loading (found ${loadingGuardCount})`);
  }

  // Settings additionally replaces a getSession() call inside the push-token
  // registration path with the same shared identity.
  assert.doesNotMatch(settingsDetail, /supabase\.auth\.getSession\(\)/);
  assert.match(settingsDetail, /registerPushToken\(appIdentity\.userId\)/);

  // lib/mood.ts's telemetry-attribution helper became synchronous, reading
  // the in-memory identity store instead of issuing a network call.
  assert.match(mood, /function getTelemetryUserId\(\): string \| null \{/);
  assert.doesNotMatch(mood, /async function getTelemetryUserId/);
  assert.match(mood, /getAppIdentity\(\)/);
});
