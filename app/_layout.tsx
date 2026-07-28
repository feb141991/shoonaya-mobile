import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import '../global.css';

import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import {
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Observe, ObserveRoot, useObserve } from 'expo-observe';

import { AppProviders } from '@/components/providers/AppProviders';
import { CollapsibleBottomNav } from '@/components/ui/CollapsibleBottomNav';
import { RouteTransition } from '@/components/ui/Motion';
import { trackScreenView } from '@/lib/analytics';
import { setApiAccessTokenFromSession } from '@/lib/api';
import { exchangeOAuthUrlIfPresent } from '@/lib/authRedirect';
import { supabase } from '@/lib/supabase';
import { initPushNotifications, handleNotificationTap, registerPushToken, unregisterPushToken } from '@/lib/notifications';
import { syncDeviceTimezone } from '@/lib/timezoneSync';
import { isGuestMode, setGuestMode } from '@/lib/guestSession';

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
  });

  const [authReady, setAuthReady] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);
  const readyToRender = appIsReady && authReady;
  const showBottomNav = readyToRender && rootSegment !== '(auth)' && rootSegment !== 'auth' && rootSegment !== undefined;

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
  useEffect(() => {
    segmentsRef.current = { rootSegment, childSegment };
  }, [rootSegment, childSegment]);

  const routeForSession = useCallback(
    async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      setApiAccessTokenFromSession(session);

      const { rootSegment, childSegment } = segmentsRef.current;
      const inAuthGroup = rootSegment === '(auth)';

      if (!session) {
        // Unbind this device's push token whenever there is no
        // authenticated session — covers explicit sign-out (all 3 call
        // sites: settings.tsx x2, profile.tsx) plus any future one, since
        // supabase.auth.signOut() always fires this listener with a null
        // session rather than requiring each call site to remember to clean
        // up push identity itself.
        void unregisterPushToken();

        // If guest mode is active, allow tabs and bypass login
        const guest = await isGuestMode();
        if (guest) {
          if (inAuthGroup) {
            router.replace('/(tabs)');
          }
          return;
        }

        if (!inAuthGroup) {
          router.replace('/(auth)/login');
        }
        return;
      }

      // Real sign-in should clear guest mode after session is established.
      await setGuestMode(false);

      // (Re-)register this device's push token against the signed-in user
      // on every authenticated session, not just once at the end of
      // onboarding — covers any *returning* user: sign back in after
      // logout, reinstall, second device, token refresh bringing a fresh
      // session object. This listener already re-runs on every auth state
      // change, so it's the single correct place for this, rather than
      // duplicating the call at every sign-in entry point (Google/Apple/
      // WhatsApp/OTP in login.tsx and otp.tsx). Cheap/idempotent to call
      // repeatedly — registerPushToken() skips the network round-trip if
      // the token hasn't changed since the last successful registration.
      void registerPushToken(session.user.id);

      // Keep profiles.timezone honest — see lib/timezoneSync.ts for why this
      // matters (every "today" calculation on the backend depends on it).
      void syncDeviceTimezone(session.user.id);

      // Onboarding gate — mirrors the web app's src/lib/onboarding-gate.ts /
      // ONBOARDING_REDIRECT_LOOP_FOLLOWUP.md fix. `profiles.onboarding_completed`
      // is `NOT NULL DEFAULT false`, so a successfully read row is always
      // `true`/`false`; only a *definitive* `false` means the user still needs
      // onboarding. A `null` profile read (RLS/session timing — the row itself
      // is guaranteed by the `handle_new_user` DB trigger) must NOT be treated
      // as "needs onboarding": that exact misclassification caused web's
      // `/home` <-> `/onboarding` redirect loop. Native fails open toward tabs
      // instead of onboarding on an ambiguous read, since (unlike web's
      // page-level gates) this function always has to pick a concrete route.
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', session.user.id)
        .maybeSingle();

      const needsOnboarding = profile?.onboarding_completed === false;
      const isOnboarding = inAuthGroup && childSegment === 'onboarding';

      if (needsOnboarding && !isOnboarding) {
        router.replace('/(auth)/onboarding');
      } else if (!needsOnboarding && inAuthGroup) {
        router.replace('/(tabs)');
      }
    },
    [router]
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
        // listener below for the app-already-running case.
        await exchangeUrlIfPresent(initialUrl);

        const { session } = initialUrl
          ? (await supabase.auth.getSession()).data
          : sessionResult.data;
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
    // common case: user taps Google/WhatsApp sign-in, completes auth in the
    // system browser, and returns to the still-running app). Google/WhatsApp
    // sign-in already exchange the code directly from the WebBrowser result
    // in app/(auth)/login.tsx and app/(auth)/otp.tsx; this listener is a
    // defense-in-depth fallback for any redirect delivered through the
    // platform's normal URL-scheme handling instead.
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

  // ── Hide Splash Screen when Ready ────────────────────────────────
  useEffect(() => {
    if (readyToRender) {
      SplashScreen.hideAsync().catch(() => {});
      // Marks Time to Interactive for EAS Observe — this is the moment
      // fonts are loaded, the initial auth/onboarding route decision has
      // been made, and the splash screen is gone, i.e. the app is
      // genuinely usable, not just mounted. Root layout is the one place
      // every cold start and every deep link passes through, so this
      // single call covers every entry point (the per-route TTI/TTR
      // metrics still come from the expo-router integration itself).
      markInteractive();
    }
  }, [readyToRender, markInteractive]);

  if (!readyToRender) {
    return null;
  }

  return (
    <AppProviders>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        <RouteTransition>
          <Slot />
        </RouteTransition>
        {showBottomNav ? <CollapsibleBottomNav /> : null}
      </View>
    </AppProviders>
  );
}

export default ObserveRoot.wrap(RootLayout);
