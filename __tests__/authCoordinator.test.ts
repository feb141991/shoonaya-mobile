import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Session } from '@supabase/supabase-js';
import {
  AuthCoordinator,
  type AuthCoordinatorDependencies,
  type AuthRouteSegments,
  type BootstrapProfileResult,
  type OnboardingStatus,
} from '../lib/authCoordinator';
import type { AppIdentity } from '../lib/appIdentity';
import type { StartupPreferences } from '../lib/startup-scenes/types';

const DEFAULT_PREFS: StartupPreferences = {
  tradition: 'hindu',
  timezone: 'Asia/Kolkata',
  language: 'en',
};

function fakeSession(userId: string, email: string | null = 'user@example.com'): Session {
  return {
    user: { id: userId, email },
  } as unknown as Session;
}

function tabsSegments(): AuthRouteSegments {
  return { rootSegment: '(tabs)', childSegment: undefined };
}

function loginSegments(): AuthRouteSegments {
  return { rootSegment: '(auth)', childSegment: 'login' };
}

type Recorder = {
  identities: AppIdentity[];
  redirects: Array<'/(tabs)' | '/(auth)/login' | '/(auth)/onboarding'>;
  apiTokenSessions: Array<Session | null>;
  prewarmGuestCalls: number;
  prewarmAuthenticatedCalls: string[];
  signOutClearCalls: number;
  switchClearCalls: string[];
  unregisterPushCalls: number;
  registerPushCalls: string[];
  timezoneSyncCalls: string[];
  locationSyncCalls: string[];
  offerNotificationCalls: string[];
  onboardingCacheWrites: Array<{ userId: string; value: 'true' | 'false' }>;
  profileResolutionFailures: Array<string | null>;
  bootstrapCalls: number;
};

function makeDeps(overrides: Partial<AuthCoordinatorDependencies> = {}): { deps: AuthCoordinatorDependencies; rec: Recorder } {
  const rec: Recorder = {
    identities: [],
    redirects: [],
    apiTokenSessions: [],
    prewarmGuestCalls: 0,
    prewarmAuthenticatedCalls: [],
    signOutClearCalls: 0,
    switchClearCalls: [],
    unregisterPushCalls: 0,
    registerPushCalls: [],
    timezoneSyncCalls: [],
    locationSyncCalls: [],
    offerNotificationCalls: [],
    onboardingCacheWrites: [],
    profileResolutionFailures: [],
    bootstrapCalls: 0,
  };

  const base: AuthCoordinatorDependencies = {
    setAppIdentity: (identity) => { rec.identities.push(identity); },
    setApiAccessTokenFromSession: (session) => { rec.apiTokenSessions.push(session); },
    redirect: (path) => { rec.redirects.push(path); },
    isGuestMode: async () => false,
    setGuestMode: async () => {},
    prewarmGuestCaches: () => { rec.prewarmGuestCalls += 1; },
    prewarmAuthenticatedCaches: (userId) => { rec.prewarmAuthenticatedCalls.push(userId); },
    clearAllPrivateCachesForSignOut: () => { rec.signOutClearCalls += 1; },
    clearAllPrivateCachesForSwitch: (previousUserId) => { rec.switchClearCalls.push(previousUserId); },
    unregisterPushToken: () => { rec.unregisterPushCalls += 1; },
    registerPushToken: (userId) => { rec.registerPushCalls.push(userId); },
    syncDeviceTimezone: (userId) => { rec.timezoneSyncCalls.push(userId); },
    syncDeviceLocationIfPermitted: (userId) => { rec.locationSyncCalls.push(userId); },
    offerNotificationPermission: (userId) => { rec.offerNotificationCalls.push(userId); },
    getStartupPreferences: async () => DEFAULT_PREFS,
    clearDeviceStartupPreferences: async () => {},
    applyStartupPreferences: () => {},
    getOnboardingCache: async () => null,
    setOnboardingCache: async (userId, value) => { rec.onboardingCacheWrites.push({ userId, value }); },
    fetchOnboardingStatus: async () => ({ onboarding_completed: true }),
    bootstrapProfile: async () => { rec.bootstrapCalls += 1; return { ok: true, status: 200, onboardingCompleted: true }; },
    onProfileResolutionFailure: (userId) => { rec.profileResolutionFailures.push(userId); },
    ...overrides,
  };

  return { deps: base, rec };
}

