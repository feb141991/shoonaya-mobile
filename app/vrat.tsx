import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  Platform,
  useColorScheme,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
const isExpoGo = Constants.appOwnership === 'expo';
const shouldSkipLocalNotifications = isExpoGo || (__DEV__ && Platform.OS === 'ios');
const Notifications = shouldSkipLocalNotifications ? null : (() => { try { return require('expo-notifications'); } catch { return null; } })();

import { calculatePanchang, getTithiReminder, type TithiReminder } from '@sangam/panchang-engine';

import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, TYPE, RADII } from '@/lib/constants';
import { VRAT_DATABASE, lookupVratData, type VratData } from '@/lib/vrat-data';
import { supabase } from '@/lib/supabase';
import { isGuestMode } from '@/lib/guestSession';

import { ReaderShell } from '@/components/reader/ReaderShell';
import { useReaderControls } from '@/hooks/useReaderControls';
import { buildReadableCapabilities } from '@/lib/readable-content';
import { getInitialReaderDisplayMode, resolveReadablePreferences } from '@/lib/readable-preferences';

type Tradition = 'all' | 'hindu' | 'sikh' | 'buddhist' | 'jain';

const TRADITION_FILTERS: Tradition[] = ['all', 'hindu', 'sikh', 'buddhist', 'jain'];

type ProfileGeoState = {
  lat: number;
  lon: number;
  timezone: string;
  tradition: string | null;
  appLanguage: string | null;
  meaningLanguage: string | null;
};

const DEFAULT_GEO: ProfileGeoState = {
  lat: 23.1765,
  lon: 75.7885,
  timezone: 'Asia/Kolkata',
  tradition: null,
  appLanguage: null,
  meaningLanguage: null,
};

type UpcomingVrat = {
  date: string;
  slug: string;
  vratData: VratData;
  observance: any;
};

function tithiIndexToVratId(tithiIndex: number, tradition: string | null | undefined): string | null {
  if (tithiIndex === 11 || tithiIndex === 26) return 'ekadashi';
  if (tithiIndex === 15) return 'purnima';
  if (tithiIndex === 30) return 'amavasya';
  const t = tradition ?? 'hindu';
  if ((tithiIndex === 13 || tithiIndex === 28) && (t === 'hindu' || t === 'shaiva' || t === 'vaishnava')) return 'pradosh';
  if (tithiIndex === 4 || tithiIndex === 19) return 'chaturthi';
  if (tithiIndex === 29 && (t === 'hindu' || t === 'shaiva')) return 'shivaratri';
  return null;
}

function vratMatchesTradition(vrat: VratData, tradition: Tradition) {
  if (tradition === 'all') {
    return true;
  }

  const source = `${vrat.significance} ${vrat.practice} ${vrat.mantra}`.toLowerCase();
  if (tradition === 'hindu') return true;
  if (tradition === 'sikh') return source.includes('gurbani') || source.includes('waheguru');
  if (tradition === 'buddhist') return source.includes('buddha') || source.includes('metta');
  if (tradition === 'jain') return source.includes('jain') || source.includes('tirthankara') || source.includes('paryushana');
  return false;
}

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

type FontSize = 'sm' | 'md' | 'lg' | 'xl';
const FONT_PRESETS = [
  { label: 'A-', value: 'sm' },
  { label: 'A', value: 'md' },
  { label: 'A+', value: 'lg' },
  { label: 'A++', value: 'xl' },
];

