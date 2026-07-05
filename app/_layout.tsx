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
import { supabase } from '@/lib/supabase';
import { initOneSignal, handleNotificationTap } from '@/lib/notifications';

// Keep splash screen visible until we are ready
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [authReady, setAuthReady] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);

  const routeForSession = useCallback(
    async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      const inAuthGroup = segments[0] === '(auth)';

      if (!session) {
        if (!inAuthGroup) {
          router.replace('/(auth)/login');
        }
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tradition')
        .eq('id', session.user.id)
        .single();

      const hasCompletedOnboarding = !!profile?.tradition;
      const isOnboarding = inAuthGroup && segments[1] === 'onboarding';

      if (!hasCompletedOnboarding && !isOnboarding) {
        router.replace('/(auth)/onboarding');
      } else if (hasCompletedOnboarding && inAuthGroup) {
        router.replace('/(tabs)');
      }
    },
    [router, segments]
  );

  // ── Emergency Fail-safe: Force app to show after 6 seconds ───────────
  useEffect(() => {
    const timer = setTimeout(() => {
      console.warn('Splash screen hide triggered by timeout fail-safe');
      setAppIsReady(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

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

    const prepare = async () => {
      try {
        // 1. Handle Initial URL (Auth Redirects)
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const parsed = Linking.parse(initialUrl);
          const params = parsed.queryParams ?? {};
          const code = typeof params.code === 'string' ? params.code : null;

          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          }
        }

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      await routeForSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fontsLoaded, fontError, routeForSession]);

  // ── Hide Splash Screen when Ready ────────────────────────────────
  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Slot />
    </AppProviders>
  );
}
