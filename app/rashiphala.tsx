import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Share,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';

import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { SacredLoader } from '@/components/ui/SacredLoader';
import { useFallbackBackHandler } from '@/components/ui/BackButton';
import { apiFetch } from '@/lib/api';
import { describeFailure, requestErrorFromResponse } from '@/lib/user-facing-error';
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, SHADOWS, SPACING, TYPE, themeColor } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { RASHI_LIST, RASHI_MAP } from '@/lib/jyotish';
import { useAppIdentity } from '@/lib/appIdentity';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { formatRashiphalaSpiritualDate } from '@/lib/rashiphalaDate';

type RashiHoroscope = {
  rashi: string;
  rashiSanskrit: string;
  symbol: string;
  lord: string;
  shloka: string;
  shlokaTranslation: string;
  panditAiOracle: string;
  gocharSummary: string;
  moonTransit: string;
  transitHighlights: Array<{ title: string; detail: string; tone: 'support' | 'discipline' | 'neutral'; structure?: string[] }>;
  lifeReflections?: Array<{ title: string; detail: string }>;
  practiceFocus?: string;
  practiceSteps?: Array<{ label: string; action: string }>;
  accuracyNote: string;
  spiritualDate?: string;
  dashaContext?: { planet: string; endDate: string; note: string } | null;
  dashaContextStatus?: 'not_requested' | 'available' | 'unavailable';
};

type LifeGuidanceItem = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  text: string;
};

const LIFE_REFLECTION_ICONS = ['briefcase', 'sun', 'heart'] as const satisfies readonly (keyof typeof Feather.glyphMap)[];

function normalizeRashiKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const match = RASHI_LIST.find((rashi) =>
    rashi.key === normalized ||
    rashi.en.toLowerCase() === normalized ||
    rashi.sa.toLowerCase() === normalized
  );
  return match?.key ?? null;
}

// Complete Hindi UI labels dictionary for authentic Hindi Rashiphal experience
const RASHIPHALA_I18N = {
  en: {
    screenTitle: 'Your Rashiphala',
    shareLabel: 'Share Rashiphala',
    selectorTitle: (hasSelected: boolean) => (hasSelected ? 'Chandra Rashi' : 'Choose your Chandra Rashi'),
    loaderTitle: 'Reading Planetary Transits',
    loaderSubtitle: 'Aligning with your celestial signs and cosmic movements...',
    promptTitle: 'Select your Chandra Rashi',
    promptBody: 'Rashiphala is organized by Moon sign. Choose the sign you follow to see today’s general transit reflection.',
    errorTitle: 'Rashiphala could not load',
    retryBtn: 'Try again',
    rulingGraha: 'Ruling Graha',
    transitSummary: 'Transit Summary',
    transitReflections: 'Selected Transit Reflections',
    currentChapter: 'Your Current Chapter',
    practiceInTradition: 'Practice in Your Tradition',
    dhyanaSupport: 'Dhyana Support',
    sharedFrom: 'Shared from Shoonaya',
    today: 'Today',
  },
  hi: {
    screenTitle: 'दैनिक राशिफल',
    shareLabel: 'राशिफल साझा करें',
    selectorTitle: (hasSelected: boolean) => (hasSelected ? 'चन्द्र राशि' : 'अपनी चन्द्र राशि चुनें'),
    loaderTitle: 'ग्रह गोचर अध्ययन',
    loaderSubtitle: 'आपके राशि चक्र एवं दिव्य ग्रह गतियों का संरेखन...',
    promptTitle: 'अपनी चन्द्र राशि चुनें',
    promptBody: 'राशिफल चन्द्र राशि पर आधारित है। आज का सामान्य गोचर फल देखने हेतु अपनी राशि चुनें।',
    errorTitle: 'राशिफल लोड नहीं हो सका',
    retryBtn: 'पुनः प्रयास करें',
    rulingGraha: 'राशि स्वामी',
    transitSummary: 'गोचर सारांश',
    transitReflections: 'प्रमुख ग्रह गोचर प्रभाव',
    currentChapter: 'वर्तमान दशा अध्याय',
    practiceInTradition: 'परम्परानुसार साधना',
    dhyanaSupport: 'ध्यान एवं श्लोक',
    sharedFrom: 'शून्या से साझा किया गया',
    today: 'आज',
  },
};

