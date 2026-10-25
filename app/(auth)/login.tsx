import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { exchangeOAuthUrlIfPresent, getOAuthRedirectUri, waitForStoredSession } from '@/lib/authRedirect';
import { transmitAppleAuthorizationCode } from '@/lib/appleAuthToken';
import { API_BASE, COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, SOCIAL_LINKS, TYPE, themeColor } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import {
  classifySignInErrorMessage,
  classifySignUpErrorMessage,
  classifyForgotPasswordErrorMessage,
  classifyOAuthErrorMessage,
} from '@/lib/authErrorMessages';
import { setGuestMode } from '@/lib/guestSession';
import { setAppIdentity } from '@/lib/appIdentity';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

if (GOOGLE_WEB_CLIENT_ID) {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    scopes: ['email', 'profile'],
  });
}

// Must match handleSignUp's check below and the hint on the form.
const MIN_PASSWORD_LENGTH = 6;

const TERMS_URL = 'https://shoonaya.com/terms';
const PRIVACY_URL = 'https://shoonaya.com/privacy';

type AuthAction = 'google' | 'apple' | 'signin' | 'signup' | 'forgot-password' | 'atithi' | null;

function getNativeErrorCode(error: unknown): string | number | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' || typeof code === 'number' ? code : null;
}

function BrandGlow({ isDark }: { isDark: boolean }) {
  const size = 360;
  const brandEdge = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: -112, left: '50%', marginLeft: -size / 2, width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="brandGlow" cx="50%" cy="42%" r="55%">
            <Stop offset="0%" stopColor={brandEdge} stopOpacity={0.26} />
            <Stop offset="48%" stopColor={COLORS.brandGold} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={COLORS.brandGold} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill="url(#brandGlow)" />
      </Svg>
    </View>
  );
}

function AmbientField({ isDark }: { isDark: boolean }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <LinearGradient
        colors={
          isDark
            ? [COLORS.brandAccentDark, COLORS.darkBg, COLORS.homeHeroDark]
            : [COLORS.brandAccentLight, COLORS.creamBg, COLORS.homeHeroLight]
        }
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
          backgroundColor: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight,
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
          // Theme-independent by design elsewhere in the app (see
          // app/(auth)/onboarding.tsx's wellBgSelected, notifications.tsx's
          // unreadBg) — not paired with selectionWellDark, which is
          // selectionWellLight's own dark counterpart, a different token.
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
          backgroundColor: isDark ? COLORS.homeBorderSoftDark : COLORS.homeBorderSoftLight,
          opacity: 0.7,
        }}
      />
    </View>
  );
}

function GoogleAuthButton({
  onPress,
  disabled,
  loading,
  isDark,
}: {
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  isDark: boolean;
}) {
  const theme = themeColor(isDark);
  const borderSoft = isDark ? COLORS.homeBorderSoftDark : COLORS.borderLight;
  const bgColor = isDark ? COLORS.cardBgDark : '#FFFFFF';
  const textColor = isDark ? theme.text : '#1F2937';

  return (
    <View
      style={{
        minHeight: 54,
        borderRadius: 18,
        boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
        alignSelf: 'stretch',
        width: '100%',
        opacity: disabled ? 0.68 : 1,
      }}
    >
      <PressableSurface
        disabled={disabled}
        onPress={() => {
          void onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityState={{ disabled: !!disabled, busy: !!loading }}
        haptic="selection"
        style={{
          minHeight: 54,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: borderSoft,
          backgroundColor: bgColor,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'stretch',
          width: '100%',
          gap: 12,
        }}
      >
        <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
          <GoogleIcon size={20} />
        </View>
        <Text
          style={{
            color: textColor,
            fontFamily: FONTS.sansSemiBold,
            fontSize: 15,
            paddingRight: 2,
          }}
        >
          {loading ? 'Connecting to Google...' : 'Continue with Google'}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={theme.brand} style={{ marginLeft: 4 }} />
        ) : null}
      </PressableSurface>
    </View>
  );
}

