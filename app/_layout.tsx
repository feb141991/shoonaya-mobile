import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import '../global.css';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Alert, AppState, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Kalam_400Regular, Kalam_700Bold } from '@expo-google-fonts/kalam';
import { Mukta_400Regular, Mukta_700Bold } from '@expo-google-fonts/mukta';
import { useFonts } from 'expo-font';
import { Observe, ObserveRoot, useObserve } from 'expo-observe';

import { AppProviders } from '@/components/providers/AppProviders';
import { CollapsibleBottomNav } from '@/components/ui/CollapsibleBottomNav';
import { RouteTransition } from '@/components/ui/Motion';
import { ContextualStartupScene } from '@/components/startup/ContextualStartupScene';
import { selectStartupScene } from '@/lib/startup-scenes/selector';
import {
  getStartupPreferences,
  getDefaultStartupPreferences,
  clearDeviceStartupPreferences,
  isStartupPreferenceIdentityCurrent,
  setStartupPreferenceIdentity,
} from '@/lib/startup-scenes/preferences';
import { StartupLifecycleController } from '@/lib/startup-scenes/lifecycle';
import type { AppLanguage, StartupPreferences, StartupScene } from '@/lib/startup-scenes/types';
import { trackScreenView } from '@/lib/analytics';
import { apiFetch, setApiAccessTokenFromSession } from '@/lib/api';
import { exchangeOAuthUrlIfPresent } from '@/lib/authRedirect';
import { supabase } from '@/lib/supabase';
import { isGuestMode, setGuestMode } from '@/lib/guestSession';
import { clearAllHomeCaches } from '@/lib/homeCache';
import { clearAllMandaliCaches } from '@/lib/mandaliCache';
import { clearAllSettingsCaches } from '@/lib/settingsCache';
import { clearAllNotificationsCaches } from '@/lib/notificationsCache';
import { clearAllTelemetry } from '@/lib/telemetry';
import { clearAllOnboardingDrafts } from '@/lib/onboardingDraft';
import {
  getNotificationPermissionState,
  initPushNotifications,
  handleNotificationTap,
  registerPushToken,
  requestNotificationPermission,
  unregisterPushToken,
} from '@/lib/notifications';
import {
  claimNotificationPermissionPrompt,
  dismissNotificationPermissionPrompt,
} from '@/lib/notificationPermissionPrompt';
import { syncDeviceTimezone } from '@/lib/timezoneSync';
import { syncDeviceLocationIfPermitted } from '@/lib/locationSync';
import { Animated, StyleSheet } from 'react-native';
import { resolveStartupSurface } from '@/lib/startup-visibility';
import { setAppIdentity } from '@/lib/appIdentity';

// Keep splash screen visible until we are ready
SplashScreen.preventAutoHideAsync().catch(() => {});

// EAS Observe — production startup/render metrics (cold/warm launch, time
// to first render, time to interactive). Private Preview; sends nothing
// until the account has been granted access, so this is safe to ship ahead
// of that. The expo-router integration must be enabled here at module
// scope, before any screen mounts — enabling it later or toggling it at
// runtime throws. It tags every markInteractive() call (see useObserve()
// below) with the actual route pattern instead of one app-wide number.
Observe.configure({
  integrations: { 'expo-router': true },
});

