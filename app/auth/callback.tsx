import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const [message, setMessage] = useState('Completing sign in...');

  useEffect(() => {
    let cancelled = false;

    const completeSignIn = async () => {
      try {
        const oauthError = params.error_description ?? params.error;
        if (oauthError) {
          throw new Error(oauthError);
        }

        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) {
            throw error;
          }
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          throw new Error('Sign in did not return a session.');
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('tradition')
          .eq('id', session.user.id)
          .single();

        if (cancelled) return;

        if (profile?.tradition) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/onboarding');
        }
      } catch (error) {
        if (cancelled) return;
        const nextMessage = error instanceof Error ? error.message : 'Sign in failed.';
        setMessage(nextMessage);
        setTimeout(() => {
          if (!cancelled) {
            router.replace('/(auth)/login');
          }
        }, 1800);
      }
    };

    void completeSignIn();

    return () => {
      cancelled = true;
    };
  }, [params.code, params.error, params.error_description, router]);

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <ActivityIndicator size="large" color={COLORS.brandGold} />
        <Text
          style={{
            color: COLORS.textDimLight,
            fontFamily: FONTS.sansSemiBold,
            fontSize: 15,
            textAlign: 'center',
          }}
        >
          {message}
        </Text>
      </View>
    </Screen>
  );
}
