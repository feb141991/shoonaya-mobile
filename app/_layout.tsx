import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import '../global.css';

import { useEffect, useState, useCallback } from 'react';
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

import { AppProviders } from '@/components/providers/AppProviders';
import { exchangeOAuthCodeOnce } from '@/lib/authRedirect';
import { supabase } from '@/lib/supabase';
import { initOneSignal, handleNotificationTap } from '@/lib/notifications';

// Keep splash screen visible until we are ready
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const router = useRouter();
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

  const routeForSession = useCallback(
    async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      const inAuthGroup = rootSegment === '(auth)';

      if (!session) {
        if (!inAuthGroup) {
          router.replace('/(auth)/login');
        }
        return;
      }

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
    [router, rootSegment, childSegment]
  );

  // ── Emergency Fail-safe: Force app to show after 6 seconds ───────────
  useEffect(() => {
    if (readyToRender) return;

    const timer = setTimeout(() => {
      setAppIsReady(true);
    }, 6000);

    return () => clearTimeout(timer);
  }, [readyToRender]);

  // ── Handle OneSignal and Notifications ─────────────────────────────
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;

    try {
      initOneSignal();
      const cleanup = handleNotificationTap(router);
      return cleanup;
    } catch (e) {
      console.error('OneSignal initialization error:', e);
    }
  }, [fontsLoaded, fontError, router]);

  // ── Handle Auth and App State ─────────────────────────────────────
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;

    let mounted = true;

    const exchangeUrlIfPresent = async (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      const params = parsed.queryParams ?? {};
      const code = typeof params.code === 'string' ? params.code : null;

      if (code) {
        await exchangeOAuthCodeOnce(code);
      }
    };

    const prepare = async () => {
      try {
        // 1. Handle Initial URL (Auth Redirects — cold start only; see the
        // live Linking listener below for the app-already-running case)
        await exchangeUrlIfPresent(await Linking.getInitialURL());

        // 2. Sync Session
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        // 3. Navigation Guard
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
    }
  }, [readyToRender]);

  if (!readyToRender) {
    return null;
  }

  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Slot />
    </AppProviders>
  );
}