describe('AuthCoordinator -- unit matrix for the implementation behind USE_AUTH_COORDINATOR (layout parity is checked separately)', () => {
  it('1. cold authenticated launch: identity set, caches prewarmed, no redirect needed from tabs', async () => {
    const { deps, rec } = makeDeps({
      fetchOnboardingStatus: async () => ({ onboarding_completed: true }),
    });
    const coordinator = new AuthCoordinator(deps);

    await coordinator.routeForSession(fakeSession('u1'), tabsSegments());

    assert.deepEqual(rec.identities, [{ kind: 'authenticated', userId: 'u1', email: 'user@example.com' }]);
    assert.deepEqual(rec.prewarmAuthenticatedCalls, ['u1']);
    assert.deepEqual(rec.redirects, [], 'already on tabs, not in the auth group -- no redirect should fire');
    assert.deepEqual(rec.onboardingCacheWrites, [{ userId: 'u1', value: 'true' }]);
    assert.deepEqual(rec.offerNotificationCalls, ['u1']);
    assert.deepEqual(rec.profileResolutionFailures, [null]);
  });

  it('2. guest launch: identity set to guest, guest caches prewarmed, redirected off the login screen', async () => {
    const { deps, rec } = makeDeps({ isGuestMode: async () => true });
    const coordinator = new AuthCoordinator(deps);

    await coordinator.routeForSession(null, loginSegments());

    assert.deepEqual(rec.identities, [{ kind: 'loading' }, { kind: 'guest' }]);
    assert.equal(rec.prewarmGuestCalls, 1);
    assert.deepEqual(rec.redirects, ['/(tabs)']);
    assert.equal(rec.unregisterPushCalls, 1, 'a null session always unregisters the push token, guest or not');
  });

  it('3. expired token (no session, not guest): identity set to unauthenticated, redirected to login', async () => {
    const { deps, rec } = makeDeps({ isGuestMode: async () => false });
    const coordinator = new AuthCoordinator(deps);

    await coordinator.routeForSession(null, tabsSegments());

    assert.deepEqual(rec.identities, [{ kind: 'loading' }, { kind: 'unauthenticated' }]);
    assert.deepEqual(rec.redirects, ['/(auth)/login']);
  });

  it('4. temporary 401 on profile repair: first attempt fails into the recovery screen, retry succeeds', async () => {
    let bootstrapAttempt = 0;
    const bootstrapProfile = async (): Promise<BootstrapProfileResult> => {
      bootstrapAttempt += 1;
      return bootstrapAttempt === 1
        ? { ok: false, status: 401, onboardingCompleted: null }
        : { ok: true, status: 200, onboardingCompleted: true };
    };
    const { deps, rec } = makeDeps({
      fetchOnboardingStatus: async () => null, // profiles row missing -> triggers bootstrap
      bootstrapProfile,
    });
    const coordinator = new AuthCoordinator(deps);
    const session = fakeSession('u1');

    await coordinator.routeForSession(session, tabsSegments());
    assert.deepEqual(rec.profileResolutionFailures, ['u1'], 'a failed bootstrap must surface the recovery screen for this user');

    // Mirrors app/_layout.tsx's retryProfileResolution: reset the dedup key
    // so the identical session is not short-circuited, then route again.
    coordinator.resetRouteDedup();
    await coordinator.routeForSession(session, tabsSegments());

    assert.deepEqual(rec.profileResolutionFailures, ['u1', null], 'the retry must clear the recovery screen once bootstrap succeeds');
  });

  it('5. OAuth return: a fresh session arriving while still on the login screen redirects into the app', async () => {
    const { deps, rec } = makeDeps({
      fetchOnboardingStatus: async () => ({ onboarding_completed: true }),
    });
    const coordinator = new AuthCoordinator(deps);

    await coordinator.routeForSession(fakeSession('u1'), loginSegments());

    assert.deepEqual(rec.redirects, ['/(tabs)']);
  });

  it('6. sign-out during bootstrap: a stale in-flight repair must not resurrect state after sign-out', async () => {
    let resolveBootstrap!: (value: BootstrapProfileResult) => void;
    const bootstrapPromise = new Promise<BootstrapProfileResult>((resolve) => {
      resolveBootstrap = resolve;
    });
    const { deps, rec } = makeDeps({
      fetchOnboardingStatus: async () => null,
      bootstrapProfile: () => bootstrapPromise,
      isGuestMode: async () => false,
    });
    const coordinator = new AuthCoordinator(deps);

    const firstCall = coordinator.routeForSession(fakeSession('u1'), tabsSegments());
    // Let every microtask-resolving await before the bootstrap call
    // (getStartupPreferences, setGuestMode, getOnboardingCache,
    // fetchOnboardingStatus) actually drain, so the first call is
    // genuinely suspended inside `await d.bootstrapProfile()` -- not just
    // started -- before the sign-out below runs. A bare microtask flush
    // (`await Promise.resolve()`) only advances one tick at a time and
    // would leave this test passing for the wrong reason (an earlier,
    // unrelated guard), the way an earlier draft of this test did.
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Sign-out happens while the first call's bootstrap request is still in flight.
    await coordinator.routeForSession(null, tabsSegments());
    assert.deepEqual(rec.identities.at(-1), { kind: 'unauthenticated' });
    // The sign-out call itself legitimately clears any stale recovery
    // screen from a previous user -- capture that baseline before checking
    // that the *stale* first call contributes nothing further.
    const failuresAfterSignOut = [...rec.profileResolutionFailures];

    // Now the stale bootstrap call resolves successfully.
    resolveBootstrap({ ok: true, status: 200, onboardingCompleted: true });
    await firstCall;

    assert.deepEqual(
      rec.profileResolutionFailures,
      failuresAfterSignOut,
      'the superseded first call must not write a recovery-screen decision after a newer generation has already run'
    );
    assert.deepEqual(
      rec.identities.at(-1),
      { kind: 'unauthenticated' },
      'the stale call must not overwrite the identity the sign-out already established'
    );
  });

  it('7. A -> B account switch: the previous user\'s cache is cleared by user id, not the new user\'s cache', async () => {
    const { deps, rec } = makeDeps({
      fetchOnboardingStatus: async () => ({ onboarding_completed: true }),
    });
    const coordinator = new AuthCoordinator(deps);

    await coordinator.routeForSession(fakeSession('u1'), tabsSegments());
    await coordinator.routeForSession(fakeSession('u2'), tabsSegments());

    assert.deepEqual(rec.switchClearCalls, ['u1']);
    assert.deepEqual(rec.prewarmAuthenticatedCalls, ['u1', 'u2']);
    assert.equal(rec.signOutClearCalls, 0, 'an account switch is not a sign-out -- the sign-out clear path must not also fire');
    assert.ok(
      rec.identities.some((i) => i.kind === 'loading'),
      'identity must pass through loading during the switch, masking the previous account'
    );
  });

  it('8. offline launch with cached profile: renders from cache immediately; a failed background revalidation is swallowed, not thrown, and never alters routing', async () => {
    // Two otherwise-identical runs -- one where the background
    // revalidation succeeds, one where it rejects (offline) -- to prove
    // the .catch() documented in authCoordinator.ts's cached === 'true'
    // branch is purely defensive: it must not change any observable
    // routing/identity decision, only stop the rejection from going
    // unhandled. This is the direct test that INTENTIONAL RELIABILITY FIX
    // comment in the source points at.
    const online = makeDeps({
      getOnboardingCache: async () => 'true',
      fetchOnboardingStatus: async () => ({ onboarding_completed: true }),
    });
    const offline = makeDeps({
      getOnboardingCache: async () => 'true',
      fetchOnboardingStatus: async () => { throw new Error('network unreachable'); },
    });

    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => { unhandledRejections.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      await new AuthCoordinator(online.deps).routeForSession(fakeSession('u1'), tabsSegments());
      await new AuthCoordinator(offline.deps).routeForSession(fakeSession('u1'), tabsSegments());
      // Give both fire-and-forget background revalidations a full
      // macrotask to settle (and, if the offline one were unhandled, to
      // actually surface as an 'unhandledRejection' event) before asserting.
      await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }

    assert.deepEqual(unhandledRejections, [], 'the rejected background revalidation must never surface as an unhandled rejection');
    assert.deepEqual(
      offline.rec.redirects, online.rec.redirects,
      'a failed revalidation must not change routing relative to a successful one'
    );
    assert.deepEqual(
      offline.rec.identities, online.rec.identities,
      'a failed revalidation must not change the published identity relative to a successful one'
    );
    assert.deepEqual(offline.rec.profileResolutionFailures, [null]);
    assert.deepEqual(offline.rec.offerNotificationCalls, ['u1']);
    assert.deepEqual(offline.rec.onboardingCacheWrites, [], 'a failed revalidation must not write a cache value');
    assert.deepEqual(online.rec.onboardingCacheWrites, [{ userId: 'u1', value: 'true' }], 'control run: a successful revalidation still writes its cache value');
  });

  it('9. missing profile repair: a null profiles row is repaired via bootstrap and then treated as complete', async () => {
    let fetchCalls = 0;
    const { deps, rec } = makeDeps({
      fetchOnboardingStatus: async (): Promise<OnboardingStatus> => {
        fetchCalls += 1;
        return null; // simulates the missing row the bootstrap repairs
      },
      bootstrapProfile: async () => ({ ok: true, status: 200, onboardingCompleted: true }),
    });
    const coordinator = new AuthCoordinator(deps);

    await coordinator.routeForSession(fakeSession('u1'), tabsSegments());

    assert.equal(fetchCalls, 1);
    assert.deepEqual(rec.profileResolutionFailures, [null]);
    assert.deepEqual(rec.onboardingCacheWrites, [{ userId: 'u1', value: 'true' }]);
    assert.deepEqual(rec.offerNotificationCalls, ['u1']);
  });
});

