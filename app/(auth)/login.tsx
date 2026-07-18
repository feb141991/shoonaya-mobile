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
  TextInput,
  View,
} from 'react-native';
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

type AuthAction = 'google' | 'apple' | 'email' | null;

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
  tone = 'light',
}: {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  tone?: 'light' | 'gold';
}) {
  const isGold = tone === 'gold';

  return (
    <View
      style={{
        minHeight: 56,
        borderRadius: 22,
        boxShadow: isGold ? SHADOWS.md.light : SHADOWS.sm.light,
        alignSelf: 'stretch',
        width: '100%',
        opacity: disabled ? 0.68 : 1,
      }}
    >
      <View
        style={{
          minHeight: 56,
          borderRadius: 22,
          borderWidth: isGold ? 0 : 1,
          borderColor: COLORS.homeBorderSoftLight,
          backgroundColor: isGold ? COLORS.brandGold : COLORS.cardBgLight,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          pointerEvents="none"
          colors={
            isGold
              ? [COLORS.brandGoldLight, COLORS.brandGold, COLORS.brandGoldDark]
              : [COLORS.cardBgLight, COLORS.homeShlokaSurfaceLight, COLORS.homeSoftLight]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', inset: 0 }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -34,
            right: -22,
            width: 110,
            height: 110,
            borderRadius: 55,
            backgroundColor: isGold ? COLORS.cardBgLight : COLORS.brandAccentLight,
            opacity: isGold ? 0.18 : 0.62,
          }}
        />
      <PressableSurface
        disabled={disabled}
        onPress={() => {
          void onPress();
        }}
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled, busy: !!loading }}
        style={{
          minHeight: 56,
          paddingVertical: 12,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          alignSelf: 'stretch',
          width: '100%',
          backgroundColor: 'transparent',
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
                backgroundColor: isGold ? COLORS.premiumGlassLight : COLORS.homeSoftLight,
                borderWidth: 1,
                borderColor: isGold ? COLORS.cardBgLight : COLORS.homeBorderSoftLight,
              }}
            >
              {icon}
            </View>
          ) : null}
          <Text
            style={{
              flex: 1,
              color: isGold ? COLORS.cardBgLight : COLORS.ink,
              fontFamily: FONTS.sansSemiBold,
              fontSize: 15.5,
            }}
          >
            {label}
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={isGold ? COLORS.cardBgLight : COLORS.ink} />
        ) : (
          <TrailingArrow color={isGold ? COLORS.cardBgLight : COLORS.textDimLight} />
        )}
      </PressableSurface>
      </View>
    </View>
  );
}

function TrustChip({ icon, label }: { icon: keyof typeof Feather.glyphMap; label: string }) {
  return (
    <View
      style={{
        minHeight: 30,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: COLORS.homeBorderSoftLight,
        backgroundColor: COLORS.premiumGlassLight,
        paddingHorizontal: 9,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <Feather name={icon} size={12} color={COLORS.brandGoldLight} />
      <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.brandEarthLight }}>
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
        width: 22,
        height: 22,
        marginLeft: 10,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Feather name="chevron-right" size={18} color={color} strokeWidth={2.2} />
    </View>
  );
}

