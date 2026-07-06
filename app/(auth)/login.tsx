import { useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { Feather } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const TERMS_URL = 'https://shoonaya.com/terms';
const PRIVACY_URL = 'https://shoonaya.com/privacy';

// Minimum touch target per accessibility guidance (WCAG 2.5.5 / Material 44dp).
const MIN_TOUCH_TARGET = 44;

type AuthAction = 'google' | 'apple' | 'whatsapp' | null;

function AuthButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        void onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={{
        minHeight: 52,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        backgroundColor: COLORS.cardBgLight,
        paddingVertical: 14,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Text
        style={{
          color: COLORS.ink,
          fontFamily: FONTS.sansSemiBold,
          fontSize: 15,
        }}
      >
        {label}
      </Text>
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.ink} />
      ) : (
        <Feather name="chevron-right" size={18} color={COLORS.ink} />
      )}
    </Pressable>
  );
}

function AuthDivider() {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={{ flex: 1, height: 1, backgroundColor: COLORS.borderLight }} />
      <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.textDimLight }}>or</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: COLORS.borderLight }} />
    </View>
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

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      // The system auth session resolves with the final redirect URL
      // directly — it does not reliably reach app/_layout.tsx's Linking
      // handling while the app stays running in the foreground (that
      // path only reliably covers a cold start). The PKCE `code` must be
      // exchanged from here, or a completed Google sign-in silently never
      // creates a session.
      if (result.type === 'success' && result.url) {
        const redirectParams = new URL(result.url).searchParams;
        const oauthError = redirectParams.get('error_description') ?? redirectParams.get('error');
        const code = redirectParams.get('code');

        if (oauthError) {
          throw new Error(oauthError);
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
        }
      }
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

  const busy = activeAction !== null;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', marginBottom: 26 }}>
          <Image
            source={require('../../assets/icon.png')}
            style={{ width: 148, height: 148 }}
            resizeMode="contain"
            accessibilityLabel="Shoonaya"
          />
          <Text
            style={{
              fontFamily: FONTS.sans,
              fontSize: 15,
              color: COLORS.textDimLight,
              textAlign: 'center',
              maxWidth: 280,
              lineHeight: 21,
              marginTop: 2,
            }}
          >
            Ancient wisdom. Daily practice. One dharmic home in your hand.
          </Text>
        </View>

        <Card>
          <View style={{ gap: 12 }}>
            <Text
              style={{
                fontFamily: FONTS.sansSemiBold,
                fontSize: 13,
                color: COLORS.textDimLight,
                textAlign: 'center',
                marginBottom: 2,
              }}
            >
              Sign in or create your account
            </Text>

            <AuthButton
              label={activeAction === 'google' ? 'Connecting to Google...' : 'Continue with Google'}
              onPress={handleGoogle}
              disabled={busy}
              loading={activeAction === 'google'}
            />

            {Platform.OS === 'ios' ? (
              <View
                pointerEvents={busy ? 'none' : 'auto'}
                style={{ opacity: busy && activeAction !== 'apple' ? 0.6 : 1 }}
              >
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={18}
                  style={{ height: 52, width: '100%' }}
                  onPress={() => {
                    void handleApple();
                  }}
                />
              </View>
            ) : null}

            <AuthDivider />

            <Link href="/(auth)/whatsapp" asChild>
              <Pressable
                disabled={busy}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                style={{
                  minHeight: 52,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: COLORS.brandGold,
                  backgroundColor: COLORS.brandGold,
                  paddingVertical: 14,
                  paddingHorizontal: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: busy ? 0.6 : 1,
                }}
              >
                <Text
                  style={{
                    color: COLORS.ink,
                    fontFamily: FONTS.sansSemiBold,
                    fontSize: 15,
                  }}
                >
                  Continue with WhatsApp
                </Text>
                <Feather name="chevron-right" size={18} color={COLORS.ink} />
              </Pressable>
            </Link>

            <View style={{ marginTop: 6, gap: 6 }}>
              <Text
                style={{
                  color: COLORS.textDimLight,
                  fontFamily: FONTS.sans,
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                By continuing, you agree to our
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <Pressable
                  accessibilityRole="link"
                  hitSlop={8}
                  onPress={() => { void Linking.openURL(TERMS_URL); }}
                  style={{
                    minHeight: MIN_TOUCH_TARGET,
                    justifyContent: 'center',
                    paddingHorizontal: 6,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.brandGold,
                      fontFamily: FONTS.sansSemiBold,
                      fontSize: 13,
                      textDecorationLine: 'underline',
                    }}
                  >
                    Terms of Service
                  </Text>
                </Pressable>
                <Text style={{ color: COLORS.textDimLight, fontFamily: FONTS.sans, fontSize: 13 }}>
                  &
                </Text>
                <Pressable
                  accessibilityRole="link"
                  hitSlop={8}
                  onPress={() => { void Linking.openURL(PRIVACY_URL); }}
                  style={{
                    minHeight: MIN_TOUCH_TARGET,
                    justifyContent: 'center',
                    paddingHorizontal: 6,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.brandGold,
                      fontFamily: FONTS.sansSemiBold,
                      fontSize: 13,
                      textDecorationLine: 'underline',
                    }}
                  >
                    Privacy Policy
                  </Text>
                </Pressable>
              </View>
            </View>

            {errorMessage ? (
              <Text
                style={{
                  color: 'crimson',
                  fontFamily: FONTS.sans,
                  fontSize: 13,
                  textAlign: 'center',
                  marginTop: 2,
                }}
              >
                {errorMessage}
              </Text>
            ) : null}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
