import type { Session } from '@supabase/supabase-js';
import type { AppIdentity } from './appIdentity';
import { resolveProfileOutcome, type ProfileResolutionOutcome } from './profileResolution';
import { setStartupPreferenceIdentity, isStartupPreferenceIdentityCurrent } from './startup-scenes/preferences';
import type { StartupPreferences } from './startup-scenes/types';

/**
 * Stage 1 (docs/PERFORMANCE_RESEARCH_AND_EXECUTION_PLAN.md's reliability
 * plan) -- an extraction of app/_layout.tsx's `routeForSession`, the
 * ~240-line function that decides, for every auth state change (cold
 * start, sign-in, sign-out, token refresh, account switch), what the
 * app's identity is, which private caches to clear, which screen to
 * route to, and whether onboarding/profile repair is needed.
 *
 * Every branch, every ordering decision, every comment explaining a
 * specific past bug (F01/F02 markers etc.) is preserved as-is, and every
 * side effect (network, AsyncStorage, the global identity store,
 * navigation, push/telemetry/location sync) is replaced by an injected
 * dependency, the same pattern HomeSummaryCoordinator (lib/homeCoordinator.ts)
 * already uses -- that is what makes the test matrix in
 * __tests__/authCoordinator.test.ts possible without mocking React,
 * Supabase, or AsyncStorage. One place is NOT a pure extraction and is
 * called out explicitly where it happens, in the `cached === 'true'`
 * branch below: the background onboarding-status revalidation gained a
 * .catch() the original inline .then() never had. That is a real,
 * intentional reliability fix (an offline launch with a cached profile
 * would otherwise leave an unhandled rejection), not a byproduct of the
 * extraction, and it is covered by its own dedicated test.
 *
 * NOT YET WIRED INTO app/_layout.tsx, and AUTH_COORDINATOR_WIRING_PENDING
 * (see bottom of this file) is not a runtime-read feature flag -- nothing
 * imports or checks it. It is a manual, greppable marker of this file's
 * status. app/_layout.tsx's own routeForSession remains the only one
 * actually running in the app. Per explicit instruction, wiring this in
 * is a separate, later step that needs its own review -- see the
 * pre-wiring checklist in __tests__/authCoordinator.test.ts and
 * __tests__/authCoordinator-integration.test.ts before that happens, and
 * keep app/_layout.tsx's inline implementation in place (not deleted)
 * through the first release build that ships the wired version, so an
 * immediate rollback is possible.
 */

export type AuthRouteSegments = {
  rootSegment: string | undefined;
  childSegment: string | undefined;
};

export type OnboardingStatus = { onboarding_completed: boolean } | null;

export type BootstrapProfileResult = { ok: boolean; status: number; onboardingCompleted: boolean | null };

