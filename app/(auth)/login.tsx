import { useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const TERMS_URL = 'https://shoonaya.com/terms';
const PRIVACY_URL = 'https://shoonaya.com/privacy';

type AuthAction = 'google' | 'apple' | 'whatsapp' | null;

function AuthButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        void onPress();
      }}
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        backgroundColor: COLORS.cardBgLight,
        paddingVertical: 15,
        paddingHorizontal: 16,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Text
        style={{
          color: COLORS.ink,
          textAlign: 'center',
          fontFamily: FONTS.sansSemiBold,
          fontSize: 15,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function LoginScreen() {
  const [activeAction, setActiveAction] = useState<AuthAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogle = async () => {
    setActiveAction('google');
    setErrorMessage(null);

    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'shoonaya',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error('Google sign-in URL was not returned.');
      }

      await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed.';
      setErrorMessage(message);
    } finally {
      setActiveAction(null);
    }
  };

  const handleApple = async () => {
    setActiveAction('apple');
    setErrorMessage(null);

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('Apple identity token was not returned.');
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'The authorization attempt was canceled.'
      ) {
        setActiveAction(null);
        return;
      }

      const message = error instanceof Error ? error.message : 'Apple sign-in failed.';
      setErrorMessage(message);
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Image
          source={require('../../assets/icon.png')}
          style={{
            width: 220,
            height: 220,
            alignSelf: 'center',
            marginBottom: 18,
          }}
          resizeMode="contain"
          accessibilityLabel="Shoonaya"
        />
        <Text
          style={{
            fontFamily: FONTS.sans,
            fontSize: 16,
            color: COLORS.textDimLight,
            marginBottom: 20,
          }}
        >
          Ancient wisdom. Daily practice. One dharmic home in your hand.
        </Text>
        <Card>
          <View style={{ gap: 12 }}>
            <AuthButton
              label={activeAction === 'google' ? 'Connecting to Google...' : 'Continue with Google'}
              onPress={handleGoogle}
              disabled={activeAction !== null}
            />

            {Platform.OS === 'ios' ? (
              <AuthButton
                label={activeAction === 'apple' ? 'Connecting to Apple...' : 'Continue with Apple'}
                onPress={handleApple}
                disabled={activeAction !== null}
              />
            ) : null}

            <Link href="/(auth)/whatsapp" asChild>
              <Pressable
                disabled={activeAction !== null}
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: COLORS.borderLight,
                  backgroundColor: COLORS.brandGold,
                  paddingVertical: 15,
                  paddingHorizontal: 16,
                  opacity: activeAction !== null ? 0.6 : 1,
                }}
              >
                <Text
                  style={{
                    color: COLORS.ink,
                    textAlign: 'center',
                    fontFamily: FONTS.sansSemiBold,
                    fontSize: 15,
                  }}
                >
                  Continue with WhatsApp
                </Text>
              </Pressable>
            </Link>

            <Text
              style={{
                color: COLORS.textDimLight,
                fontFamily: FONTS.sans,
                fontSize: 12,
                textAlign: 'center',
                paddingTop: 4,
                lineHeight: 18,
              }}
            >
              By continuing, you agree to our{' '}
              <Text
                accessibilityRole="link"
                onPress={() => { void Linking.openURL(TERMS_URL); }}
                style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold }}
              >
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text
                accessibilityRole="link"
                onPress={() => { void Linking.openURL(PRIVACY_URL); }}
                style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold }}
              >
                Privacy Policy
              </Text>
              .
            </Text>

            {activeAction !== null ? (
              <View style={{ alignItems: 'center', paddingTop: 4 }}>
                <ActivityIndicator color={COLORS.brandGold} />
              </View>
            ) : null}

            {errorMessage ? (
              <Text
                style={{
                  color: COLORS.textDimLight,
                  fontFamily: FONTS.sans,
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                {errorMessage}
              </Text>
            ) : null}
          </View>
        </Card>
      </View>
    </Screen>
  );
}