// Pre-wiring checklist items 3-7 (checkpoint review, 2026-09-22): scenarios
// beyond the original 9, specifically requested before app/_layout.tsx may
// be wired to call AuthCoordinator. Items 1 (parity against the inline
// implementation) and 2 (realistic onAuthStateChange event-scheduling
// simulation) live in authCoordinator-integration.test.ts instead -- both
// need a different testing shape than the plain-unit-fake style here. Item
// 8 (keep the old implementation available for rollback) is not a test; it
// is honored by simply not touching app/_layout.tsx yet.
describe('AuthCoordinator -- pre-wiring checklist items 3-7', () => {
  it('3a. back-to-back A -> B with no settling time between events: final state reflects B, not a torn mix of both', async () => {
    const { deps, rec } = makeDeps({
      fetchOnboardingStatus: async () => ({ onboarding_completed: true }),
    });
    const coordinator = new AuthCoordinator(deps);

    // Deliberately not awaited between calls -- this is what a real
    // onAuthStateChange listener firing twice in quick succession (e.g.
    // TOKEN_REFRESHED immediately followed by a fast account switch) looks
    // like: both invocations start before either has settled.
    const callA = coordinator.routeForSession(fakeSession('userA'), tabsSegments());
    const callB = coordinator.routeForSession(fakeSession('userB'), tabsSegments());
    await Promise.all([callA, callB]);

    assert.deepEqual(rec.identities.at(-1), { kind: 'authenticated', userId: 'userB', email: 'user@example.com' });
    assert.deepEqual(rec.prewarmAuthenticatedCalls, ['userA', 'userB']);
  });

  it('3b. back-to-back A -> signed-out with no settling time between events: final state is unauthenticated', async () => {
    const { deps, rec } = makeDeps({
      fetchOnboardingStatus: async () => ({ onboarding_completed: true }),
      isGuestMode: async () => false,
    });
    const coordinator = new AuthCoordinator(deps);

    const callA = coordinator.routeForSession(fakeSession('userA'), tabsSegments());
    const callSignOut = coordinator.routeForSession(null, tabsSegments());
    await Promise.all([callA, callSignOut]);

    assert.deepEqual(rec.identities.at(-1), { kind: 'unauthenticated' });
    assert.equal(rec.signOutClearCalls, 1);
  });

  it('4. token refresh for the same user: identity and API token update, but the full routing/bootstrap path does not repeat', async () => {
    const { deps, rec } = makeDeps({
      fetchOnboardingStatus: async () => ({ onboarding_completed: true }),
    });
    const coordinator = new AuthCoordinator(deps);

    const firstSession = fakeSession('u1');
    await coordinator.routeForSession(firstSession, tabsSegments());
    assert.equal(rec.prewarmAuthenticatedCalls.length, 1);
    assert.equal(rec.registerPushCalls.length, 1);
    assert.equal(rec.onboardingCacheWrites.length, 1);

    // A TOKEN_REFRESHED event: a new Session object (new access token), same
    // user id.
    const refreshedSession = fakeSession('u1', 'user@example.com');
    await coordinator.routeForSession(refreshedSession, tabsSegments());

    assert.equal(rec.apiTokenSessions.length, 2, 'the API client token must still be updated on every call, including a refresh');
    assert.deepEqual(rec.identities.at(-1), { kind: 'authenticated', userId: 'u1', email: 'user@example.com' });
    // None of the once-per-real-routing-decision side effects repeat for a
    // same-user refresh -- the coordinator's fast path (lastRouteKey ===
    // routeKey) returns immediately after re-publishing identity.
    assert.equal(rec.prewarmAuthenticatedCalls.length, 1, 'cache prewarm must not repeat on a same-user token refresh');
    assert.equal(rec.registerPushCalls.length, 1, 'push token registration must not repeat on a same-user token refresh');
    assert.equal(rec.onboardingCacheWrites.length, 1, 'the onboarding gate must not re-run on a same-user token refresh');
    assert.equal(rec.bootstrapCalls, 0);
  });

  it('5a. authenticated routing side effects (push, timezone, location sync) fire on every session, even one whose profile bootstrap fails', async () => {
    const { deps, rec } = makeDeps({
      fetchOnboardingStatus: async () => null,
      bootstrapProfile: async () => ({ ok: false, status: 500, onboardingCompleted: null }),
    });
    const coordinator = new AuthCoordinator(deps);

    await coordinator.routeForSession(fakeSession('u1'), tabsSegments());

    assert.deepEqual(rec.profileResolutionFailures, ['u1'], 'sanity check: this scenario really is a failed bootstrap');
    // These three fire before the onboarding gate is even reached in the
    // real function (see the comment above them in authCoordinator.ts) --
    // faithfully preserved, and worth a direct assertion since it is easy
    // to assume (incorrectly) that a failed profile repair suppresses them.
    assert.deepEqual(rec.registerPushCalls, ['u1']);
    assert.deepEqual(rec.timezoneSyncCalls, ['u1']);
    assert.deepEqual(rec.locationSyncCalls, ['u1']);
    // offerNotificationPermission, by contrast, IS gated behind a
    // successful outcome and must not fire here.
    assert.deepEqual(rec.offerNotificationCalls, []);
  });

  it('5b. authenticated-session side effects never fire for a signed-out or guest routing decision', async () => {
    const { deps, rec } = makeDeps({ isGuestMode: async () => true });
    const coordinator = new AuthCoordinator(deps);

    await coordinator.routeForSession(null, tabsSegments());

    assert.deepEqual(rec.registerPushCalls, []);
    assert.deepEqual(rec.timezoneSyncCalls, []);
    assert.deepEqual(rec.locationSyncCalls, []);
    assert.deepEqual(rec.offerNotificationCalls, []);
  });

  it('6a. bootstrap returns 503: treated the same as 401 -- status-code-agnostic failure handling', async () => {
    const { deps, rec } = makeDeps({
      fetchOnboardingStatus: async () => null,
      bootstrapProfile: async () => ({ ok: false, status: 503, onboardingCompleted: null }),
    });
    const coordinator = new AuthCoordinator(deps);

    await coordinator.routeForSession(fakeSession('u1'), tabsSegments());

    assert.deepEqual(rec.profileResolutionFailures, ['u1']);
  });

  it('6b. bootstrap succeeds but returns malformed data (no usable onboarding value): treated as a failure, not a crash', async () => {
    const { deps, rec } = makeDeps({
      fetchOnboardingStatus: async () => null,
      bootstrapProfile: async () => ({ ok: true, status: 200, onboardingCompleted: null }),
    });
    const coordinator = new AuthCoordinator(deps);

    await coordinator.routeForSession(fakeSession('u1'), tabsSegments());

    assert.deepEqual(rec.profileResolutionFailures, ['u1']);
  });

  it('6c. bootstrap succeeds and repairs a profile that still needs onboarding (not complete): routes to onboarding, not the recovery screen', async () => {
    const { deps, rec } = makeDeps({
      fetchOnboardingStatus: async () => null,
      bootstrapProfile: async () => ({ ok: true, status: 200, onboardingCompleted: false }),
    });
    const coordinator = new AuthCoordinator(deps);

    await coordinator.routeForSession(fakeSession('u1'), tabsSegments());

    assert.deepEqual(rec.profileResolutionFailures, [null]);
    assert.deepEqual(rec.redirects, ['/(auth)/onboarding']);
    assert.deepEqual(rec.onboardingCacheWrites, [{ userId: 'u1', value: 'false' }]);
    assert.deepEqual(rec.offerNotificationCalls, [], 'notification permission must only be offered once onboarding is actually complete');
  });

  // Verified via mutation testing (temporarily, locally -- not left in the
  // source): removing only the single isCurrentRoute() guard right after
  // getStartupPreferences does NOT turn this test red, because the very
  // next guard (right after setGuestMode) independently catches the same
  // stale continuation -- and removing that one too still doesn't, because
  // the guard after getOnboardingCache catches it, and so on. This test only
  // goes red once enough of that redundant chain (getStartupPreferences,
  // setGuestMode, getOnboardingCache, and fetchOnboardingStatus's guards,
  // in this fixture) is removed together. That is the real property being
  // proven here: the *chain* of generation checks collectively stops a
  // stale continuation from acting, by defense in depth -- not that any
  // one specific line is uniquely load-bearing. Contrast with "6. sign-out
  // during bootstrap" above, whose hang point sits immediately before a
  // single guard with no redundant check between them, so that test does
  // isolate one specific line.
  it('7. a stale userA continuation resuming after sign-out cannot re-publish userA or act on its behalf', async () => {
    let resolvePrefs!: (prefs: StartupPreferences) => void;
    const prefsPromise = new Promise<StartupPreferences>((resolve) => { resolvePrefs = resolve; });
    const { deps, rec } = makeDeps({
      getStartupPreferences: () => prefsPromise,
      // Deliberately "needs onboarding," not "complete" -- if the stale
      // continuation below were NOT stopped, it would produce an
      // observable, wrong side effect (a redirect to onboarding for a user
      // who already signed out) rather than silently doing the same
      // nothing a "complete" fixture would produce either way. A fixture
      // where the guarded and unguarded paths look identical would not
      // actually prove the guard does anything.
      fetchOnboardingStatus: async () => ({ onboarding_completed: false }),
      isGuestMode: async () => false,
    });
    const coordinator = new AuthCoordinator(deps);

    const firstCall = coordinator.routeForSession(fakeSession('userA'), tabsSegments());
    // Flush the microtask queue via a macrotask boundary so the first call
    // is genuinely suspended inside `await d.getStartupPreferences()` --
    // an earlier guard than the one this file's "sign-out during
    // bootstrap" scenario exercises -- before sign-out runs.
    await new Promise((resolve) => setTimeout(resolve, 0));

    await coordinator.routeForSession(null, tabsSegments());
    assert.deepEqual(rec.identities.at(-1), { kind: 'unauthenticated' });
    const redirectsAfterSignOut = [...rec.redirects];

    resolvePrefs(DEFAULT_PREFS);
    await firstCall;

    assert.deepEqual(
      rec.identities.at(-1),
      { kind: 'unauthenticated' },
      'the stale userA call resuming after sign-out must never publish userA again'
    );
    assert.deepEqual(
      rec.redirects,
      redirectsAfterSignOut,
      'the stale userA call must not redirect to onboarding (or anywhere) on userA behalf after sign-out'
    );
    assert.deepEqual(
      rec.onboardingCacheWrites,
      [],
      'the stale userA call must not write userA onboarding-cache state after sign-out'
    );
  });
});
