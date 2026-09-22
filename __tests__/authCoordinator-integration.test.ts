import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import type { Session } from '@supabase/supabase-js';
import {
  AuthCoordinator,
  type AuthCoordinatorDependencies,
  type AuthRouteSegments,
} from '../lib/authCoordinator';
import type { AppIdentity } from '../lib/appIdentity';

/**
 * Pre-wiring checklist items 1 and 2 (checkpoint review, 2026-09-22).
 * Items 3-7 live as additional scenarios in authCoordinator.test.ts; item 8
 * (keep the old implementation available for rollback) is honored by simply
 * not touching app/_layout.tsx yet.
 *
 * Both tests here are honestly scoped, not full integration tests: this
 * project's `tsx --test` runner cannot import app/_layout.tsx directly (it
 * pulls in react-native, expo-router, and friends -- the same constraint
 * lib/profileResolution.ts's own doc comment already documents for exactly
 * this reason). That means neither test below exercises the real Supabase
 * SDK, real AsyncStorage, or real react-native navigation -- that gap can
 * only be closed by an on-device or e2e test, not a unit test, and this
 * file does not claim otherwise.
 */

const layoutSource = readFileSync(new URL('../app/_layout.tsx', import.meta.url), 'utf8');
const coordinatorSource = readFileSync(new URL('../lib/authCoordinator.ts', import.meta.url), 'utf8');

