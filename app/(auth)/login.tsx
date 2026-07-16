import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Linking,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { Feather, FontAwesome } from '@expo/vector-icons';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { exchangeOAuthUrlIfPresent, getOAuthRedirectUri, waitForStoredSession } from '@/lib/authRedirect';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const TERMS_URL = 'https://shoonaya.com/terms';
const PRIVACY_URL = 'https://shoonaya.com/privacy';

type AuthAction = 'google' | 'apple' | 'whatsapp' | null;

function BrandGlow() {
  const size = 360;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: -112, left: '50%', marginLeft: -size / 2, width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="brandGlow" cx="50%" cy="42%" r="55%">
            <Stop offset="0%" stopColor={COLORS.brandGoldLight} stopOpacity={0.26} />
            <Stop offset="48%" stopColor={COLORS.brandGold} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={COLORS.brandGold} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill="url(#brandGlow)" />
      </Svg>
    </View>
  );
}

function AmbientField() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <LinearGradient
        colors={[COLORS.brandAccentLight, COLORS.creamBg, COLORS.homeHeroLight]}
        locations={[0, 0.58, 1]}
        style={{ position: 'absolute', inset: 0 }}
      />
      <View
        style={{
          position: 'absolute',
          top: -80,
          right: -112,
          width: 250,
          height: 250,
          borderRadius: 125,
          backgroundColor: COLORS.homeSoftLight,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 70,
          left: -120,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: COLORS.selectionWellSelected,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 180,
          left: 28,
          right: 28,
          height: 1,
          backgroundColor: COLORS.homeBorderSoftLight,
          opacity: 0.7,
        }}
      />
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
    <PressableSurface
      disabled={disabled}
      onPress={() => {
        void onPress();
      }}
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={{
        minHeight: 58,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.premiumBorderLight,
        backgroundColor: COLORS.cardBgLight,
        boxShadow: SHADOWS.sm.light,
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        alignSelf: 'stretch',
        width: '100%',
      }}
    >
      <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {icon ? (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.homeSoftLight,
              borderWidth: 1,
              borderColor: COLORS.homeBorderSoftLight,
            }}
          >
            {icon}
          </View>
        ) : null}
        <Text style={{ flex: 1, color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15.5 }}>
          {label}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.ink} />
      ) : (
        <TrailingArrow color={COLORS.textDimLight} />
      )}
    </PressableSurface>
  );
}