function RootLayout() {
  const router = useRouter();
  const { markInteractive } = useObserve();
  const segments = useSegments();
  const rootSegment = segments[0];
  const childSegment = segments[1];

  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Kalam_400Regular,
    Kalam_700Bold,
    Mukta_400Regular,
    Mukta_700Bold,
  });

  const [authReady, setAuthReady] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);
  const startupStartedAtRef = useRef(Date.now());
  const readyToRender = appIsReady && authReady;
  const showBottomNav = readyToRender && rootSegment !== '(auth)' && rootSegment !== 'auth' && rootSegment !== undefined;

  // ── Contextual Startup Scene Orchestration ────────────────────────────
  const [startupPrefs, setStartupPrefs] = useState<StartupPreferences>(() => getDefaultStartupPreferences());
  const [selectedScene, setSelectedScene] = useState<StartupScene>(() => selectStartupScene());
  // The first React render must already contain an opaque surface. Starting
  // false created a blank-window interval before the lifecycle effect mounted
  // the contextual scene.
  const [showStartupScene, setShowStartupScene] = useState(true);
  const startupSceneOpacity = useRef(new Animated.Value(1)).current;
  const startupLifecycleRef = useRef<StartupLifecycleController | null>(null);

  const applyStartupPreferences = useCallback((prefs: StartupPreferences) => {
    setStartupPrefs(prefs);
    setSelectedScene(selectStartupScene({
      tradition: prefs.tradition,
      timezone: prefs.timezone,
    }));
  }, []);

  // Load identity-safe startup preferences (device or user-specific)
  useEffect(() => {
    let mounted = true;
    const loadIdentitySafePrefs = async () => {
      try {
        const prefs = await getStartupPreferences(null);
        if (mounted) {
          applyStartupPreferences(prefs);
        }
      } catch {
        // Fallback safely to neutral
      }
    };
    void loadIdentitySafePrefs();
    return () => {
      mounted = false;
    };
  }, [applyStartupPreferences]);

  useEffect(() => {
    const controller = new StartupLifecycleController({
      showScene: () => setShowStartupScene(true),
      hideNativeSplash: () => {
        SplashScreen.hideAsync().catch(() => {});
      },
      crossfadeScene: (onComplete) => {
        Animated.timing(startupSceneOpacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start(onComplete);
      },
      hideScene: () => setShowStartupScene(false),
    });
    startupLifecycleRef.current = controller;
    controller.start(readyToRender);

    return () => {
      controller.dispose();
      if (startupLifecycleRef.current === controller) {
        startupLifecycleRef.current = null;
      }
    };
    // The controller owns the complete launch lifecycle and must be created once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startupSceneOpacity]);

  useEffect(() => {
    startupLifecycleRef.current?.updateReady(readyToRender);
    if (readyToRender) {
      markInteractive();
      void AsyncStorage.setItem('shoonaya:startup:last-receipt', JSON.stringify({
        status: 'ready',
        elapsedMs: Date.now() - startupStartedAtRef.current,
        route: segmentsRef.current.rootSegment ?? 'unknown',
        recordedAt: new Date().toISOString(),
      })).catch(() => {});
    }
  }, [readyToRender, markInteractive]);

  // Leaves a privacy-safe local receipt when startup remains unresolved. This
  // performs no network work and never gates rendering; it exists solely to
  // distinguish an auth/app readiness stall from a native process crash.
  useEffect(() => {
    if (readyToRender) return;

    void AsyncStorage.setItem('shoonaya:startup:last-receipt', JSON.stringify({
      status: 'starting',
      elapsedMs: 0,
      route: rootSegment ?? 'unknown',
      recordedAt: new Date().toISOString(),
    })).catch(() => {});

    const timer = setTimeout(() => {
      void AsyncStorage.setItem('shoonaya:startup:last-receipt', JSON.stringify({
        status: 'stalled',
        elapsedMs: Date.now() - startupStartedAtRef.current,
        route: segmentsRef.current.rootSegment ?? 'unknown',
        recordedAt: new Date().toISOString(),
      })).catch(() => {});
    }, 2500);
    return () => clearTimeout(timer);
  }, [readyToRender, rootSegment]);

  // routeForSession only actually needs to know the CURRENT segments at the
  // moment it's called (cold start, or a real auth-state event) — it
  // doesn't need to be recreated every time the user navigates. Closing
  // over rootSegment/childSegment directly would do exactly that (segments
  // change on nearly every in-app navigation), which in turn churns the
  // big "Handle Auth and App State" effect below (it depends on
  // routeForSession's identity): unsubscribing and resubscribing the
  // Supabase auth listener and the deep-link listener, and re-running the
  // whole cold-start prepare() sequence, on every tab switch. Reading
  // through a ref that's kept in sync via its own tiny effect gives
  // routeForSession a stable identity (only `router` remains a real dep)
  // without losing access to the latest segments.
  const segmentsRef = useRef({ rootSegment, childSegment });
  const authRouteGenerationRef = useRef(0);
  const lastAuthRouteKeyRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    segmentsRef.current = { rootSegment, childSegment };
  }, [rootSegment, childSegment]);

  const offerNotificationPermission = useCallback(async (userId: string) => {
    const permission = await getNotificationPermissionState();
    if (permission !== 'undetermined') return;
    if (!(await claimNotificationPermissionPrompt(userId))) return;

    // Let Home become interactive before presenting a contextual explanation.
    setTimeout(() => {
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user.id !== userId) return;
        Alert.alert(
          'Stay connected to your practice',
          'Allow Shoonaya to deliver the festival, vrat and practice reminders you choose. You can change each reminder in Settings.',
          [
            {
              text: 'Not now',
              style: 'cancel',
              onPress: () => { void dismissNotificationPermissionPrompt(userId); },
            },
            {
              text: 'Enable notifications',
              onPress: () => {
                void requestNotificationPermission().then((granted) => {
                  if (granted) void registerPushToken(userId);
                });
              },
            },
          ],
        );
      });
    }, 900);
  }, []);

  const routeForSession = useCallback(
    async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      setApiAccessTokenFromSession(session);

      const routeKey = session?.user.id ?? null;
      if (lastAuthRouteKeyRef.current === routeKey) return;
      lastAuthRouteKeyRef.current = routeKey;
      const routeGeneration = ++authRouteGenerationRef.current;
      const isCurrentRoute = () => authRouteGenerationRef.current === routeGeneration;

      const { rootSegment, childSegment } = segmentsRef.current;
      const inAuthGroup = rootSegment === '(auth)';

      if (!session) {
        // Invalidate preference writes synchronously before any asynchronous
        // logout cleanup, then await removal so an old Home response cannot
        // restore the previous account's tradition after sign-out.
        setStartupPreferenceIdentity(null);
        await clearDeviceStartupPreferences();
        if (!isCurrentRoute()) return;
        // Unbind this device's push token whenever there is no
        // authenticated session — covers explicit sign-out (all 3 call
        // sites: settings.tsx x2, profile.tsx) plus any future one, since
        // supabase.auth.signOut() always fires this listener with a null
        // session rather than requiring each call site to remember to clean
        // up push identity itself.
        void unregisterPushToken();
        void clearAllHomeCaches();
        void clearAllMandaliCaches();
        void clearAllSettingsCaches();
        void clearAllNotificationsCaches();
        void clearAllTelemetry();
        void clearAllOnboardingDrafts();

        // If guest mode is active, allow tabs and bypass login
        const guest = await isGuestMode();
        if (!isCurrentRoute()) return;
        if (guest) {
          setAppIdentity({ kind: 'guest' });
          if (inAuthGroup) {
            router.replace('/(tabs)');
          }
          return;
        }

        setAppIdentity({ kind: 'unauthenticated' });
        if (!inAuthGroup) {
          router.replace('/(auth)/login');
        }
        return;
      }

      // Root is the sole session owner. Publish identity before slower
      // preference/profile revalidation so mounted screens never need their
      // own Supabase auth subscriptions or getSession() calls.
      setAppIdentity({ kind: 'authenticated', userId: session.user.id });

      const preferenceGeneration = setStartupPreferenceIdentity(session.user.id);
      const authenticatedStartupPrefs = await getStartupPreferences(session.user.id);
      if (!isCurrentRoute()) return;
      if (
        isStartupPreferenceIdentityCurrent(session.user.id, preferenceGeneration)
      ) {
        applyStartupPreferences(authenticatedStartupPrefs);
      }

      // Real sign-in should clear guest mode after session is established.
      await setGuestMode(false);
      if (!isCurrentRoute()) return;

      // (Re-)register this device's push token against the signed-in user
      // on every authenticated session, not just once at the end of
      // onboarding — covers any *returning* user: sign back in after
      // logout, reinstall, second device, token refresh bringing a fresh
      // session object. This listener already re-runs on every auth state
      // change, so it's the single correct place for this, rather than
      // duplicating the call at every sign-in entry point (Google/Apple in
      // login.tsx). Cheap/idempotent to call repeatedly — registerPushToken()
      // skips the network round-trip if
      // the token hasn't changed since the last successful registration.
      void registerPushToken(session.user.id);

      // Keep profiles.timezone honest — see lib/timezoneSync.ts for why this
      // matters (every "today" calculation on the backend depends on it).
      void syncDeviceTimezone(session.user.id);

      // Keep profiles.latitude/longitude/city honest too, but only when
      // permission is already granted -- see lib/locationSync.ts. Never
      // prompts from here; a fresh prompt only comes from Profile's
      // explicit "Update location" action.
      void syncDeviceLocationIfPermitted(session.user.id);

      // Onboarding gate — mirrors the web app's src/lib/onboarding-gate.ts /
      // ONBOARDING_REDIRECT_LOOP_FOLLOWUP.md fix. `profiles.onboarding_completed`
      // is `NOT NULL DEFAULT false`, so a successfully read row is always
      // `true`/`false`; only a *definitive* `false` means the user still needs
      // onboarding. Profile bootstrap above repairs historical trigger failures
      // before this read. A subsequent null is still treated as transient to
      // avoid a redirect loop during a database outage.
      // Onboarding gate: check local cache first so returning users route immediately
      // without blocking cold start on a network round-trip.
      const cacheKey = `shoonaya:onboarding_completed:${session.user.id}`;
      const cached = await AsyncStorage.getItem(cacheKey).catch(() => null);
      if (!isCurrentRoute()) return;

      if (cached === 'true') {
        if (inAuthGroup) {
          router.replace('/(tabs)');
        }
        // Background revalidation: keep cache in sync without gating initial render
        void supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data: p }) => {
            if (p?.onboarding_completed === false) {
              void AsyncStorage.setItem(cacheKey, 'false').catch(() => {});
              router.replace('/(auth)/onboarding');
            } else if (p?.onboarding_completed === true) {
              void AsyncStorage.setItem(cacheKey, 'true').catch(() => {});
            }
          });
        void offerNotificationPermission(session.user.id);
        return;
      }

      let { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!isCurrentRoute()) return;

      // The auth.users trigger should normally create this row. Repair only
      // historical/OAuth trigger failures. The response is always incomplete
      // for a newly created profile, so it routes to onboarding rather than a
      // default Home. Healthy accounts avoid this extra network request.
      if (!profile) {
        try {
          const bootstrapResponse = await apiFetch('/api/native/profile/bootstrap', {
            method: 'POST',
            timeoutMs: 5_000,
          });
          if (bootstrapResponse.ok) {
            const payload = await bootstrapResponse.json() as { onboarding_completed?: boolean };
            profile = { onboarding_completed: payload.onboarding_completed === true };
          } else {
            console.warn('[auth-profile] native profile bootstrap unavailable', bootstrapResponse.status);
          }
        } catch (error) {
          console.warn('[auth-profile] native profile bootstrap failed', error);
        }
        if (!isCurrentRoute()) return;
      }

      if (profile?.onboarding_completed === true) {
        void AsyncStorage.setItem(cacheKey, 'true').catch(() => {});
        void offerNotificationPermission(session.user.id);
      } else if (profile?.onboarding_completed === false) {
        void AsyncStorage.setItem(cacheKey, 'false').catch(() => {});
      }

      const needsOnboarding = profile?.onboarding_completed === false;
      const isOnboarding = inAuthGroup && childSegment === 'onboarding';

      if (needsOnboarding && !isOnboarding) {
        router.replace('/(auth)/onboarding');
      } else if (!needsOnboarding && inAuthGroup) {
        router.replace('/(tabs)');
      }
    },
    [applyStartupPreferences, offerNotificationPermission, router]
  );

  // ── Keep Supabase session refresh alive across backgrounding ─────────
  // supabase-js's `autoRefreshToken: true` (lib/supabase.ts) runs a JS timer
  // that React Native pauses whenever the app is backgrounded, so a session
  // that's been backgrounded past its token lifetime can come back stale.
  // This is Supabase's own documented fix for React Native: explicitly
  // start/stop the refresh timer on AppState transitions. Without this,
  // authenticated writes made right after returning from background (e.g.
  // marking today's shloka read) can fail with a stale/expired token even
  // though the user never signed out.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    return () => subscription.remove();
  }, []);

  // ── Emergency Fail-safe: Force app to show after 6 seconds ───────────
  useEffect(() => {
    if (readyToRender) return;

    const timer = setTimeout(() => {
      setAuthReady(true);
      setAppIsReady(true);
    }, 6000);

    return () => clearTimeout(timer);
  }, [readyToRender]);

  // ── Handle Push Notifications ────────────────────────────────────────
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;

    try {
      initPushNotifications();
      const cleanup = handleNotificationTap(router);
      return cleanup;
    } catch (e) {
      if (__DEV__) {
        console.warn('Push notification initialization skipped:', e);
      }
    }
  }, [fontsLoaded, fontError, router]);

  // ── Privacy-safe app analytics ────────────────────────────────────────
  useEffect(() => {
    if (!readyToRender) return;

    const routeName = segments.filter(Boolean).join('/') || 'home';
    trackScreenView(routeName).catch(() => {
      // Analytics must never interrupt app navigation.
    });
  }, [readyToRender, segments]);

  // ── Handle Auth and App State ─────────────────────────────────────
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;

    let mounted = true;

    const exchangeUrlIfPresent = async (url: string | null) => {
      if (!url) return;
      await exchangeOAuthUrlIfPresent(url);
    };

    const prepare = async () => {
      try {
        // Initial URL lookup and session restore are independent; run them
        // together so cold start does not pay both async waits serially.
        const [initialUrl, sessionResult] = await Promise.all([
          Linking.getInitialURL(),
          supabase.auth.getSession(),
        ]);

        // Handle Auth Redirects — cold start only; see the live Linking
        // listener below for the app-already-running case. Only re-fetch the session
        // when an OAuth exchange actually took place.
        const didExchange = initialUrl ? await exchangeOAuthUrlIfPresent(initialUrl) : false;

        const session = didExchange
          ? (await supabase.auth.getSession()).data.session
          : sessionResult.data.session;
        setApiAccessTokenFromSession(session);

        if (!mounted) return;

        await routeForSession(session);

        setAuthReady(true);
      } catch (e) {
        console.error('Initialization error:', e);
        setAuthReady(true); // Proceed anyway
      } finally {
        setAppIsReady(true);
      }
    };

    prepare();

    // Auth redirects that arrive while the app is already running (the
    // common case: user taps Google/Apple sign-in, completes auth in the
    // system browser, and returns to the still-running app). Google/Apple
    // sign-in already exchange the code directly from the WebBrowser result
    // in app/(auth)/login.tsx; this listener is a defense-in-depth fallback
    // for any redirect delivered through the platform's normal URL-scheme
    // handling instead.
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      exchangeUrlIfPresent(url).catch((e) => {
        console.error('Deep link auth exchange error:', e);
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      try {
        setApiAccessTokenFromSession(session);
        await routeForSession(session);
      } catch (e) {
        console.error('Auth state routing error:', e);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, [fontsLoaded, fontError, routeForSession]);

  // Startup must never return null. If the scene disappears before auth/app
  // readiness, retain an opaque branded fallback instead of exposing the
  // native window's white default.
  const showStartupFallback = resolveStartupSurface({ readyToRender, showStartupScene }) === 'fallback';

  return (
    <AppProviders>
      <StatusBar style={showStartupScene ? "light" : "dark"} />
      <View style={{ flex: 1, backgroundColor: '#FDF6E3' }}>
        {showStartupFallback ? (
          <View
            testID="startup-opaque-fallback"
            style={[StyleSheet.absoluteFill, { backgroundColor: '#FDF6E3' }]}
          />
        ) : null}
        <RouteTransition>
          <Slot />
        </RouteTransition>
        {showBottomNav ? <CollapsibleBottomNav /> : null}
        {showStartupScene ? (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { opacity: startupSceneOpacity, zIndex: 9999 },
            ]}
            pointerEvents="none"
          >
            <ContextualStartupScene
              scene={selectedScene}
              tradition={startupPrefs.tradition}
              timezone={startupPrefs.timezone}
              language={startupPrefs.language}
              onArtworkReady={() => startupLifecycleRef.current?.notifySceneReady()}
            />
          </Animated.View>
        ) : null}
      </View>
    </AppProviders>
  );
}

export default ObserveRoot.wrap(RootLayout);