export type AuthCoordinatorDependencies = {
  // Global identity/API-client stores (lib/appIdentity.ts, lib/api.ts).
  // Injected rather than imported directly so tests observe every
  // transition without sharing a module-level singleton across tests.
  setAppIdentity: (identity: AppIdentity) => void;
  setApiAccessTokenFromSession: (session: Session | null) => void;

  // Navigation. Real caller passes router.replace.
  redirect: (path: '/(tabs)' | '/(auth)/login' | '/(auth)/onboarding') => void;

  // Guest mode (lib/guestSession.ts) -- AsyncStorage-backed.
  isGuestMode: () => Promise<boolean>;
  setGuestMode: (active: boolean) => Promise<void>;

  // Cache prewarm (fire-and-forget in the real caller, but awaited here so
  // tests can observe completion; the real caller does not need to await
  // the returned promise either).
  prewarmGuestCaches: () => void;
  prewarmAuthenticatedCaches: (userId: string) => void;

  // Two distinct clear operations -- sign-out clears everything including
  // every identity's profile cache; an A -> B account switch clears
  // everything except it scopes the profile-cache clear to the specific
  // previous user. Kept as two deps (not one parameterized dep) so a test
  // asserting "which one fired, with what argument" reads directly off
  // the mock's call list instead of decoding a shared function's args.
  clearAllPrivateCachesForSignOut: () => void;
  clearAllPrivateCachesForSwitch: (previousUserId: string) => void;

  unregisterPushToken: () => void;
  registerPushToken: (userId: string) => void;
  syncDeviceTimezone: (userId: string) => void;
  syncDeviceLocationIfPermitted: (userId: string) => void;
  offerNotificationPermission: (userId: string) => void;

  // Startup preferences (lib/startup-scenes/preferences.ts). getStartupPreferences
  // and clearDeviceStartupPreferences do real AsyncStorage I/O; applyStartupPreferences
  // is the React state setter that actually renders the picked scene.
  getStartupPreferences: (userId: string | null) => Promise<StartupPreferences>;
  clearDeviceStartupPreferences: () => Promise<void>;
  applyStartupPreferences: (prefs: StartupPreferences) => void;

  // Onboarding-completion cache (AsyncStorage key
  // `shoonaya:onboarding_completed:${userId}`) and the live Supabase read
  // it backstops -- see the extensive comment on this gate below.
  getOnboardingCache: (userId: string) => Promise<'true' | 'false' | null>;
  setOnboardingCache: (userId: string, value: 'true' | 'false') => Promise<void>;
  fetchOnboardingStatus: (userId: string) => Promise<OnboardingStatus>;

  // Repairs a missing profiles row (auth.users trigger failure or OAuth
  // first-time sign-in edge case) via POST /api/native/profile/bootstrap.
  bootstrapProfile: () => Promise<BootstrapProfileResult>;

  // React state -- the full-screen "Couldn't finish setting up your
  // account" recovery surface in app/_layout.tsx.
  onProfileResolutionFailure: (userId: string | null) => void;
};

export type AuthCoordinatorState = {
  lastRouteKey: string | null | undefined;
  routeGeneration: number;
};

export class AuthCoordinator {
  private deps: AuthCoordinatorDependencies;
  public state: AuthCoordinatorState;

  constructor(deps: AuthCoordinatorDependencies, initialState?: Partial<AuthCoordinatorState>) {
    this.deps = deps;
    this.state = {
      lastRouteKey: undefined,
      routeGeneration: 0,
      ...initialState,
    };
  }

  /**
   * Resets the dedup key so the next call always re-runs the full routing
   * logic even for an unchanged session -- mirrors app/_layout.tsx's
   * retryProfileResolution resetting lastAuthRouteKeyRef before calling
   * back in.
   */
  resetRouteDedup(): void {
    this.state.lastRouteKey = undefined;
  }