function AppleAuthButton({
  onPress,
  disabled,
  loading,
  isDark,
}: {
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  isDark: boolean;
}) {
  const borderSoft = isDark ? '#FFFFFF' : '#000000';
  const bgColor = isDark ? '#FFFFFF' : '#000000';
  const textColor = isDark ? '#000000' : '#FFFFFF';
  const iconColor = isDark ? '#000000' : '#FFFFFF';

  return (
    <View
      style={{
        minHeight: 54,
        borderRadius: 18,
        boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
        alignSelf: 'stretch',
        width: '100%',
        opacity: disabled ? 0.68 : 1,
      }}
    >
      <PressableSurface
        disabled={disabled}
        onPress={() => {
          void onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel="Continue with Apple"
        accessibilityState={{ disabled: !!disabled, busy: !!loading }}
        haptic="selection"
        style={{
          minHeight: 54,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: borderSoft,
          backgroundColor: bgColor,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'stretch',
          width: '100%',
          gap: 12,
        }}
      >
        <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesome name="apple" size={20} color={iconColor} style={{ marginBottom: 2 }} />
        </View>
        <Text
          style={{
            color: textColor,
            fontFamily: FONTS.sansSemiBold,
            fontSize: 15,
            paddingRight: 2,
          }}
        >
          {loading ? 'Connecting to Apple...' : 'Continue with Apple'}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} style={{ marginLeft: 4 }} />
        ) : null}
      </PressableSurface>
    </View>
  );
}

// Local to this screen (not promoted to components/ui) — the left icon-well
// layout is specific to the auth buttons here, not a pattern repeated across
// other screens yet.
function AuthButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
  tone = 'light',
  isDark,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  tone?: 'light' | 'gold';
  isDark: boolean;
}) {
  const isGold = tone === 'gold';
  const theme = themeColor(isDark);
  const shadow = isGold ? SHADOWS.md : SHADOWS.sm;
  const borderSoft = isDark ? COLORS.homeBorderSoftDark : COLORS.homeBorderSoftLight;
  const shlokaSurface = isDark ? COLORS.homeShlokaSurfaceDark : COLORS.homeShlokaSurfaceLight;
  const homeSoft = isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight;
  const brandAccent = isDark ? COLORS.brandAccentDark : COLORS.brandAccentLight;

  return (
    <View
      style={{
        minHeight: 56,
        borderRadius: 22,
        boxShadow: isDark ? shadow.dark : shadow.light,
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
          borderColor: borderSoft,
          backgroundColor: isGold ? COLORS.brandGold : theme.card,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          pointerEvents="none"
          colors={
            isGold
              ? [COLORS.brandGoldLight, COLORS.brandGold, COLORS.brandGoldDark]
              : [theme.card, shlokaSurface, homeSoft]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', inset: 0 }}
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
                backgroundColor: isGold ? COLORS.premiumGlassLight : homeSoft,
                borderWidth: 1,
                borderColor: isGold ? COLORS.cardBgLight : borderSoft,
              }}
            >
              {icon}
            </View>
          ) : null}
          <Text
            style={{
              flex: 1,
              color: isGold ? COLORS.cardBgLight : theme.text,
              fontFamily: FONTS.sansSemiBold,
              fontSize: 15.5,
              paddingRight: 2,
            }}
          >
            {label}
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={isGold ? COLORS.cardBgLight : theme.text} />
        ) : null}
      </PressableSurface>
      </View>
    </View>
  );
}

function AuthDivider({ label, isDark }: { label: string; isDark: boolean }) {
  const theme = themeColor(isDark);
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
      <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: theme.dim }}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
    </View>
  );
}