describe('1. Structural parity between app/_layout.tsx routeForSession and AuthCoordinator', () => {
  it('both files redirect to exactly the same three route targets, nothing more or fewer', () => {
    const layoutTargets = new Set([...layoutSource.matchAll(/router\.replace\('([^']+)'\)/g)].map((m) => m[1]));
    const coordinatorTargets = new Set([...coordinatorSource.matchAll(/d\.redirect\('([^']+)'\)/g)].map((m) => m[1]));

    assert.deepEqual(layoutTargets, new Set(['/(tabs)', '/(auth)/login', '/(auth)/onboarding']));
    assert.deepEqual(
      coordinatorTargets, layoutTargets,
      'AuthCoordinator must redirect to exactly the same set of routes app/_layout.tsx does -- no more, no fewer'
    );
  });

  it('the load-bearing decision conditions appear verbatim in both files', () => {
    // Each of these is a literal expression from app/_layout.tsx's
    // routeForSession that authCoordinator.ts's extraction was written to
    // reproduce exactly (same variable names, same operators). This is a
    // drift detector, not a behavioral proof: if either file's condition
    // is edited without updating the other, this fails immediately instead
    // of the two implementations silently diverging while both exist in
    // parallel. It cannot substitute for the unit-level scenario coverage
    // in authCoordinator.test.ts, only complement it.
    const sharedConditions = [
      "if (previousRouteKey && previousRouteKey !== session.user.id) {",
      "if (cached === 'true') {",
      "if (!profile) {",
      "if (profileOutcome.kind === 'failed') {",
      "const needsOnboarding = profileOutcome.kind === 'needs_onboarding';",
      "const isOnboarding = inAuthGroup && childSegment === 'onboarding';",
      "if (needsOnboarding && !isOnboarding) {",
      "} else if (!needsOnboarding && inAuthGroup) {",
    ];

    for (const condition of sharedConditions) {
      assert.ok(layoutSource.includes(condition), `app/_layout.tsx no longer contains: ${condition}`);
      assert.ok(coordinatorSource.includes(condition), `lib/authCoordinator.ts no longer contains: ${condition}`);
    }
  });

  it('both files clear caches only on the same two occasions -- sign-out and an actual account switch, never on a same-user refresh', () => {
    // app/_layout.tsx fires its 11 clearAllXCaches()/clearProfileCache()
    // calls directly; authCoordinator.ts fires them through two named
    // composite dependencies instead (clearAllPrivateCachesForSignOut/
    // ForSwitch -- see its own doc comment for why they are kept separate
    // rather than one parameterized dep). What must stay in parity is not
    // the call shape but WHERE each fires: exactly once in the no-session
    // branch, and exactly once in the previousRouteKey-differs branch.
    const layoutSignOutClearSite = layoutSource.indexOf('void clearAllHomeCaches();', layoutSource.indexOf('if (!session) {'));
    const layoutSwitchClearSite = layoutSource.indexOf('void clearAllHomeCaches();', layoutSource.indexOf('if (previousRouteKey && previousRouteKey !== session.user.id) {'));
    assert.ok(layoutSignOutClearSite > -1 && layoutSwitchClearSite > -1 && layoutSignOutClearSite !== layoutSwitchClearSite);

    assert.ok(coordinatorSource.includes('d.clearAllPrivateCachesForSignOut();'));
    assert.ok(coordinatorSource.includes('d.clearAllPrivateCachesForSwitch(previousRouteKey);'));
    // Exactly one call site each -- if a future edit added a second call to
    // either, that would be a real behavioral change (e.g. double-clearing)
    // this check would catch.
    assert.equal((coordinatorSource.match(/d\.clearAllPrivateCachesForSignOut\(\)/g) ?? []).length, 1);
    assert.equal((coordinatorSource.match(/d\.clearAllPrivateCachesForSwitch\(/g) ?? []).length, 1);
  });
});

// ---------------------------------------------------------------------------

type EventName = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED';

function fakeSession(userId: string, email: string | null = 'user@example.com'): Session {
  return { user: { id: userId, email } } as unknown as Session;
}

function tabsSegments(): AuthRouteSegments {
  return { rootSegment: '(tabs)', childSegment: undefined };
}

/**
 * Reproduces app/_layout.tsx's actual onAuthStateChange wiring shape, not
 * just calling routeForSession directly the way every test in
 * authCoordinator.test.ts does:
 *
 *   supabase.auth.onAuthStateChange((_event, session) => {
 *     setApiAccessTokenFromSession(session);      // synchronous
 *     void Promise.resolve().then(async () => {   // one microtask deferred
 *       await routeForSession(session);
 *     });
 *   });
 *
 * The token update happening synchronously while routing is deferred by
 * exactly one microtask is what makes back-to-back real auth events
 * interesting to test: two events fired in the same tick both update the
 * token immediately, in order, before either one's routing logic runs.
 */
function createFakeAuthEventBus(coordinator: AuthCoordinator, deps: AuthCoordinatorDependencies, segments: AuthRouteSegments) {
  const errors: unknown[] = [];
  const routingSettled: Promise<void>[] = [];

  function dispatch(_event: EventName, session: Session | null): void {
    deps.setApiAccessTokenFromSession(session);
    const settled = Promise.resolve().then(async () => {
      try {
        await coordinator.routeForSession(session, segments);
      } catch (e) {
        errors.push(e);
      }
    });
    routingSettled.push(settled);
  }

  return {
    dispatch,
    errors,
    settle: () => Promise.all(routingSettled),
  };
}

function makeIntegrationDeps(overrides: Partial<AuthCoordinatorDependencies> = {}) {
  const identities: AppIdentity[] = [];
  const redirects: string[] = [];
  const apiTokenSessions: Array<Session | null> = [];
  const bootstrapCalls: number[] = [];
  const prewarmAuthenticatedCalls: string[] = [];

  const deps: AuthCoordinatorDependencies = {
    setAppIdentity: (identity) => { identities.push(identity); },
    setApiAccessTokenFromSession: (session) => { apiTokenSessions.push(session); },
    redirect: (path) => { redirects.push(path); },
    isGuestMode: async () => false,
    setGuestMode: async () => {},
    prewarmGuestCaches: () => {},
    prewarmAuthenticatedCaches: (userId) => { prewarmAuthenticatedCalls.push(userId); },
    clearAllPrivateCachesForSignOut: () => {},
    clearAllPrivateCachesForSwitch: () => {},
    unregisterPushToken: () => {},
    registerPushToken: () => {},
    syncDeviceTimezone: () => {},
    syncDeviceLocationIfPermitted: () => {},
    offerNotificationPermission: () => {},
    getStartupPreferences: async () => ({ tradition: 'hindu', timezone: 'Asia/Kolkata', language: 'en' }),
    clearDeviceStartupPreferences: async () => {},
    applyStartupPreferences: () => {},
    getOnboardingCache: async () => null,
    setOnboardingCache: async () => {},
    fetchOnboardingStatus: async () => ({ onboarding_completed: true }),
    bootstrapProfile: async () => { bootstrapCalls.push(1); return { ok: true, status: 200, onboardingCompleted: true }; },
    onProfileResolutionFailure: () => {},
    ...overrides,
  };

  return { deps, identities, redirects, apiTokenSessions, bootstrapCalls, prewarmAuthenticatedCalls };
}

describe('2. Listener-scheduling simulation (reproduces onAuthStateChange sync-token/deferred-routing shape)', () => {
  it('SIGNED_IN then TOKEN_REFRESHED for the same user, dispatched in the same tick: token updates immediately for both, routing only runs the full path once', async () => {
    const { deps, identities, apiTokenSessions, prewarmAuthenticatedCalls } = makeIntegrationDeps();
    const coordinator = new AuthCoordinator(deps);
    const bus = createFakeAuthEventBus(coordinator, deps, tabsSegments());

    const sessionV1 = fakeSession('u1');
    const sessionV2 = fakeSession('u1'); // same user, stands in for a refreshed token
    bus.dispatch('SIGNED_IN', sessionV1);
    bus.dispatch('TOKEN_REFRESHED', sessionV2);
    await bus.settle();

    assert.deepEqual(bus.errors, []);
    // Both events update the API client's token synchronously, in order --
    // this must never wait on routing to catch up. Each session appears
    // TWICE: once from this harness's own listener-shaped dispatch() (the
    // sync setApiAccessTokenFromSession call app/_layout.tsx's real
    // onAuthStateChange callback makes before deferring to routing), and
    // once more because routeForSession's own first line calls it again
    // (preserved faithfully from the original -- app/_layout.tsx's inline
    // routeForSession does the exact same double call). Harmless since the
    // call is idempotent, but asserting the real count here rather than
    // rounding it down to what "should" happen is the point of this test.
    assert.deepEqual(apiTokenSessions, [sessionV1, sessionV1, sessionV2, sessionV2]);
    assert.deepEqual(identities.at(-1), { kind: 'authenticated', userId: 'u1', email: 'user@example.com' });
    assert.equal(prewarmAuthenticatedCalls.length, 1, 'the second (same-user) event must take the fast path, not repeat cache prewarm');
  });

  it('SIGNED_IN userA then SIGNED_OUT, dispatched in the same tick: final routed state is unauthenticated, not a torn mix', async () => {
    const { deps, identities } = makeIntegrationDeps();
    const coordinator = new AuthCoordinator(deps);
    const bus = createFakeAuthEventBus(coordinator, deps, tabsSegments());

    bus.dispatch('SIGNED_IN', fakeSession('userA'));
    bus.dispatch('SIGNED_OUT', null);
    await bus.settle();

    assert.deepEqual(bus.errors, []);
    assert.deepEqual(identities.at(-1), { kind: 'unauthenticated' });
  });

  it('userA -> userB -> signed-out, three events dispatched in the same tick: final state is unauthenticated, never userB left stranded', async () => {
    const { deps, identities } = makeIntegrationDeps();
    const coordinator = new AuthCoordinator(deps);
    const bus = createFakeAuthEventBus(coordinator, deps, tabsSegments());

    bus.dispatch('SIGNED_IN', fakeSession('userA'));
    bus.dispatch('SIGNED_IN', fakeSession('userB'));
    bus.dispatch('SIGNED_OUT', null);
    await bus.settle();

    assert.deepEqual(bus.errors, []);
    assert.deepEqual(identities.at(-1), { kind: 'unauthenticated' });
  });

  it('a thrown routing error for one event does not prevent a later event from routing correctly (mirrors the try/catch in the real listener)', async () => {
    let firstCall = true;
    const { deps, identities } = makeIntegrationDeps({
      getStartupPreferences: async () => {
        if (firstCall) {
          firstCall = false;
          throw new Error('simulated AsyncStorage failure');
        }
        return { tradition: 'hindu', timezone: 'Asia/Kolkata', language: 'en' };
      },
    });
    const coordinator = new AuthCoordinator(deps);
    const bus = createFakeAuthEventBus(coordinator, deps, tabsSegments());

    bus.dispatch('SIGNED_IN', fakeSession('userA'));
    await bus.settle();
    assert.equal(bus.errors.length, 1, 'the simulated failure must be caught, matching the real listener wrapping every call in try/catch');

    bus.dispatch('SIGNED_IN', fakeSession('userB'));
    await bus.settle();

    assert.equal(bus.errors.length, 1, 'no further errors from the second, successful event');
    assert.deepEqual(identities.at(-1), { kind: 'authenticated', userId: 'userB', email: 'user@example.com' });
  });
});