  async routeForSession(session: Session | null, segments: AuthRouteSegments): Promise<void> {
    const d = this.deps;
    d.setApiAccessTokenFromSession(session);

    const routeKey = session?.user.id ?? null;
    const previousRouteKey = this.state.lastRouteKey;
    if (this.state.lastRouteKey === routeKey) {
      if (session) {
        d.setAppIdentity({
          kind: 'authenticated',
          userId: session.user.id,
          email: session.user.email ?? null,
        });
      }
      return;
    }
    this.state.lastRouteKey = routeKey;
    const routeGeneration = ++this.state.routeGeneration;
    const isCurrentRoute = () => this.state.routeGeneration === routeGeneration;

    const { rootSegment, childSegment } = segments;
    const inAuthGroup = rootSegment === '(auth)';

    if (!session) {
      // Mask the previous account immediately. Cleanup is asynchronous, so
      // waiting until after it completes leaves the old user's screen
      // visible during sign-out/account loss.
      d.setAppIdentity({ kind: 'loading' });
      // A sign-out or account switch always clears a stale failure screen
      // from a *previous* user -- it must never persist across identities.
      d.onProfileResolutionFailure(null);
      // Invalidate preference writes synchronously before any asynchronous
      // logout cleanup, then await removal so an old Home response cannot
      // restore the previous account's tradition after sign-out.
      setStartupPreferenceIdentity(null);
      await d.clearDeviceStartupPreferences();
      if (!isCurrentRoute()) return;
      // Unbind this device's push token whenever there is no authenticated
      // session -- covers explicit sign-out plus any future call site,
      // since supabase.auth.signOut() always fires this listener with a
      // null session rather than requiring each call site to remember to
      // clean up push identity itself.
      d.unregisterPushToken();
      d.clearAllPrivateCachesForSignOut();

      // If guest mode is active, allow tabs and bypass login
      const guest = await d.isGuestMode();
      if (!isCurrentRoute()) return;
      if (guest) {
        d.prewarmGuestCaches();
        d.setAppIdentity({ kind: 'guest' });
        if (inAuthGroup) {
          d.redirect('/(tabs)');
        }
        return;
      }

      d.setAppIdentity({ kind: 'unauthenticated' });
      if (!inAuthGroup) {
        d.redirect('/(auth)/login');
      }
      return;
    }

    // Root is the sole session owner. Publish identity before slower
    // preference/profile revalidation so mounted screens never need their
    // own Supabase auth subscriptions or getSession() calls.
    if (previousRouteKey && previousRouteKey !== session.user.id) {
      // Cache keys are owner-scoped, but an account switch is also a purge
      // boundary. Clear every private render cache; the cache modules'
      // storage barriers prevent an older write from restoring a removed
      // entry after this point.
      d.setAppIdentity({ kind: 'loading' });
      d.clearAllPrivateCachesForSwitch(previousRouteKey);
    }
    d.prewarmAuthenticatedCaches(session.user.id);
    d.setAppIdentity({
      kind: 'authenticated',
      userId: session.user.id,
      email: session.user.email ?? null,
    });

    const preferenceGeneration = setStartupPreferenceIdentity(session.user.id);
    const authenticatedStartupPrefs = await d.getStartupPreferences(session.user.id);
    if (!isCurrentRoute()) return;
    if (isStartupPreferenceIdentityCurrent(session.user.id, preferenceGeneration)) {
      d.applyStartupPreferences(authenticatedStartupPrefs);
    }

    // Real sign-in should clear guest mode after session is established.
    await d.setGuestMode(false);
    if (!isCurrentRoute()) return;

    // (Re-)register this device's push token against the signed-in user on
    // every authenticated session, not just once at the end of onboarding
    // -- covers any *returning* user: sign back in after logout, reinstall,
    // second device, token refresh bringing a fresh session object.
    d.registerPushToken(session.user.id);

    // Keep profiles.timezone honest -- every "today" calculation on the
    // backend depends on it.
    d.syncDeviceTimezone(session.user.id);

    // Keep profiles.latitude/longitude/city honest too, but only when
    // permission is already granted. Never prompts from here.
    d.syncDeviceLocationIfPermitted(session.user.id);

    // Onboarding gate -- mirrors the web app's onboarding-gate.ts fix.
    // `profiles.onboarding_completed` is `NOT NULL DEFAULT false`, so a
    // successfully read row is always true/false; only a *definitive*
    // false means the user still needs onboarding. Profile bootstrap below
    // repairs historical trigger failures before this read. A subsequent
    // null is still treated as transient to avoid a redirect loop during a
    // database outage.
    // Check local cache first so returning users route immediately without
    // blocking cold start on a network round-trip.
    const cached = await d.getOnboardingCache(session.user.id);
    if (!isCurrentRoute()) return;

    if (cached === 'true') {
      if (inAuthGroup) {
        d.redirect('/(tabs)');
      }
      // Background revalidation: keep cache in sync without gating initial
      // render. Deliberately swallows a failure (offline, etc.) here --
      // the cached-path render has already happened and must not be
      // disturbed by a revalidation that couldn't complete.
      //
      // INTENTIONAL RELIABILITY FIX, not a pure extraction: the original
      // inline .then() in app/_layout.tsx has no .catch and leaves an
      // unhandled promise rejection on an offline launch with a cached
      // profile (the fetch rejects, nothing observes it). Adding .catch(() => {})
      // here does not change any *observable* routing decision -- the
      // cached-path render and redirect above have already happened either
      // way, and the cache write on a successful revalidation is
      // unaffected -- it only stops the rejection from going unhandled.
      // Proven by __tests__/authCoordinator.test.ts's "offline launch with
      // cached profile" test, which asserts both that routing/identity are
      // unchanged AND that no unhandled rejection escapes.
      void d.fetchOnboardingStatus(session.user.id)
        .then((p) => {
          if (!isCurrentRoute()) return;
          if (p?.onboarding_completed === false) {
            void d.setOnboardingCache(session.user.id, 'false');
            d.redirect('/(auth)/onboarding');
          } else if (p?.onboarding_completed === true) {
            void d.setOnboardingCache(session.user.id, 'true');
          }
        })
        .catch(() => {});
      d.onProfileResolutionFailure(null);
      d.offerNotificationPermission(session.user.id);
      return;
    }

    let profile = await d.fetchOnboardingStatus(session.user.id);
    if (!isCurrentRoute()) return;

    // The auth.users trigger should normally create this row. Repair only
    // historical/OAuth trigger failures. The response is always incomplete
    // for a newly created profile, so it routes to onboarding rather than a
    // default Home. Healthy accounts avoid this extra network request.
    if (!profile) {
      const bootstrapResult = await d.bootstrapProfile();
      if (bootstrapResult.ok && bootstrapResult.onboardingCompleted !== null) {
        profile = { onboarding_completed: bootstrapResult.onboardingCompleted };
      }
      if (!isCurrentRoute()) return;
    }

    // `profile?.onboarding_completed` being undefined here (profile still
    // null after the repair attempt) previously satisfied neither
    // needsOnboarding's `=== false` check NOR blocked the `!needsOnboarding`
    // Home-entry branch below, so a missing profile silently qualified for
    // Home. resolveProfileOutcome makes the three real states explicit and
    // unit-tested (lib/profileResolution.ts) -- only 'complete' may proceed
    // into Home.
    const profileOutcome: ProfileResolutionOutcome = resolveProfileOutcome(profile);

    if (profileOutcome.kind === 'failed') {
      d.onProfileResolutionFailure(session.user.id);
      return;
    }
    d.onProfileResolutionFailure(null);

    if (profileOutcome.kind === 'complete') {
      void d.setOnboardingCache(session.user.id, 'true');
      d.offerNotificationPermission(session.user.id);
    } else {
      void d.setOnboardingCache(session.user.id, 'false');
    }

    const needsOnboarding = profileOutcome.kind === 'needs_onboarding';
    const isOnboarding = inAuthGroup && childSegment === 'onboarding';

    if (needsOnboarding && !isOnboarding) {
      d.redirect('/(auth)/onboarding');
    } else if (!needsOnboarding && inAuthGroup) {
      d.redirect('/(tabs)');
    }
  }
}

// Not a feature flag -- nothing imports or reads this constant, so it
// cannot gate any runtime behavior. It is a manual, greppable checkpoint
// marker: `true` means the extraction above exists but app/_layout.tsx
// has not been switched over to it yet. Wiring app/_layout.tsx to call
// AuthCoordinator (and removing its own duplicated routeForSession) is
// what actually flips this from a "prepared" state to a "live" one; at
// that point this constant should be deleted, not set to `false`, since
// a boolean nothing reads would otherwise imply a real kill switch that
// does not exist here. A real runtime kill switch (e.g. an EAS Update /
// remote-config flag app/_layout.tsx actually checks before choosing
// which implementation to call) is a legitimate way to wire this in --
// see the pre-wiring checklist referenced in the module comment above.
export const AUTH_COORDINATOR_WIRING_PENDING = true;