export default function LoginScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<AuthAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  // Two steps: pick how to continue, then (only for email) fill in the form. Presentation only: the
  // sign-in handlers below are unchanged.
  const [step, setStep] = useState<'choose' | 'email'>('choose');
  const [showPassword, setShowPassword] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // The system navigation bar sits under the screen on Android (AGENTS.md section 12).
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(Platform.OS === 'ios');
  const brandScale = useRef(new Animated.Value(1)).current;
  const cardEntrance = useRef(new Animated.Value(0)).current;

  const handleAtithiMode = async () => {
    setActiveAction('atithi');
    try {
      await setGuestMode(true);
      // Guest mode does not emit a Supabase auth event. Publish the identity
      // before navigation so Home cannot treat the unchanged null session as
      // an unauthenticated redirect.
      setAppIdentity({ kind: 'guest' });
      router.replace('/(tabs)');
    } catch {
      setErrorMessage('Could not activate Atithi Mode.');
    } finally {
      setActiveAction(null);
    }
  };

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

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    let mounted = true;
    void AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (__DEV__) {
          console.log('[auth] AppleAuthentication.isAvailableAsync:', available);
        }
        if (mounted) setAppleAvailable(available);
      })
      .catch((error) => {
        if (__DEV__) {
          console.log('[auth] AppleAuthentication.isAvailableAsync failed:', error);
        }
        if (mounted) setAppleAvailable(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleGoogle = async () => {
    setActiveAction('google');
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      // The Android project already carries google-services.json and the Google
      // Services Gradle plugin. iOS intentionally keeps the established browser
      // OAuth path until an iOS OAuth client / GoogleService-Info.plist exists.
      if (GOOGLE_WEB_CLIENT_ID && Platform.OS === 'android') {
        try {
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          const response = await GoogleSignin.signIn();

          if (response.data?.idToken) {
            const { error: nativeAuthError } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: response.data.idToken,
            });

            if (nativeAuthError) throw nativeAuthError;

            const session = await waitForStoredSession();
            if (session) {
              // Root _layout.tsx onAuthStateChange listener is the sole
              // navigator once the session is actually established (routing to
              // onboarding or tabs based on onboarding_completed status).
              return;
            }
          }
        } catch (nativeError: any) {
          if (nativeError?.code === statusCodes.SIGN_IN_CANCELLED) {
            // User cancelled native prompt
            return;
          }
          if (__DEV__) {
            console.log('[auth] Native Google Sign-In failed or cancelled, falling back to web browser:', nativeError);
          }
        }
      }

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
      const message = classifyOAuthErrorMessage(error, 'Google');
      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setActiveAction(null);
    }
  };

  const handleApple = async () => {
    if (!appleAvailable) {
      setErrorMessage('Apple sign-in is not available on this device. Use email or Google here, or test Apple on a signed-in iPhone build.');
      return;
    }

    setActiveAction('apple');
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      if (__DEV__) {
        console.log('[auth] Starting native Apple sign-in');
      }

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
        if (__DEV__) {
          console.log('[auth] Supabase Apple signInWithIdToken failed:', error.message);
        }
        throw error;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) console.warn('[auth] post-Apple-signin session check unavailable', sessionError);
      if (!data.session) {
        await waitForStoredSession(2800);
      }

      if (credential.authorizationCode) {
        // await so session is confirmed before transmitting; the call is
        // non-blocking to the user flow — errors are logged, never surfaced.
        const transmitResult = await transmitAppleAuthorizationCode(credential.authorizationCode);
        if (__DEV__ && transmitResult !== 'ok' && transmitResult !== 'no_code') {
          console.warn(`[auth] Apple code transmission result: ${transmitResult}`);
        }
      }
    } catch (error) {
      const message = classifyOAuthErrorMessage(error, 'Apple');
      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setActiveAction(null);
    }
  };

  // Sign In and Create Account are two explicit, separate actions -- never
  // a guess based on how sign-in happened to fail. The previous single
  // "Continue with email" button attempted signUp whenever
  // signInWithPassword failed with an "invalid credentials"-shaped error,
  // which is Supabase's generic response for BOTH "no such account" and
  // "wrong password" -- so a simple password typo on an existing account
  // silently triggered an unwanted account-creation attempt instead of a
  // clear "wrong password, try again."
  const handleSignIn = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setErrorMessage('Enter your email and password to continue.');
      return;
    }

    setActiveAction('signin');
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (error) {
        setErrorMessage(classifySignInErrorMessage(error.message));
      }
      // On success, _layout.tsx's onAuthStateChange listener is the sole
      // navigator once the session is actually established -- this screen
      // never navigates itself, here or in handleSignUp below.
    } catch (error) {
      setErrorMessage(classifySignInErrorMessage(error));
    } finally {
      setActiveAction(null);
    }
  };

  const handleSignUp = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setErrorMessage('Enter your email and password to continue.');
      return;
    }

    if (trimmedPassword.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setActiveAction('signup');
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          emailRedirectTo: getOAuthRedirectUri(),
        },
      });

      if (error) {
        setErrorMessage(classifySignUpErrorMessage(error.message));
        return;
      }

      // No session yet either way: a genuinely new signup awaiting email
      // confirmation, or (Supabase's own anti-enumeration behavior for an
      // already-registered, already-confirmed email) an ambiguous
      // non-error response. The same non-enumerating copy covers both --
      // confirming which one this was would leak account existence.
      if (!data.session) {
        setNoticeMessage("If that's a new email, check your inbox to confirm your account. Already have one? Sign in instead.");
      }
      // A session here (project-wide email confirmation disabled) is
      // handled identically to sign-in success above: this screen still
      // never navigates itself before that session actually exists.
    } catch (error) {
      setErrorMessage(classifySignUpErrorMessage(error));
    } finally {
      setActiveAction(null);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMessage('Enter your email address above, then tap "Forgot password?" again.');
      return;
    }

    setActiveAction('forgot-password');
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${API_BASE}/reset-password`,
      });
      if (error) {
        setErrorMessage(classifyForgotPasswordErrorMessage(error.message));
        return;
      }
      // Non-enumerating: Supabase itself does not error for an
      // unregistered address here, and this copy must not either.
      setNoticeMessage('If that email has an account, a password reset link is on its way.');
    } catch (error) {
      setErrorMessage(classifyForgotPasswordErrorMessage(error));
    } finally {
      setActiveAction(null);
    }
  };

  const busy = activeAction !== null;

  const openEmailStep = () => {
    setErrorMessage(null);
    setNoticeMessage(null);
    setStep('email');
  };

  const closeEmailStep = () => {
    setErrorMessage(null);
    setNoticeMessage(null);
    setShowPassword(false);
    setStep('choose');
  };

  // On Android the hardware Back from the email form returns to the sign-in options
  // instead of leaving the app.
  useEffect(() => {
    if (step !== 'email') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeEmailStep();
      return true;
    });
    return () => subscription.remove();
    // closeEmailStep only sets state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <Screen style={{ paddingHorizontal: 18, paddingTop: 10, backgroundColor: theme.bg }}>
      <AmbientField isDark={isDark} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 12 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={{ alignItems: 'center', marginBottom: 14 }}>
          <BrandGlow isDark={isDark} />
          <Animated.View
            style={{
              width: 132,
              height: 132,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: brandScale }],
            }}
          >
            <Image
              source={require('../../assets/brand/shoonaya-emblem-transparent.png')}
              style={{ width: 120, height: 120 }}
              resizeMode="contain"
              accessibilityLabel="Shoonaya"
            />
          </Animated.View>
          <Text
            style={{
              ...TYPE.chip,
              marginTop: -2,
              color: theme.brand,
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
              color: theme.text,
              textAlign: 'center',
              maxWidth: 320,
              marginTop: 6,
            }}
          >
            Find your infinite.
          </Text>
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
            tone={isDark ? 'dark' : 'light'}
            style={{
              padding: 18,
              borderColor: theme.premiumBorder,
              backgroundColor: theme.glass,
              boxShadow: isDark ? SHADOWS.lg.dark : SHADOWS.lg.light,
            }}
          >
            {step === 'choose' ? (
              <View style={{ gap: 14 }}>
                <View style={{ alignItems: 'center', gap: 5 }}>
                  <Text accessibilityRole="header" style={{ ...TYPE.cardHeading, color: theme.text, textAlign: 'center' }}>
                    How would you like to continue?
                  </Text>
                  <Text style={{ ...TYPE.caption, color: theme.dim, textAlign: 'center' }}>
                    Sign in or create your account securely.
                  </Text>
                </View>

                <View style={{ gap: 10 }}>
                  <GoogleAuthButton
                    onPress={handleGoogle}
                    disabled={busy}
                    loading={activeAction === 'google'}
                    isDark={isDark}
                  />

                  {Platform.OS === 'ios' && appleAvailable ? (
                    <AppleAuthButton
                      onPress={handleApple}
                      disabled={busy}
                      loading={activeAction === 'apple'}
                      isDark={isDark}
                    />
                  ) : null}

                  <AuthButton
                    label="Continue with email"
                    onPress={() => openEmailStep()}
                    disabled={busy}
                    tone="gold"
                    icon={<Feather name="mail" size={16} color={COLORS.cardBgLight} />}
                    isDark={isDark}
                  />
                </View>

                <AuthDivider label="or" isDark={isDark} />

                <View style={{ gap: 6, alignItems: 'center' }}>
                  <PressableSurface
                    haptic="selection"
                    disabled={busy}
                    onPress={handleAtithiMode}
                    accessibilityLabel="Explore as a guest (Atithi)"
                    style={{
                      minHeight: 52,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: theme.brand,
                      backgroundColor: 'transparent',
                      paddingHorizontal: 14,
                      alignSelf: 'stretch',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: busy ? 0.68 : 1,
                    }}
                  >
                    <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 14.5, paddingRight: 2 }}>
                      Explore as a guest (Atithi)
                    </Text>
                  </PressableSurface>
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: theme.dim, textAlign: 'center' }}>
                    Look around without an account. Your progress won't be saved.
                  </Text>
                </View>

                <View style={{ marginTop: 2, alignItems: 'center' }}>
                  <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, textAlign: 'center' }}>
                    By continuing, you agree to the
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <PressableSurface
                      haptic="selection"
                      accessibilityRole="link"
                      hitSlop={8}
                      onPress={() => { void Linking.openURL(TERMS_URL); }}
                      style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: 6 }}
                    >
                      <Text style={{ color: theme.brand, fontFamily: FONTS.sans, fontSize: 12.5, textDecorationLine: 'none' }}>
                        Terms of Service
                      </Text>
                    </PressableSurface>
                    <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12 }}>and</Text>
                    <PressableSurface
                      haptic="selection"
                      accessibilityRole="link"
                      hitSlop={8}
                      onPress={() => { void Linking.openURL(PRIVACY_URL); }}
                      style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: 6 }}
                    >
                      <Text style={{ color: theme.brand, fontFamily: FONTS.sans, fontSize: 12.5, textDecorationLine: 'none' }}>
                        Privacy Policy
                      </Text>
                    </PressableSurface>
                  </View>

                  <PressableSurface
                    haptic="selection"
                    onPress={() => setHelpOpen((open) => !open)}
                    accessibilityRole="button"
                    accessibilityLabel={helpOpen ? 'Hide help and contact options' : 'Show help and contact options'}
                    accessibilityState={{ expanded: helpOpen }}
                    style={{ minHeight: MIN_TOUCH_TARGET, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Feather name="help-circle" size={15} color={theme.brand} />
                    <Text style={{ color: theme.brand, fontFamily: FONTS.sansMedium, fontSize: 13 }}>Need help?</Text>
                  </PressableSurface>

                  {helpOpen ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  marginTop: 6,
                }}
              >
                <PressableSurface
                  haptic="selection"
                  accessibilityRole="link"
                  accessibilityLabel="Shoonaya on Instagram"
                  hitSlop={8}
                  onPress={() => { void Linking.openURL(SOCIAL_LINKS.instagram); }}
                  style={{
                    minWidth: MIN_TOUCH_TARGET,
                    minHeight: MIN_TOUCH_TARGET,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FontAwesome name="instagram" size={17} color={theme.dim} />
                </PressableSurface>
                <PressableSurface
                  haptic="selection"
                  accessibilityRole="link"
                  accessibilityLabel="Shoonaya on Facebook"
                  hitSlop={8}
                  onPress={() => { void Linking.openURL(SOCIAL_LINKS.facebook); }}
                  style={{
                    minWidth: MIN_TOUCH_TARGET,
                    minHeight: MIN_TOUCH_TARGET,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FontAwesome name="facebook-square" size={17} color={theme.dim} />
                </PressableSurface>
                <PressableSurface
                  haptic="selection"
                  accessibilityRole="link"
                  accessibilityLabel="Shoonaya on LinkedIn"
                  hitSlop={8}
                  onPress={() => { void Linking.openURL(SOCIAL_LINKS.linkedin); }}
                  style={{
                    minWidth: MIN_TOUCH_TARGET,
                    minHeight: MIN_TOUCH_TARGET,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FontAwesome name="linkedin-square" size={17} color={theme.dim} />
                </PressableSurface>
                <PressableSurface
                  haptic="selection"
                  accessibilityRole="link"
                  accessibilityLabel="Email Shoonaya Support"
                  hitSlop={8}
                  onPress={() => { void Linking.openURL(SOCIAL_LINKS.email); }}
                  style={{
                    minWidth: MIN_TOUCH_TARGET,
                    minHeight: MIN_TOUCH_TARGET,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="mail" size={16} color={theme.dim} />
                </PressableSurface>
                <PressableSurface
                  haptic="selection"
                  accessibilityRole="link"
                  accessibilityLabel="Shoonaya Website"
                  hitSlop={8}
                  onPress={() => { void Linking.openURL(SOCIAL_LINKS.website); }}
                  style={{
                    minWidth: MIN_TOUCH_TARGET,
                    minHeight: MIN_TOUCH_TARGET,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="globe" size={16} color={theme.dim} />
                </PressableSurface>
              </View>
                  ) : null}
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
            ) : (
              <View style={{ gap: 12 }}>
                <PressableSurface
                  haptic="selection"
                  disabled={busy}
                  onPress={() => closeEmailStep()}
                  accessibilityRole="button"
                  accessibilityLabel="Back to sign-in options"
                  style={{ alignSelf: 'flex-start', minHeight: MIN_TOUCH_TARGET, flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 12 }}
                >
                  <Feather name="chevron-left" size={20} color={theme.brand} />
                  <Text style={{ color: theme.brand, fontFamily: FONTS.sansMedium, fontSize: 14 }}>Back</Text>
                </PressableSurface>

                <Text accessibilityRole="header" style={{ ...TYPE.cardHeading, color: theme.text }}>
                  Continue with email
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    borderBottomWidth: 1,
                    borderBottomColor: theme.premiumBorder,
                    marginBottom: 4,
                  }}
                >
                  {(['signin', 'signup'] as const).map((mode) => {
                    const active = authMode === mode;
                    return (
                      <PressableSurface
                        key={mode}
                        haptic="selection"
                        disabled={busy}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={mode === 'signin' ? 'Sign in' : 'Create account'}
                        onPress={() => {
                          setAuthMode(mode);
                          setErrorMessage(null);
                          setNoticeMessage(null);
                        }}
                        style={{
                          flex: 1,
                          minHeight: MIN_TOUCH_TARGET,
                          paddingVertical: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderBottomWidth: active ? 2 : 0,
                          borderBottomColor: active ? theme.brand : 'transparent',
                          marginBottom: active ? -1 : 0,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: active ? FONTS.sansSemiBold : FONTS.sansMedium,
                            fontSize: 13.5,
                            color: active ? theme.brand : theme.dim,
                            letterSpacing: 0.2,
                          }}
                        >
                          {mode === 'signin' ? 'Sign in' : 'Create account'}
                        </Text>
                      </PressableSurface>
                    );
                  })}
                </View>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
                  placeholderTextColor={theme.dim}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  accessibilityLabel="Email address"
                  editable={!busy}
                  style={{
                    minHeight: 50,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: theme.premiumBorder,
                    backgroundColor: theme.card,
                    paddingHorizontal: 14,
                    color: theme.text,
                    fontFamily: FONTS.sans,
                    fontSize: 14,
                  }}
                />
                <View>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor={theme.dim}
                    secureTextEntry={!showPassword}
                    textContentType="password"
                    accessibilityLabel="Password"
                    editable={!busy}
                    style={{
                      minHeight: 50,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: theme.premiumBorder,
                      backgroundColor: theme.card,
                      paddingLeft: 14,
                      paddingRight: MIN_TOUCH_TARGET + 12,
                      color: theme.text,
                      fontFamily: FONTS.sans,
                      fontSize: 14,
                    }}
                  />
                  <PressableSurface
                    haptic="selection"
                    onPress={() => setShowPassword((visible) => !visible)}
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: 4,
                      top: 0,
                      bottom: 0,
                      width: MIN_TOUCH_TARGET + 4,
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 0,
                    }}
                  >
                    <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={theme.dim} />
                  </PressableSurface>
                </View>

                {authMode === 'signin' ? (
                  <PressableSurface
                    haptic="selection"
                    disabled={busy}
                    onPress={handleForgotPassword}
                    accessibilityLabel="Forgot password"
                    style={{ alignSelf: 'flex-end', minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
                  >
                    <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12.5, color: theme.brand }}>
                      {activeAction === 'forgot-password' ? 'Sending reset link…' : 'Forgot password?'}
                    </Text>
                  </PressableSurface>
                ) : (
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: theme.dim }}>
                    Use at least {MIN_PASSWORD_LENGTH} characters.
                  </Text>
                )}

                <AuthButton
                  label={
                    authMode === 'signin'
                      ? (activeAction === 'signin' ? 'Signing in…' : 'Sign in')
                      : (activeAction === 'signup' ? 'Creating account…' : 'Create account')
                  }
                  onPress={authMode === 'signin' ? handleSignIn : handleSignUp}
                  disabled={busy}
                  loading={activeAction === 'signin' || activeAction === 'signup'}
                  tone="gold"
                  icon={<Feather name="mail" size={16} color={COLORS.cardBgLight} />}
                  isDark={isDark}
                />

                <PressableSurface
                  haptic="selection"
                  disabled={busy}
                  onPress={() => {
                    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                    setErrorMessage(null);
                    setNoticeMessage(null);
                  }}
                  accessibilityRole="button"
                  style={{ alignSelf: 'center', minHeight: MIN_TOUCH_TARGET, paddingHorizontal: 12, justifyContent: 'center' }}
                >
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 13.5, color: theme.dim, textAlign: 'center' }}>
                    {authMode === 'signin' ? 'New to Shoonaya? ' : 'Already have an account? '}
                    <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold }}>
                      {authMode === 'signin' ? 'Create an account' : 'Sign in'}
                    </Text>
                  </Text>
                </PressableSurface>

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
            )}
          </Card>
        </Animated.View>
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