function TrustChip({ icon, label }: { icon: keyof typeof Feather.glyphMap; label: string }) {
  return (
    <View
      style={{
        minHeight: 34,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: COLORS.homeBorderSoftLight,
        backgroundColor: COLORS.homeShlokaSurfaceLight,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Feather name={icon} size={13} color={COLORS.brandGoldLight} />
      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11.5, color: COLORS.brandEarthLight }}>
        {label}
      </Text>
    </View>
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

function TrailingArrow({ color }: { color: string }) {
  return (
    <View
      pointerEvents="none"
      style={{
        width: 28,
        height: 28,
        marginLeft: 10,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontFamily: FONTS.sansSemiBold, fontSize: 22, lineHeight: 24 }}>
        &gt;
      </Text>
    </View>
  );
}

export default function LoginScreen() {
  const [activeAction, setActiveAction] = useState<AuthAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const brandScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      brandScale.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(brandScale, {
          toValue: 1.025,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(brandScale, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();

    return () => {
      loop.stop();
    };
  }, [brandScale, reduceMotion]);

  const handleGoogle = async () => {
    setActiveAction('google');
    setErrorMessage(null);

    try {
      const redirectUri = getOAuthRedirectUri();

      if (__DEV__) {
        // Diagnostic only — visible via `adb logcat` / Metro, never shown
        // in the UI. This is the exact string that must appear in
        // Supabase's Redirect URLs allow-list (Authentication → URL
        // Configuration) for the project this build actually points at
        // (see EXPO_PUBLIC_SUPABASE_URL in lib/supabase.ts).
        console.log('[auth] Google redirectUri:', redirectUri);
      }

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

      if (__DEV__) {
        console.log('[auth] openAuthSessionAsync result:', result.type, 'url' in result ? result.url : undefined);
      }

      if (result.type === 'success' && result.url) {
        const exchanged = await exchangeOAuthUrlIfPresent(result.url);

        if (!exchanged) {
          // Redirect matched our scheme but carried neither a code nor an
          // error — the browser landed somewhere unexpected. Surface this
          // rather than silently returning to an unchanged login screen.
          throw new Error(
            `Sign-in redirect did not include a code (${result.url}). Check that this exact URL is allow-listed in Supabase → Authentication → URL Configuration.`
          );
        }
      } else if (result.type === 'cancel') {
        // User closed the browser themselves — not an error, no message.
      } else {
        // Android's WebBrowser auth-session polyfill can resolve as
        // "dismiss" when the app becomes active before the deep-link
        // listener wins its race. Give the global Linking/callback path a
        // short window to exchange the code before surfacing a real error.
        const session = await waitForStoredSession(2800);

        if (!session) {
          throw new Error(
            `Sign-in did not complete (browser result: "${result.type}"). The app returned from Google before an auth session was stored.`
          );
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
    <Screen style={{ paddingHorizontal: 18, paddingTop: 10, backgroundColor: COLORS.creamBg }}>
      <AmbientField />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', marginBottom: 22 }}>
          <BrandGlow />
          <Animated.View
            style={{
              width: 154,
              height: 154,
              borderRadius: 42,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: brandScale }],
            }}
          >
            <Image
              source={require('../../assets/icon.png')}
              style={{ width: 142, height: 142 }}
              resizeMode="contain"
              accessibilityLabel="Shoonaya"
            />
          </Animated.View>
          <Text
            style={{
              ...TYPE.chip,
              marginTop: -2,
              color: COLORS.brandGoldLight,
              letterSpacing: 2.2,
              textTransform: 'uppercase',
            }}
          >
            Welcome to Shoonaya
          </Text>
          <Text
            style={{
              fontFamily: FONTS.serifBold,
              fontSize: 21,
              lineHeight: 26,
              color: COLORS.ink,
              textAlign: 'center',
              maxWidth: 320,
              marginTop: 8,
            }}
          >
            Ancient wisdom. Daily practice. One dharmic home in your hand.
          </Text>
          <View
            style={{
              marginTop: 14,
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 8,
              maxWidth: 340,
            }}
          >
            <TrustChip icon="sunrise" label="Daily rhythm" />
            <TrustChip icon="book-open" label="Sacred learning" />
            <TrustChip icon="users" label="Mandali" />
          </View>
        </View>

        <Card
          elevated
          style={{
            padding: 20,
            borderColor: COLORS.premiumBorderLight,
            backgroundColor: COLORS.premiumGlassLight,
            boxShadow: SHADOWS.lg.light,
          }}
        >
          <View style={{ gap: 15 }}>
            <View style={{ alignItems: 'center', gap: 5 }}>
              <Text
                style={{
                  ...TYPE.cardHeading,
                  color: COLORS.ink,
                  textAlign: 'center',
                }}
              >
                Continue your journey
              </Text>
              <Text
                style={{
                  ...TYPE.caption,
                  color: COLORS.textDimLight,
                  textAlign: 'center',
                }}
              >
                Sign in or create your account in one step.
              </Text>
            </View>
            <Text
              style={{
                fontFamily: FONTS.sansSemiBold,
                fontSize: 11,
                letterSpacing: 1.6,
                color: COLORS.brandGoldLight,
                textAlign: 'center',
                textTransform: 'uppercase',
              }}
            >
              Choose a method
            </Text>

            <View style={{ gap: 10 }}>
              <AuthButton
                label={activeAction === 'google' ? 'Connecting to Google...' : 'Continue with Google'}
                onPress={handleGoogle}
                disabled={busy}
                loading={activeAction === 'google'}
                icon={<FontAwesome name="google" size={16} color={COLORS.brandGoldLight} />}
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
              <PressableSurface
                haptic="selection"
                disabled={busy}
                accessibilityLabel="Continue with WhatsApp"
                accessibilityState={{ disabled: busy }}
                style={{
                  minHeight: 56,
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: COLORS.brandGold,
                  backgroundColor: COLORS.authGoldWellBg,
                  boxShadow: SHADOWS.sm.light,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  alignSelf: 'stretch',
                  width: '100%',
                }}
              >
                <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: COLORS.cardBgLight,
                      borderWidth: 1,
                      borderColor: COLORS.homeBorderSoftLight,
                    }}
                  >
                    <FontAwesome name="whatsapp" size={17} color={COLORS.brandGold} />
                  </View>
                  <Text style={{ flex: 1, color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
                    Continue with WhatsApp
                  </Text>
                </View>
                <TrailingArrow color={COLORS.brandGold} />
              </PressableSurface>
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
                <PressableSurface
                  haptic="selection"
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
                </PressableSurface>
                <Text style={{ color: COLORS.textDimLight, fontFamily: FONTS.sans, fontSize: 13 }}>
                  &
                </Text>
                <PressableSurface
                  haptic="selection"
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
                </PressableSurface>
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