export default function RashiphalaScreen() {
  const handleBack = useFallbackBackHandler('/(tabs)', true);
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const theme = useMemo(() => themeColor(isDark), [isDark]);
  const appIdentity = useAppIdentity();
  const { language: appLanguage } = useLanguage();

  // Screen-level language defaults to user's profile/app language ('hi' if Hindi, else 'en')
  const defaultLang = appLanguage === 'hi' ? 'hi' : 'en';
  const [activeLang, setActiveLang] = useState<'en' | 'hi'>(defaultLang);

  // Sync default if user's appLanguage switches in settings/profile
  useEffect(() => {
    setActiveLang(appLanguage === 'hi' ? 'hi' : 'en');
  }, [appLanguage]);

  const t = RASHIPHALA_I18N[activeLang];

  const identityKey = appIdentity.kind === 'authenticated' ? `user:${appIdentity.userId}` : appIdentity.kind;
  const authenticatedUserId = appIdentity.kind === 'authenticated' ? appIdentity.userId : null;

  const [selection, setSelection] = useState<{ identityKey: string; rashi: string | null }>({ identityKey: 'loading', rashi: null });
  const selectedRashi = selection.identityKey === identityKey ? selection.rashi : null;
  const selectRashi = useCallback((rashi: string) => {
    setErrorMessage(null);
    setSelection({ identityKey, rashi });
  }, [identityKey]);

  const [timezone, setTimezone] = useState<string>(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  });
  const [contextIdentityKey, setContextIdentityKey] = useState<string | null>(null);
  const [profileContextMessage, setProfileContextMessage] = useState<string | null>(null);
  const [loadedReading, setLoadedReading] = useState<{
    identityKey: string;
    rashi: string;
    value: RashiHoroscope;
  } | null>(null);
  const data = loadedReading?.identityKey === identityKey && loadedReading.rashi === selectedRashi
    ? loadedReading.value
    : null;
  const contextReady = contextIdentityKey === identityKey;
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const dateLabel = useMemo(() => {
    return data?.spiritualDate ? formatRashiphalaSpiritualDate(data.spiritualDate, activeLang) : t.today;
  }, [data?.spiritualDate, activeLang, t.today]);

  const shareReading = useCallback(async () => {
    if (!data) return;
    const rashiDisplay = activeLang === 'hi'
      ? `${RASHI_MAP[data.rashi.toLowerCase()]?.sa ?? data.rashiSanskrit} (${data.rashiSanskrit})`
      : `${data.rashiSanskrit} (${data.rashi})`;

    const text =
      `${t.screenTitle}: ${rashiDisplay} — ${dateLabel}\n\n` +
      `Transit reflection: ${data.panditAiOracle}\n\n` +
      `${data.accuracyNote}\n\n` +
      t.sharedFrom;
    await Share.share({ title: t.screenTitle, message: text });
  }, [data, dateLabel, activeLang, t]);

  // Load initial context (rashi, timezone, profile language preference)
  useEffect(() => {
    let active = true;
    if (appIdentity.kind === 'loading') {
      return;
    }

    setContextIdentityKey(null);
    setSelection({ identityKey, rashi: null });
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata');
    setProfileContextMessage(null);
    setErrorMessage(null);
    setLoadedReading(null);
    setLoading(true);

    async function loadContext() {
      let profileRashi: string | null = null;
      let profileTimezone: string | null = null;
      let contextMessage: string | null = null;
      try {
        if (authenticatedUserId) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('rashi, timezone, app_language, meaning_language')
            .eq('id', authenticatedUserId)
            .single();

          if (error) {
            contextMessage = activeLang === 'hi'
              ? 'आपकी सहेजी गई राशि लोड नहीं हो सकी। नीचे एक राशि चुनें।'
              : 'Your saved Rashi could not be loaded. Choose one below to continue.';
          } else {
            profileRashi = normalizeRashiKey(profile?.rashi);
            profileTimezone = profile?.timezone ?? null;
            if (!profileRashi) {
              contextMessage = activeLang === 'hi'
                ? 'आपकी प्रोफ़ाइल में चन्द्र राशि नहीं मिली। दैनिक गोचर फल देखने हेतु नीचे चुनें।'
                : 'No Chandra Rashi is saved to your profile. Choose one below to view the daily reflection.';
            }

            // Respect user's profile language preference
            const preferredLang = (profile?.app_language || profile?.meaning_language || appLanguage) === 'hi' ? 'hi' : 'en';
            if (active) {
              setActiveLang(preferredLang);
            }
          }
        }
      } catch {
        contextMessage = activeLang === 'hi'
          ? 'आपकी सहेजी गई राशि लोड नहीं हो सकी। नीचे एक राशि चुनें।'
          : 'Your saved Rashi could not be loaded. Choose one below to continue.';
      } finally {
        if (active) {
          if (profileTimezone) setTimezone(profileTimezone);
          setSelection({ identityKey, rashi: profileRashi });
          setProfileContextMessage(contextMessage);
          setContextIdentityKey(identityKey);
          setLoading(false);
        }
      }
    }
    void loadContext();
    return () => { active = false; };
  }, [appIdentity.kind, authenticatedUserId, identityKey, appLanguage]);

  // A reading belongs to both the active account and selected sign. Masking
  // it during render prevents Dasha context from one account reaching another
  // even before the identity-change effect has run.
  useEffect(() => {
    if (!contextReady) return;
    if (!selectedRashi) {
      setLoading(false);
      return;
    }

    const requestedRashi = selectedRashi;
    let active = true;
    setLoading(true);
    setErrorMessage(null);

    async function loadHoroscope() {
      try {
        const res = await apiFetch(`/api/jyotish/rashiphal?rashi=${requestedRashi}&tz=${encodeURIComponent(timezone)}&contract=2`);
        if (!res.ok) throw await requestErrorFromResponse(res);
        const payload = await res.json().catch(() => null);
        if (active) {
          setLoadedReading({ identityKey, rashi: requestedRashi, value: payload as RashiHoroscope });
        }
      } catch (e) {
        if (active) {
          setLoadedReading(null);
          setErrorMessage(describeFailure(e, 'Unable to load Rashiphala. Please try again.'));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadHoroscope();
    return () => { active = false; };
  }, [contextReady, identityKey, selectedRashi, timezone, reloadToken]);

  const toggleLanguage = () => {
    setActiveLang((curr) => (curr === 'hi' ? 'en' : 'hi'));
  };

  return (
    <Screen
      header={{
        title: t.screenTitle,
        onBack: handleBack,
        rightElement: (
          <View style={styles.headerActions}>
            {/* Language Toggle Button (44px touch target) */}
            <PressableSurface
              onPress={toggleLanguage}
              haptic="selection"
              accessibilityLabel={`Language toggle: currently ${activeLang === 'hi' ? 'Hindi' : 'English'}`}
              style={[
                styles.langBtn,
                {
                  borderColor: theme.premiumBorder,
                  backgroundColor: activeLang === 'hi' ? (isDark ? 'rgba(217, 119, 6, 0.2)' : 'rgba(254, 226, 226, 0.95)') : theme.card,
                },
              ]}
            >
              <Text
                style={[
                  styles.langBtnText,
                  {
                    color: activeLang === 'hi' ? (isDark ? '#F59E0B' : '#991B1B') : theme.dim,
                    fontWeight: activeLang === 'hi' ? '700' : '600',
                  },
                ]}
              >
                {activeLang === 'hi' ? 'हिन्दी' : 'EN'}
              </Text>
            </PressableSurface>

            {/* Share button */}
            {data ? (
              <PressableSurface
                onPress={shareReading}
                haptic="selection"
                accessibilityLabel={t.shareLabel}
                style={[
                  styles.iconBtn,
                  {
                    borderColor: theme.premiumBorder,
                    backgroundColor: theme.card,
                  },
                ]}
              >
                <Feather name="share-2" size={16} color={theme.brandStrong} />
              </PressableSurface>
            ) : null}
          </View>
        ),
      }}
      style={{ backgroundColor: theme.bg, paddingHorizontal: 0 }}
    >
      <View style={{ paddingTop: 14 }}>
        {/* Horizontal Rashi Selector */}
        <Text style={{ paddingHorizontal: 16, paddingBottom: 10, color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
          {t.selectorTitle(Boolean(selectedRashi))}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingBottom: 14 }}>
          {RASHI_LIST.map((rashi) => {
            const isSelected = selectedRashi === rashi.key;
            const primaryName = activeLang === 'hi' ? (RASHI_MAP[rashi.key]?.sa ?? rashi.sa) : rashi.sa;
            const secondaryName = activeLang === 'hi' ? rashi.en : rashi.en;

            return (
              <PressableSurface
                key={rashi.key}
                onPress={() => selectRashi(rashi.key)}
                disabled={!contextReady}
                haptic="selection"
                accessibilityLabel={`${rashi.sa} (${rashi.en})`}
                style={{
                  width: 84,
                  minHeight: 90,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  backgroundColor: isSelected
                    ? theme.brandSoft
                    : isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight,
                  borderColor: isSelected ? theme.brand : theme.premiumBorder,
                  boxShadow: isSelected ? (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light) : undefined,
                }}
              >
                <Text style={{ fontSize: 24, lineHeight: 28, textAlign: 'center' }}>{rashi.symbol}</Text>
                <Text numberOfLines={1} style={{ marginTop: 4, color: theme.brandStrong, fontFamily: FONTS.sansSemiBold, fontSize: 12, lineHeight: 16, textAlign: 'center' }}>
                  {primaryName}
                </Text>
                <Text numberOfLines={1} style={{ marginTop: 2, color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 9, lineHeight: 12, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>
                  {secondaryName}
                </Text>
              </PressableSurface>
            );
          })}
        </ScrollView>
      </View>

      {!contextReady ? (
        <SacredLoader
          icon="rashiphala"
          title={t.loaderTitle}
          subtitle={t.loaderSubtitle}
        />
      ) : !selectedRashi ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Card tone="auto" style={{ alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 30 }}>🌙</Text>
            <Text style={{ ...TYPE.metric, color: theme.text, textAlign: 'center' }}>{t.promptTitle}</Text>
            <Text style={{ ...TYPE.body, color: theme.dim, textAlign: 'center' }}>
              {t.promptBody}
            </Text>
            {profileContextMessage ? (
              <Text style={{ ...TYPE.body, color: theme.dim, textAlign: 'center' }}>{profileContextMessage}</Text>
            ) : null}
          </Card>
        </View>
      ) : loading ? (
        <SacredLoader
          icon="rashiphala"
          title={t.loaderTitle}
          subtitle={t.loaderSubtitle}
        />
      ) : !data ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 80 }}>
          <Card tone="auto" style={{ alignItems: 'center', gap: 14 }}>
            <Text style={{ fontSize: 30 }}>✨</Text>
            <Text style={{ ...TYPE.metric, color: theme.text, textAlign: 'center' }}>
              {t.errorTitle}
            </Text>
            <Text style={{ ...TYPE.body, color: theme.dim, textAlign: 'center' }}>
              {errorMessage ?? (activeLang === 'hi' ? 'कृपया कुछ समय बाद पुनः प्रयास करें।' : 'Please try again in a moment.')}
            </Text>
            <PressableSurface
              onPress={() => {
                setReloadToken((current) => current + 1);
              }}
              style={{
                minHeight: 44,
                paddingHorizontal: 22,
                borderRadius: 22,
                backgroundColor: theme.brand,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: COLORS.onMediaWhite, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>{t.retryBtn}</Text>
            </PressableSurface>
          </Card>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48, gap: 14 }}>
          {/* Main Card */}
          <LinearGradient
            colors={isDark
              ? [COLORS.homeHeroDark, COLORS.cardBgDark, COLORS.surfaceSoftDark]
              : [COLORS.homeRaisedLight, COLORS.brandSoftLight, COLORS.cardBgLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 24,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              padding: 18,
              gap: 14,
              boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 21,
                  backgroundColor: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 32 }}>{data.symbol}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: theme.text, ...TYPE.cardHeading, fontSize: 21, lineHeight: 25 }}>
                  {activeLang === 'hi' ? `${data.rashiSanskrit} (${RASHI_MAP[data.rashi.toLowerCase()]?.sa ?? data.rashiSanskrit})` : `${data.rashiSanskrit} (${data.rashi})`}
                </Text>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sansMedium, fontSize: 13 }}>
                  {t.rulingGraha}: <Text style={{ fontFamily: FONTS.sansSemiBold, color: theme.text }}>{data.lord}</Text>
                </Text>
              </View>
            </View>
            <View style={{ backgroundColor: theme.brandSoft, padding: 14, borderRadius: 14, borderColor: theme.premiumBorder, borderWidth: 1, gap: 6 }}>
              <Text style={{ color: theme.brand, ...TYPE.chip, textTransform: 'uppercase', letterSpacing: 1 }}>{t.transitSummary} · {dateLabel}</Text>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 14, lineHeight: 22 }}>{data.panditAiOracle}</Text>
              <View style={{ height: 1, backgroundColor: theme.premiumBorder, marginVertical: 6 }} />
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 11, lineHeight: 16 }}>{data.accuracyNote}</Text>
            </View>
          </LinearGradient>

          {/* Transit Highlights */}
          <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.premiumBorder, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="activity" size={18} color={theme.brand} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{t.transitReflections}</Text>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, lineHeight: 18 }}>{data.gocharSummary}</Text>
                <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 13, lineHeight: 18 }}>{data.moonTransit}</Text>
              </View>
            </View>
            <View style={{ gap: 10 }}>
              {data.transitHighlights.map((item, idx) => (
                <View key={`${item.title}-${idx}`} style={{ backgroundColor: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight, borderColor: theme.premiumBorder, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>{item.title}</Text>
                    {item.structure?.map((tag) => (
                      <Text key={tag} style={{ ...TYPE.chip, color: theme.dim, textTransform: 'uppercase' }}>{tag}</Text>
                    ))}
                  </View>
                  <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, lineHeight: 18 }}>{item.detail}</Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Your Dasha Chapter -- only present when signed in, viewing your
              own saved sign, and an active Dasha was found. dashaContextStatus
              is intentionally not surfaced here (see backend plan) -- a
              guest or a signed-in user without a matching profile simply
              doesn't see this card, no messaging needed. */}
          {data.dashaContext ? (
            <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.premiumBorder, flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
              <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="clock" size={18} color={theme.brand} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{t.currentChapter}</Text>
                <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 14, lineHeight: 22 }}>{data.dashaContext.note}</Text>
              </View>
            </Card>
          ) : null}

          {/* Daily life reflections are general prompts, not chart-derived outcomes. */}
          {data.lifeReflections?.length ? (
            <View style={{ gap: 12 }}>
              {data.lifeReflections.map((reflection, index) => {
                const item: LifeGuidanceItem = {
                  icon: LIFE_REFLECTION_ICONS[index] ?? 'info',
                  title: reflection.title,
                  text: reflection.detail,
                };
                return (
                  <Card key={index} tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.premiumBorder, flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                    <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name={item.icon} size={17} color={theme.brand} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{item.title}</Text>
                      <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 14, lineHeight: 22 }}>{item.text}</Text>
                    </View>
                  </Card>
                );
              })}
            </View>
          ) : null}

          {/* Practice content is absent on older backends until contract v2 deploys. */}
          {data.practiceFocus && data.practiceSteps?.length ? (
            <LinearGradient
              colors={isDark
                ? [COLORS.homeHeroDark, COLORS.cardBgDark, COLORS.surfaceSoftDark]
                : [COLORS.homeRaisedLight, COLORS.brandSoftLight, COLORS.cardBgLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 24,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                padding: 18,
                gap: 16,
                boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 34, height: 34, borderRadius: 13, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="compass" size={16} color={theme.brand} />
                </View>
                <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{t.practiceInTradition}</Text>
              </View>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 15, lineHeight: 22 }}>{data.practiceFocus}</Text>
              <View style={{ gap: 10 }}>
                {data.practiceSteps.map((step) => (
                  <View key={step.label} style={{ backgroundColor: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight, borderColor: theme.premiumBorder, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 }}>
                    <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{step.label}</Text>
                    <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 13, lineHeight: 18 }}>{step.action}</Text>
                  </View>
                ))}
              </View>

              {/* Dhyana Support */}
              <View style={{ backgroundColor: theme.glass, borderColor: theme.premiumBorder, borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 }}>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{t.dhyanaSupport}</Text>
                <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 15, lineHeight: 24, fontStyle: 'italic' }}>{data.shloka}</Text>
                <Text style={{ color: theme.brand, fontFamily: FONTS.sansMedium, fontSize: 11, lineHeight: 18 }}>{data.shlokaTranslation}</Text>
              </View>
            </LinearGradient>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  langBtn: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: 44,
    paddingHorizontal: 10,
    borderRadius: RADII.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langBtnText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
  },
  iconBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