export default function LoginScreen() {
  const [activeAction, setActiveAction] = useState<AuthAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);
  const brandScale = useRef(new Animated.Value(1)).current;
  const cardEntrance = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    if (reduceMotion) {
      cardEntrance.setValue(1);
      return;
    }

    Animated.timing(cardEntrance, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [cardEntrance, reduceMotion]);

  const handleGoogle = async () => {
    setActiveAction('google');
    setErrorMessage(null);
    setNoticeMessage(null);

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
    setNoticeMessage(null);

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

  const handleEmail = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setErrorMessage('Enter your email and password to continue.');
      return;
    }

    if (trimmedPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setActiveAction('email');
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (!signInError) {
        return;
      }

      const canCreate =
        signInError.message.toLowerCase().includes('invalid login') ||
        signInError.message.toLowerCase().includes('invalid credentials');

      if (!canCreate) {
        throw signInError;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          emailRedirectTo: getOAuthRedirectUri(),
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!signUpData.session) {
        setNoticeMessage('Account created. Check your email to confirm and continue.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Email sign-in failed.';
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
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <BrandGlow />
          <Animated.View
            style={{
              width: 168,
              height: 168,
              borderRadius: 84,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.homeShlokaSurfaceLight,
              borderWidth: 1,
              borderColor: COLORS.homeBorderSoftLight,
              boxShadow: SHADOWS.sm.light,
              transform: [{ scale: brandScale }],
            }}
          >
            <Image
              source={require('../../assets/brand/shoonaya-logo-transparent.png')}
              style={{ width: 148, height: 148 }}
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
              marginTop: 6,
            }}
          >
            Ancient wisdom. Daily practice. One dharmic home in your hand.
          </Text>
          <View
            style={{
              marginTop: 10,
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

        <Animated.View
          style={{
            opacity: cardEntrance,
            transform: [
              {
                translateY: cardEntrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              },
            ],
          }}
        >
          <Card
            elevated
            style={{
              padding: 18,
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
                Begin your journey
              </Text>
              <Text
                style={{
                  ...TYPE.caption,
                  color: COLORS.textDimLight,
                  textAlign: 'center',
                }}
              >
                Sign in or create your account securely.
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
              Choose how to enter
            </Text>

            <View style={{ gap: 9 }}>
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

            <AuthDivider label="or use email" />

            <View style={{ gap: 8 }}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor={COLORS.textDimLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                editable={!busy}
                style={{
                  minHeight: 50,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: COLORS.premiumBorderLight,
                  backgroundColor: COLORS.cardBgLight,
                  paddingHorizontal: 14,
                  color: COLORS.ink,
                  fontFamily: FONTS.sans,
                  fontSize: 14,
                }}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={COLORS.textDimLight}
                secureTextEntry
                textContentType="password"
                editable={!busy}
                style={{
                  minHeight: 50,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: COLORS.premiumBorderLight,
                  backgroundColor: COLORS.cardBgLight,
                  paddingHorizontal: 14,
                  color: COLORS.ink,
                  fontFamily: FONTS.sans,
                  fontSize: 14,
                }}
              />
              <AuthButton
                label={activeAction === 'email' ? 'Continuing with email...' : 'Continue with email'}
                onPress={handleEmail}
                disabled={busy}
                loading={activeAction === 'email'}
                tone="gold"
                icon={<Feather name="mail" size={16} color={COLORS.cardBgLight} />}
              />
            </View>

            <View style={{ marginTop: 2, gap: 4 }}>
              <Text
                style={{
                  color: COLORS.textDimLight,
                  fontFamily: FONTS.sans,
                  fontSize: 12,
                  textAlign: 'center',
                }}
              >
                By continuing, you agree to
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
                      fontFamily: FONTS.sans,
                      fontSize: 12.5,
                      textDecorationLine: 'none',
                    }}
                  >
                    Terms of Service
                  </Text>
                </PressableSurface>
                <Text style={{ color: COLORS.textDimLight, fontFamily: FONTS.sans, fontSize: 12 }}>
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
                      fontFamily: FONTS.sans,
                      fontSize: 12.5,
                      textDecorationLine: 'none',
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
            {noticeMessage ? (
              <View
                accessible
                style={{
                  marginTop: 2,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: COLORS.successBorder,
                  backgroundColor: COLORS.successBg,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Feather name="check-circle" size={15} color={COLORS.success} />
                <Text
                  style={{
                    flex: 1,
                    color: COLORS.success,
                    fontFamily: FONTS.sans,
                    fontSize: 13,
                  }}
                >
                  {noticeMessage}
                </Text>
              </View>
            ) : null}
          </View>
          </Card>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
