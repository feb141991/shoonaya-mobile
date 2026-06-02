import 'react-native-gesture-handler';
import 'react-native-reanimated';
import '../global.css';

import { useEffect, useState } from 'react';
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

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [fontsLoaded] = useFonts({
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const [authReady, setAuthReady] = useState(false);

  // ── OneSignal init + tap handler ─────────────────────────────────
  useEffect(() => {
    if (!fontsLoaded) return;

    initOneSignal();
    const cleanup = handleNotificationTap(router);
    return cleanup;
  }, [fontsLoaded, router]);

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    let mounted = true;

    const handleAuthRedirect = async (url: string) => {
      const parsed = Linking.parse(url);
      const params = parsed.queryParams ?? {};
      const code = typeof params.code === 'string' ? params.code : null;
      const accessToken = typeof params.access_token === 'string' ? params.access_token : null;
      const refreshToken = typeof params.refresh_token === 'string' ? params.refresh_token : null;

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        return;
      }

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
    };

    const syncSessionState = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await handleAuthRedirect(initialUrl);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      const inAuthGroup = segments[0] === '(auth)';

      if (session && inAuthGroup) {
        router.replace('/(tabs)');
      } else if (!session && !inAuthGroup) {
        router.replace('/(auth)/login');
      }

      setAuthReady(true);
      SplashScreen.hideAsync().catch(() => {});
    };

    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      handleAuthRedirect(url)
        .then(async () => {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session) {
            router.replace('/(tabs)');
          }
        })
        .catch(() => {});
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const inAuthGroup = segments[0] === '(auth)';

      if (session && inAuthGroup) {
        router.replace('/(tabs)');
      } else if (!session && !inAuthGroup) {
        router.replace('/(auth)/login');
      }
    });

    syncSessionState().catch(() => {
      if (mounted) {
        setAuthReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    });

    return () => {
      mounted = false;
      urlSubscription.remove();
      subscription.unsubscribe();
    };
  }, [fontsLoaded, router, segments]);

  if (!fontsLoaded || !authReady) {
    return null;
  }

  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Slot />
    </AppProviders>
  );
}
