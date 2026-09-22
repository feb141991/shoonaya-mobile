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
  prewarmGuestCalls: number;
  prewarmAuthenticatedCalls: string[];
  signOutClearCalls: number;
  switchClearCalls: string[];
  unregisterPushCalls: number;
  registerPushCalls: string[];
  offerNotificationCalls: string[];
  onboardingCacheWrites: Array<{ userId: string; value: 'true' | 'false' }>;
  profileResolutionFailures: Array<string | null>;
};

function makeDeps(overrides: Partial<AuthCoordinatorDependencies> = {}): { deps: AuthCoordinatorDependencies; rec: Recorder } {
  const rec: Recorder = {
    identities: [],
    redirects: [],
    prewarmGuestCalls: 0,
    prewarmAuthenticatedCalls: [],
    signOutClearCalls: 0,
    switchClearCalls: [],
    unregisterPushCalls: 0,
    registerPushCalls: [],
    offerNotificationCalls: [],
    onboardingCacheWrites: [],
    profileResolutionFailures: [],
  };

  const base: AuthCoordinatorDependencies = {
    setAppIdentity: (identity) => { rec.identities.push(identity); },
    setApiAccessTokenFromSession: () => {},
    redirect: (path) => { rec.redirects.push(path); },
    isGuestMode: async () => false,
    setGuestMode: async () => {},
    prewarmGuestCaches: () => { rec.prewarmGuestCalls += 1; },
    prewarmAuthenticatedCaches: (userId) => { rec.prewarmAuthenticatedCalls.push(userId); },
    clearAllPrivateCachesForSignOut: () => { rec.signOutClearCalls += 1; },
    clearAllPrivateCachesForSwitch: (previousUserId) => { rec.switchClearCalls.push(previousUserId); },
    unregisterPushToken: () => { rec.unregisterPushCalls += 1; },
    registerPushToken: (userId) => { rec.registerPushCalls.push(userId); },
    syncDeviceTimezone: () => {},
    syncDeviceLocationIfPermitted: () => {},
    offerNotificationPermission: (userId) => { rec.offerNotificationCalls.push(userId); },
    getStartupPreferences: async () => DEFAULT_PREFS,
    clearDeviceStartupPreferences: async () => {},
    applyStartupPreferences: () => {},
    getOnboardingCache: async () => null,
    setOnboardingCache: async (userId, value) => { rec.onboardingCacheWrites.push({ userId, value }); },
    fetchOnboardingStatus: async () => ({ onboarding_completed: true }),
    bootstrapProfile: async () => ({ ok: true, status: 200, onboardingCompleted: true }),
    onProfileResolutionFailure: (userId) => { rec.profileResolutionFailures.push(userId); },
    ...overrides,
  };

  return { deps: base, rec };
}

describe('AuthCoordinator -- Stage 1 (behind AUTH_COORDINATOR_ENABLED, not yet wired)', () => {
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

  it('8. offline launch with cached profile: renders from cache immediately; a failed background revalidation is swallowed, not thrown', async () => {
    const { deps, rec } = makeDeps({
      getOnboardingCache: async () => 'true',
      fetchOnboardingStatus: async () => { throw new Error('network unreachable'); },
    });
    const coordinator = new AuthCoordinator(deps);

    // Must not throw or produce an unhandled rejection even though the
    // background revalidation call rejects.
    await coordinator.routeForSession(fakeSession('u1'), tabsSegments());
    // Give the fire-and-forget background revalidation a tick to settle.
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.deepEqual(rec.profileResolutionFailures, [null]);
    assert.deepEqual(rec.offerNotificationCalls, ['u1']);
    assert.deepEqual(rec.onboardingCacheWrites, [], 'a failed revalidation must not write a cache value');
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
