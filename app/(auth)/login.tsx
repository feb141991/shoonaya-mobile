import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { Feather, FontAwesome } from '@expo/vector-icons';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { exchangeOAuthCodeOnce } from '@/lib/authRedirect';
import { COLORS, FONTS, MIN_TOUCH_TARGET } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const TERMS_URL = 'https://shoonaya.com/terms';
const PRIVACY_URL = 'https://shoonaya.com/privacy';

type AuthAction = 'google' | 'apple' | 'whatsapp' | null;

// A soft, fixed-size radial glow behind the brand mark — purely decorative
// background depth, not a data-bearing element. Uses react-native-svg
// (already a dependency, already used for ProgressRing elsewhere) rather
// than expo-linear-gradient, which isn't installed and wasn't added. Fixed
// pixel dimensions (not percentage-of-parent), so there's no dependency on
// runtime layout measurement.
function BrandGlow() {
  const size = 320;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: -70, left: '50%', marginLeft: -size / 2, width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="brandGlow" cx="50%" cy="42%" r="55%">
            <Stop offset="0%" stopColor={COLORS.brandGold} stopOpacity={0.22} />
            <Stop offset="100%" stopColor={COLORS.brandGold} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill="url(#brandGlow)" />
      </Svg>
    </View>
  );
}

// Local to this screen (not promoted to components/ui) — the left icon-well
// + trailing chevron/spinner layout is specific to the two SSO buttons
// here, not a pattern repeated across other screens yet.
function AuthButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        void onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={({ pressed }) => ({
        minHeight: 56,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        backgroundColor: COLORS.cardBgLight,
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {icon ? (
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.surfaceSoftLight,
            }}
          >
            {icon}
          </View>
        ) : null}
        <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
          {label}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.ink} />
      ) : (
        <Feather name="chevron-right" size={18} color={COLORS.textDimLight} />
      )}
    </Pressable>
  );
}

function AuthDivider({ label }: { label: string }) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={{ flex: 1, height: 1, backgroundColor: COLORS.borderLight }} />
      <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.textDimLight }}>{label}</Text>
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
          await exchangeOAuthCodeOnce(code);
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
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <BrandGlow />
          <Image
            source={require('../../assets/icon.png')}
            style={{ width: 148, height: 148 }}
            resizeMode="contain"
            accessibilityLabel="Shoonaya"
          />
          <Text
            style={{
              fontFamily: FONTS.serifBold,
              fontSize: 15,
              color: COLORS.textDimLight,
              textAlign: 'center',
              maxWidth: 280,
              lineHeight: 22,
              marginTop: 4,
              letterSpacing: 0.2,
            }}
          >
            Ancient wisdom. Daily practice. One dharmic home in your hand.
          </Text>
        </View>

        <Card elevated>
          <View style={{ gap: 14 }}>
            <Text
              style={{
                fontFamily: FONTS.sansSemiBold,
                fontSize: 12,
                letterSpacing: 1,
                color: COLORS.textDimLight,
                textAlign: 'center',
              }}
            >
              Sign in or create your account
            </Text>

            <View style={{ gap: 10 }}>
              <AuthButton
                label={activeAction === 'google' ? 'Connecting to Google...' : 'Continue with Google'}
                onPress={handleGoogle}
                disabled={busy}
                loading={activeAction === 'google'}
                icon={<FontAwesome name="google" size={16} color={COLORS.ink} />}
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
                    style={{ height: 56, width: '100%' }}
                    onPress={() => {
                      void handleApple();
                    }}
                  />
                </View>
              ) : null}
            </View>

            <AuthDivider label="or continue with phone" />

            <Link href="/(auth)/whatsapp" asChild>
              <Pressable
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Continue with WhatsApp"
                accessibilityState={{ disabled: busy }}
                style={({ pressed }) => ({
                  minHeight: 56,
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: COLORS.brandGold,
                  backgroundColor: 'transparent',
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: busy ? 0.6 : pressed ? 0.85 : 1,
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: COLORS.authGoldWellBg,
                    }}
                  >
                    <FontAwesome name="whatsapp" size={17} color={COLORS.brandGold} />
                  </View>
                  <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
                    Continue with WhatsApp
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={COLORS.brandGold} />
              </Pressable>
            </Link>

            <View style={{ marginTop: 4, gap: 6 }}>
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
              <View
                accessible
                accessibilityRole="alert"
                style={{
                  marginTop: 2,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: COLORS.dangerBorder,
                  backgroundColor: COLORS.dangerBg,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Feather name="alert-circle" size={15} color={COLORS.danger} />
                <Text
                  style={{
                    flex: 1,
                    color: COLORS.danger,
                    fontFamily: FONTS.sans,
                    fontSize: 13,
                  }}
                >
                  {errorMessage}
                </Text>
              </View>
            ) : null}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