export default function VratScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [selectedTradition, setSelectedTradition] = useState<Tradition>('all');
  const [selectedVrat, setSelectedVrat] = useState<VratData | null>(null);
  const [selectedOccurrence, setSelectedOccurrence] = useState<UpcomingVrat | null>(null);
  const [geo, setGeo] = useState<ProfileGeoState>(DEFAULT_GEO);
  const [upcomingVrats, setUpcomingVrats] = useState<UpcomingVrat[]>([]);
  const [upcomingError, setUpcomingError] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  const [fontStep, setFontStep] = useState(1);
  const [lang, setLang] = useState<'en' | 'local'>('en');
  const [ttsRate, setTtsRate] = useState(1);

  const [observedToday, setObservedToday] = useState(false);
  const [observeCount, setObserveCount] = useState(0);
  const [observeLoading, setObserveLoading] = useState(false);
  const [observeStatusLoaded, setObserveStatusLoaded] = useState(false);

  const theme = useMemo(
    () => ({
      bg: isDark ? COLORS.darkBg : COLORS.creamBg,
      card: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
      border: isDark ? COLORS.borderDark : COLORS.borderLight,
      text: isDark ? COLORS.creamBg : COLORS.ink,
      dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
      brand: isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight,
      // Mirrors themeColor() in lib/constants.ts. This screen builds its own
      // theme object rather than calling themeColor(isDark); these two keys are
      // added here so the review notice can use sourced gold tints instead of
      // an ad hoc rgba at the call site.
      brandSoft: isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight,
      premiumBorder: isDark ? COLORS.premiumBorderDark : COLORS.premiumBorderLight,
    }),
    [isDark]
  );

  const loadProfileGeo = useCallback(async () => {
    if (await isGuestMode()) {
      setIsGuest(true);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('latitude, longitude, timezone, tradition, app_language, meaning_language')
      .eq('id', user.id)
      .single();

    setGeo({
      lat: profile?.latitude ?? DEFAULT_GEO.lat,
      lon: profile?.longitude ?? DEFAULT_GEO.lon,
      timezone: profile?.timezone ?? DEFAULT_GEO.timezone,
      tradition: profile?.tradition ?? null,
      appLanguage: profile?.app_language ?? null,
      meaningLanguage: profile?.meaning_language ?? null,
    });
  }, [router]);

  useEffect(() => {
    setLoading(true);
    loadProfileGeo().finally(() => setLoading(false));
  }, [loadProfileGeo]);

  useEffect(() => {
    let cancelled = false;

    apiFetch(
      `/api/calendar/upcoming?days=60&tradition=${selectedTradition}&tz=${encodeURIComponent(geo.timezone)}`
    )
      .then(async (response) => {
        if (!response.ok) throw new Error('upcoming fetch failed');
        const payload = (await response.json()) as {
          observances?: Array<{ date: string; slug: string; kind: string }>;
        };
        const resolved = (payload.observances ?? [])
          .filter((observance) => observance.kind === 'vrat')
          .map((observance) => {
            const vratData = lookupVratData(observance.slug);
            return vratData ? { date: observance.date, slug: observance.slug, vratData, observance } : null;
          })
          .filter((entry): entry is UpcomingVrat => entry !== null);
        if (!cancelled) {
          setUpcomingVrats(resolved);
          setUpcomingError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setUpcomingError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTradition, geo.timezone]);

  const panchangToday = useMemo(
    () => calculatePanchang(new Date(), geo.lat, geo.lon, geo.timezone),
    [geo.lat, geo.lon, geo.timezone]
  );

  const todayReminder: TithiReminder | null = useMemo(
    () => getTithiReminder(panchangToday.tithiIndex, geo.tradition),
    [panchangToday.tithiIndex, geo.tradition]
  );

  const todayVrat: VratData | null = useMemo(() => {
    const vratId = tithiIndexToVratId(panchangToday.tithiIndex, geo.tradition);
    return vratId ? (VRAT_DATABASE[vratId] ?? null) : null;
  }, [panchangToday.tithiIndex, geo.tradition]);

  const vrats = useMemo(
    () => Object.values(VRAT_DATABASE).filter((vrat) => vratMatchesTradition(vrat, selectedTradition)),
    [selectedTradition]
  );

  useEffect(() => {
    if (!selectedVrat) {
      setObservedToday(false);
      setObserveCount(0);
      setObserveStatusLoaded(false);
      return;
    }

    let cancelled = false;
    setObserveStatusLoaded(false);

    apiFetch(`/api/vrat/observe?vrat_id=${encodeURIComponent(selectedVrat.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setObservedToday(Boolean(data.observed_today));
        setObserveCount(data.total_count ?? 0);
      })
      .catch(() => {
      })
      .finally(() => {
        if (!cancelled) setObserveStatusLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedVrat]);

  const handleObserve = async () => {
    if (!selectedVrat || observedToday || observeLoading) {
      return;
    }

    if (isGuest) {
      Alert.alert('Sign in required', 'Sign in to track your Vrat observances.');
      return;
    }

    setObserveLoading(true);
    try {
      const res = await apiFetch('/api/vrat/observe', {
        method: 'POST',
        body: JSON.stringify({ vrat_id: selectedVrat.id, vrat_name: selectedVrat.name }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setObservedToday(true);
        setObserveCount((count) => count + (data.already_observed ? 0 : 1));
        if (!data.already_observed && data.karma_earned > 0) {
          Alert.alert(`🙏 Vrat observed! +${data.karma_earned} karma`);
        } else {
          Alert.alert('Vrat observed');
        }
      } else {
        Alert.alert('Could not record observation');
      }
    } catch {
      Alert.alert('Could not record observation');
    } finally {
      setObserveLoading(false);
    }
  };

  const setReminder = async (vrat: VratData) => {
    if (!Notifications) {
      Alert.alert('Reminders are not available in this local simulator build. Use a full device build.');
      return;
    }
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Notifications are required for reminders');
      return;
    }

    const now = new Date();
    const triggerDate = new Date(now);
    triggerDate.setHours(6, 0, 0, 0);
    if (triggerDate <= now) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${vrat.emoji} ${vrat.name} reminder`,
        body: vrat.tagline,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    Alert.alert('Reminder scheduled');
  };

  const selectedName = lang === 'local' && selectedVrat?.nameLocal ? selectedVrat.nameLocal : selectedVrat?.name ?? '';
  const selectedTagline = lang === 'local' && selectedVrat?.taglineLocal ? selectedVrat.taglineLocal : selectedVrat?.tagline ?? '';
  const selectedSignificance = lang === 'local' && selectedVrat?.significanceLocal
    ? selectedVrat.significanceLocal
    : selectedVrat?.significance ?? '';
  const selectedPractice = lang === 'local' && selectedVrat?.practiceLocal
    ? selectedVrat.practiceLocal
    : selectedVrat?.practice ?? '';
  const selectedMantra = lang === 'local' && selectedVrat?.mantraLocal
    ? selectedVrat.mantraLocal
    : selectedVrat?.mantra ?? '';
  const hasLocalVrat = Boolean(
    selectedVrat?.nameLocal
    && selectedVrat?.taglineLocal
    && selectedVrat?.significanceLocal
    && selectedVrat?.practiceLocal
    && selectedVrat?.mantraLocal,
  );
  const textToCopy = selectedVrat
    ? `${selectedName}\n\n${selectedSignificance}\n\n${selectedPractice}\n\nMantra:\n${selectedMantra}`
    : '';
  const textToShare = selectedVrat ? `Read about ${selectedName} on the Shoonaya App.` : '';

  const capabilities = useMemo(() => buildReadableCapabilities({
    original: selectedVrat?.mantra ?? '',
    meaning: selectedVrat?.mantraLocal,
    script: 'latin',
    pipelineTags: {
      content_type: 'mantra',
      audio_mode: 'recitation',
      tradition: 'hindu',
      script: 'latin',
      delivery_intent: 'recitation',
    },
  }, {
    canToggleLocalLanguage: hasLocalVrat,
    canShowMeaning: false,
    canShowExplain: false,
  }), [hasLocalVrat, selectedVrat]);

  const { state, handlers } = useReaderControls(capabilities);
  const { resetDisplayState, stopTTS } = handlers;

  useEffect(() => {
    if (!selectedVrat) return;
    const preferences = resolveReadablePreferences({
      appLanguage: geo.appLanguage,
      meaningLanguage: geo.meaningLanguage,
    });
    setLang(getInitialReaderDisplayMode(preferences, hasLocalVrat));
    void stopTTS();
    resetDisplayState();
  }, [
    geo.appLanguage,
    geo.meaningLanguage,
    hasLocalVrat,
    resetDisplayState,
    selectedVrat,
    stopTTS,
  ]);

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.brand} />
        </View>
      </Screen>
    );
  }

  // Reader details full-page view
  if (selectedVrat) {
    const fsScale = fontStep === 0 ? 0.85 : fontStep === 1 ? 1 : fontStep === 2 ? 1.15 : 1.3;

    return (
      <ReaderShell
        title={selectedName}
        subtitle={selectedTagline}
        fallbackBackUrl="/vrat"
        onBack={() => setSelectedVrat(null)}
        themeColor={theme.brand}
        fontPresets={FONT_PRESETS}
        fontStep={fontStep}
        setFontStep={setFontStep}
        languages={hasLocalVrat ? [
          { code: 'en' as const, label: 'EN' },
          { code: 'local' as const, label: selectedVrat.mantraLocal && /[\u0A00-\u0A7F]/.test(selectedVrat.mantraLocal) ? 'ਪੰ' : 'हिं' },
        ] : undefined}
        currentLanguage={lang}
        setLanguage={setLang}
        onTTS={() => handlers.toggleTTS(selectedMantra, {
          quality: 'pandit',
          language: lang === 'local' ? 'hi-IN' : 'en-IN',
          rate: ttsRate,
          pipelineTags: {
            content_type: 'mantra',
            audio_mode: 'recitation',
            delivery_intent: 'recitation',
          },
        })}
        ttsRate={ttsRate}
        onTTSRateChange={setTtsRate}
        isSpeaking={state.isSpeaking}
        isTTSGenerating={state.isGeneratingTTS}
        onCopy={() => handlers.copyText(textToCopy, 'Vrat Details')}
        isCopied={state.isCopied}
        onShare={() => handlers.share(textToShare)}
      >
        <View style={{ gap: 20, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 40 }}>{selectedVrat.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TYPE.hero, fontSize: 32, color: theme.text }}>
                {selectedName}
              </Text>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 15, marginTop: 4 }}>
                {selectedTagline}
              </Text>
            </View>
          </View>

          {selectedOccurrence?.observance && (
            (() => {
              const obs = selectedOccurrence.observance;
              if (obs.status === 'unresolved') {
                return (
                  <View style={{
                    borderRadius: RADII.xl,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: theme.premiumBorder,
                    backgroundColor: theme.brandSoft,
                    gap: 8,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="help-circle" size={16} color={theme.brand} />
                      <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Under Advisory Council Review
                      </Text>
                    </View>
                    <Text style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 20 }}>
                      This observance is currently under review by scholars. The engine detected potential candidate dates but has not finalized the selection. No final date is set.
                    </Text>
                    {obs.reasons?.[0]?.text ? (
                      <Text style={{ color: theme.dim, fontFamily: FONTS.sansMedium, fontSize: 12 }}>
                        Reason: {obs.reasons[0].text}
                      </Text>
                    ) : null}
                  </View>
                );
              }
              if (obs.alternatives && obs.alternatives.length > 0) {
                return (
                  <View style={{
                    borderRadius: RADII.xl,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(197, 160, 89, 0.4)',
                    backgroundColor: 'rgba(197, 160, 89, 0.1)',
                    gap: 8,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="info" size={16} color={theme.brand} />
                      <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Multiple Dates (Tradition Variant)
                      </Text>
                    </View>
                    <Text style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 20 }}>
                      Your tradition observes this on <Text style={{ fontFamily: FONTS.sansSemiBold }}>{selectedOccurrence.date}</Text>. Other traditions observe it on {obs.alternatives.map((alt: any) => alt.civilDate || 'Under Review').join(', ')}. Both dates are correct based on their respective rule systems.
                    </Text>
                  </View>
                );
              }
              return null;
            })()
          )}

          <View style={{ gap: 14 }}>
            <Text style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 16 * fsScale, lineHeight: 26 * fsScale }}>
              {selectedSignificance}
            </Text>

            <View style={{ marginTop: 8 }}>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 * fsScale, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.7, marginBottom: 6 }}>
                How to observe
              </Text>
              <Text style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 16 * fsScale, lineHeight: 26 * fsScale }}>
                {selectedPractice}
              </Text>
            </View>

            <View style={{ marginTop: 8 }}>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 * fsScale, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.7, marginBottom: 6 }}>
                Mantra
              </Text>
              <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 19 * fsScale, lineHeight: 28 * fsScale }}>
                {selectedMantra}
              </Text>
            </View>

            {selectedVrat.breakFastTime ? (
              <View style={{ marginTop: 8 }}>
                <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 * fsScale, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.7, marginBottom: 6 }}>
                  Duration
                </Text>
                <Text style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 16 * fsScale }}>{selectedVrat.breakFastTime}</Text>
              </View>
            ) : null}
          </View>

          <View style={{ gap: 12, marginTop: 16 }}>
            <PressableSurface
              onPress={() => {
                void setReminder(selectedVrat);
              }}
              style={{
                borderRadius: 999,
                backgroundColor: theme.brand,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Set reminder</Text>
            </PressableSurface>

            {observedToday ? (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 999,
                  borderWidth: 1.5,
                  borderColor: COLORS.successBorder,
                  backgroundColor: COLORS.successBg,
                  paddingVertical: 14,
                }}
              >
                <Feather name="check-circle" size={18} color={COLORS.success} />
                <Text style={{ color: COLORS.success, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
                  Observed today ✓{observeCount > 1 ? `  (${observeCount}× total)` : ''}
                </Text>
              </View>
            ) : (
              <PressableSurface
                onPress={() => {
                  void handleObserve();
                }}
                disabled={observeLoading || !observeStatusLoaded}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity: observeLoading || !observeStatusLoaded ? 0.6 : 1,
                }}
              >
                <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
                  🙏 Mark as Observed{observeCount > 0 ? `  (${observeCount}× before)` : ''}
                </Text>
              </PressableSurface>
            )}
            <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13, textAlign: 'center' }}>
              {observedToday ? 'Your practice is recorded' : 'Earn 25 karma for completing this vrat'}
            </Text>
          </View>
        </View>
      </ReaderShell>
    );
  }

  // Base list view
  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }} showsVerticalScrollIndicator={false}>
        <BackButton />

        <Text style={{ color: theme.text, ...TYPE.screenTitle }}>Vrat</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {TRADITION_FILTERS.map((tradition) => {
            const active = selectedTradition === tradition;
            return (
              <PressableSurface
                key={tradition}
                onPress={() => setSelectedTradition(tradition)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Filter by ${tradition}`}
                haptic="selection"
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? theme.brand : theme.border,
                  backgroundColor: active ? theme.brand : theme.card,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: active ? COLORS.ink : theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                  {tradition.toUpperCase()}
                </Text>
              </PressableSurface>
            );
          })}
        </ScrollView>

        <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 10 }}>
          <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Today</Text>
          {todayReminder && todayVrat ? (
            <PressableSurface onPress={() => setSelectedVrat(todayVrat)} haptic="selection" style={{ gap: 4 }}>
              <Text style={{ color: theme.brand, fontFamily: FONTS.serifBold, fontSize: 20 }}>
                {todayReminder.title}
              </Text>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 20 }}>
                {todayReminder.body}
              </Text>
            </PressableSurface>
          ) : (
            <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14 }}>
              No special observance today — browse below or check what's coming up.
            </Text>
          )}
        </Card>

        <View style={{
          borderRadius: RADII.xl,
          padding: 16,
          borderWidth: 1,
          borderColor: 'rgba(197, 160, 89, 0.3)',
          backgroundColor: 'rgba(197, 160, 89, 0.1)',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
        }}>
          <Feather name="globe" size={18} color={theme.brand} style={{ flexShrink: 0 }} />
          <Text style={{ flex: 1, color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, lineHeight: 17 }}>
            Observance dates and timings depend on your tradition and location. Set your profile location for local calculations.
          </Text>
        </View>

        {upcomingVrats.length > 0 && (
          <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 10 }}>
            <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Upcoming</Text>
            {upcomingVrats.slice(0, 5).map((upcoming) => (
              <PressableSurface
                key={`${upcoming.slug}-${upcoming.date}`}
                onPress={() => {
                  setSelectedVrat(upcoming.vratData);
                  setSelectedOccurrence(upcoming);
                }}
                haptic="selection"
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
              >
                <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 14 }}>
                  {upcoming.vratData.emoji} {upcoming.vratData.name}
                </Text>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13 }}>{upcoming.date}</Text>
              </PressableSurface>
            ))}
          </Card>
        )}

        {upcomingError && (
          <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, textAlign: 'center' }}>
            Unable to load upcoming dates right now — showing the full observance list below.
          </Text>
        )}

        {vrats.map((vrat) => (
          <PressableSurface
            key={vrat.id}
            onPress={() => {
              setSelectedVrat(vrat);
              setSelectedOccurrence(null);
            }}
            haptic="selection"
          >
            <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 8 }}>
              <Text style={{ ...TYPE.metric, color: theme.text }}>
                {vrat.emoji} {vrat.name}
              </Text>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14 }}>{vrat.tagline}</Text>
            </Card>
          </PressableSurface>
        ))}
      </ScrollView>
    </Screen>
  );
}
