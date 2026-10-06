import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, TYPE, RADII, themeColor } from '@/lib/constants';
import { lookupVratData, getVratData, type VratData } from '@/lib/vrat-data';
import {
  buildVratObservationPayload,
  isEligibleToObserveToday,
  matchesRequestedOccurrence,
} from '@/lib/vrat-observation';
import type { ClientObservanceResult } from '@/lib/calendar-contract';
import { supabase } from '@/lib/supabase';
import { isGuestMode } from '@/lib/guestSession';
import { ReaderShell } from '@/components/reader/ReaderShell';
import { ShoonayaShareCard } from '@/components/share/ShoonayaShareCard';
import { shareCapturedShoonayaCard } from '@/lib/share-card';
import { useLanguage } from '@/lib/i18n/LanguageContext';

// Labels match app/dharm-veer/[id].tsx's FONT_PRESETS exactly -- both
// screens share the same ReaderShell toolbar component, this is just the
// label set each passes in, per explicit request to bring the two in line.
const FONT_PRESETS = [
  { label: 'A-', value: 0 },
  { label: 'A', value: 1 },
  { label: 'A+', value: 2 },
  { label: 'A++', value: 3 },
];

const VRAT_DETAIL_COPY = {
  en: {
    significance: 'Significance',
    practiceRules: 'Practice & Fasting Rules',
    fastType: 'Fast Type:',
    parana: 'Parana (Breaking Fast):',
    dos: "Recommended Practices (Do's)",
    donts: "Restrictions (Don'ts)",
    pujaItems: 'Puja Samagri',
    mantra: 'Sacred Mantra',
    canonical: 'Canonical',
    upcoming: 'Upcoming',
    backToCalendar: 'Back to Fasting Calendar',
    occurrenceUnavailable: 'Occurrence Details Unavailable',
    occurrenceUnavailableDesc: 'This specific observance occurrence is not active or could not be verified with the canonical calendar service. You can explore the sacred significance and practices below.',
    observedToday: 'Observed today ✓',
    markAsObserved: 'Mark as Observed',
    practiceRecorded: 'Your practice is recorded',
    earnKarma: 'Earn 25 karma for completing this vrat today',
    aroundWorld: 'Around the World',
    nextDate: 'Next date',
    observingToday: 'Observing today',
    allTime: 'All-time',
    seekersOnShoonaya: 'seekers on Shoonaya',
    observancesRecorded: 'observances recorded',
    alternativeTraditions: 'Alternative Traditions / Dates:',
    fastTypes: {
      nirjala: 'Nirjala (Waterless)',
      phalahar: 'Phalahar (Fruit-based)',
      sattvic: 'Sattvic food',
      ekbhukta: 'Ekbhukta (Single meal)',
      partial: 'Partial fast',
      none: 'None',
    },
  },
  hi: {
    significance: 'पावन महत्व',
    practiceRules: 'व्रत नियम व विधि',
    fastType: 'व्रत प्रकार:',
    parana: 'पारणा (व्रत खोलना):',
    dos: 'शुभ आचरण (क्या करें)',
    donts: 'वर्जित आचरण (क्या न करें)',
    pujaItems: 'पूजन सामग्री',
    mantra: 'पावन मंत्र',
    canonical: 'मान्य तिथि',
    upcoming: 'आगामी',
    backToCalendar: 'व्रत कैलेंडर पर वापस जाएं',
    occurrenceUnavailable: 'तिथि विवरण उपलब्ध नहीं',
    occurrenceUnavailableDesc: 'यह विशिष्ट पर्व तिथि वर्तमान में सक्रिय नहीं है अथवा मान्य कैलेंडर सेवा से सत्यापित नहीं हो सकी। आप नीचे इसका पावन महत्व और विधि देख सकते हैं।',
    observedToday: 'आज पूर्ण हुआ ✓',
    markAsObserved: 'व्रत पूर्ण अंकित करें',
    practiceRecorded: 'आपकी साधना दर्ज हो गई है',
    earnKarma: 'आज यह व्रत पूर्ण करने पर 25 कर्म अर्जित करें',
    aroundWorld: 'विश्व भर में',
    nextDate: 'अगली तिथि',
    observingToday: 'आज व्रत कर रहे हैं',
    allTime: 'कुल अब तक',
    seekersOnShoonaya: 'शून्या पर साधक',
    observancesRecorded: 'व्रत अनुष्ठान दर्ज',
    alternativeTraditions: 'वैकल्पिक परंपराएं व तिथियां:',
    fastTypes: {
      nirjala: 'निर्जला',
      phalahar: 'फलाहार',
      sattvic: 'सात्विक भोजन',
      ekbhukta: 'एकभुक्त (एक समय)',
      partial: 'आंशिक उपवास',
      none: 'सामान्य',
    },
  },
  pa: {
    significance: 'ਪਾਵਨ ਮਹੱਤਵ',
    practiceRules: 'ਵਰਤ ਨਿਯਮ ਅਤੇ ਵਿਧੀ',
    fastType: 'ਵਰਤ ਕਿਸਮ:',
    parana: 'ਪਾਰਣਾ (ਵਰਤ ਖੋਲ੍ਹਣਾ):',
    dos: 'ਸ਼ੁਭ ਆਚਰਣ (ਕੀ ਕਰੋ)',
    donts: 'ਵਰਜਿਤ ਆਚਰਣ (ਕੀ ਨਾ ਕਰੋ)',
    pujaItems: 'ਪੂਜਾ ਸਮੱਗਰੀ',
    mantra: 'ਪਾਵਨ ਮੰਤਰ',
    canonical: 'ਮੰਨਿਆ ਹੋਇਆ',
    upcoming: 'ਆਉਣ ਵਾਲਾ',
    backToCalendar: 'ਵਰਤ ਕੈਲੰਡਰ ਤੇ ਵਾਪਸ ਜਾਓ',
    occurrenceUnavailable: 'ਤਾਰੀਖ ਵੇਰਵੇ ਉਪਲਬਧ ਨਹੀਂ',
    occurrenceUnavailableDesc: 'ਇਹ ਵਿਸ਼ੇਸ਼ ਤਾਰੀਖ ਵਰਤਮਾਨ ਵਿੱਚ ਸਰਗਰਮ ਨਹੀਂ ਹੈ ਜਾਂ ਕੈਲੰਡਰ ਸੇਵਾ ਨਾਲ ਪ੍ਰਮਾਣਿਤ ਨਹੀਂ ਹੋ ਸਕੀ। ਤੁਸੀਂ ਹੇਠਾਂ ਇਸਦਾ ਮਹੱਤਵ ਅਤੇ ਵਿਧੀ ਪੜ੍ਹ ਸਕਦੇ ਹੋ।',
    observedToday: 'ਅੱਜ ਪੂਰਾ ਹੋਇਆ ✓',
    markAsObserved: 'ਵਰਤ ਪੂਰਾ ਦਰਜ ਕਰੋ',
    practiceRecorded: 'ਤੁਹਾਡੀ ਸਾਧਨਾ ਦਰਜ ਹੋ ਗਈ ਹੈ',
    earnKarma: 'ਅੱਜ ਇਹ ਵਰਤ ਪੂਰਾ ਕਰਨ ਤੇ 25 ਕਰਮ ਪ੍ਰਾਪਤ ਕਰੋ',
    aroundWorld: 'ਦੁਨੀਆ ਭਰ ਵਿੱਚ',
    nextDate: 'ਅਗਲੀ ਤਾਰੀਖ',
    observingToday: 'ਅੱਜ ਵਰਤ ਰੱਖ ਰਹੇ ਹਨ',
    allTime: 'ਹੁਣ ਤੱਕ ਕੁੱਲ',
    seekersOnShoonaya: 'ਸ਼ੂਨਯਾ ਤੇ ਸਾਧਕ',
    observancesRecorded: 'ਵਰਤ ਅਨੁਸ਼ਠਾਨ ਦਰਜ',
    alternativeTraditions: 'ਹੋਰ ਪਰੰਪਰਾਵਾਂ ਅਤੇ ਤਾਰੀਖਾਂ:',
    fastTypes: {
      nirjala: 'ਨਿਰਜਲਾ',
      phalahar: 'ਫਲਾਹਾਰ',
      sattvic: 'ਸਾਤਵਿਕ ਭੋਜਨ',
      ekbhukta: 'ਇੱਕਭੁਗਤ',
      partial: 'ਅੰਸ਼ਿਕ ਵਰਤ',
      none: 'ਸਧਾਰਨ',
    },
  },
} as const;

export default function VratDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug: string; occurrence_id?: string; date?: string }>();
  const slug = params.slug || 'ekadashi';
  const occurrenceIdParam = params.occurrence_id || null;

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = themeColor(isDark);

  // `language` (global) seeds this page's initial reading language, but the
  // in-page toggle below (line ~280) must stay page-local: it's a "read this
  // one page in a different language" preview, not an account-wide setting,
  // and must not overwrite the user's global app_language/Supabase profile.
  const { language } = useLanguage();
  const [readerLanguageOverride, setReaderLanguageOverride] = useState<typeof language | null>(null);
  const readerLanguage = readerLanguageOverride ?? language;
  const [isGuest, setIsGuest] = useState(false);
  const [observedToday, setObservedToday] = useState(false);
  const [observeCount, setObserveCount] = useState(0);
  const [observeLoading, setObserveLoading] = useState(false);
  const [observeStatusLoaded, setObserveStatusLoaded] = useState(false);
  const [canonicalToday, setCanonicalToday] = useState<string | null>(null);
  const [occurrence, setOccurrence] = useState<ClientObservanceResult | null>(null);
  const [occurrenceLoading, setOccurrenceLoading] = useState(false);

  const [fontStep, setFontStep] = useState(1);

  // Non-blocking success/error feedback -- matches the local toast pattern
  // already established in app/(tabs)/japa.tsx (this codebase has no shared
  // toast component yet; each screen owns its own instance).
  type ToastState = { visible: boolean; message: string };
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '' });
  const insets = useSafeAreaInsets();
  const shareCardRef = useRef<View | null>(null);
  const [sharing, setSharing] = useState(false);

  // "Around the World" global stats -- ported from the PWA's
  // GET /api/vrat/stats (public, no auth).
  const [globalStats, setGlobalStats] = useState<{
    today_count: number;
    total_count: number;
    next_date: string | null;
    today: string;
  } | null>(null);

  const vrat: VratData = useMemo(() => {
    return lookupVratData(slug) ?? getVratData(slug) ?? {
      id: slug,
      emoji: '🌿',
      name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      tagline: 'Sacred Observance',
      significance: 'A sacred observance in the dharmic calendar.',
      practice: 'Observe fasting and prayer according to your tradition.',
      mantra: 'Om Shanti Shanti Shanti',
    };
  }, [slug]);

  // Check guest state
  useEffect(() => {
    isGuestMode().then(setIsGuest);
  }, []);

  // Fetch occurrence and observation data strictly guarded by slug and occurrenceId
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    // Reset state synchronously
    setObservedToday(false);
    setObserveCount(0);
    setObserveStatusLoaded(false);
    setObserveLoading(false);
    setCanonicalToday(null);
    setOccurrence(null);

    // 1. Resolve the exact canonical UUID. This remains valid for historical
    // notification/deep links and is not bounded to a rolling calendar window.
    if (occurrenceIdParam) {
      setOccurrenceLoading(true);
      const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      apiFetch(`/api/vrat/occurrence?occurrence_id=${encodeURIComponent(occurrenceIdParam)}&tz=${encodeURIComponent(deviceTimezone)}`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled || controller.signal.aborted || !data) return;
          const resolvedOccurrence = data.occurrence as ClientObservanceResult | undefined;
          if (matchesRequestedOccurrence(occurrenceIdParam, resolvedOccurrence)) {
            setOccurrence(resolvedOccurrence);
          } else {
            setOccurrence(null);
          }
        })
        .catch(() => {
          if (!cancelled && !controller.signal.aborted) {
            setOccurrence(null);
          }
        })
        .finally(() => {
          if (!cancelled && !controller.signal.aborted) {
            setOccurrenceLoading(false);
          }
        });
    }

    // 2. Query observation status
    const observeUrl = occurrenceIdParam
      ? `/api/vrat/observe?occurrence_id=${encodeURIComponent(occurrenceIdParam)}`
      : `/api/vrat/observe?vrat_id=${encodeURIComponent(vrat.id)}`;

    apiFetch(observeUrl, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || controller.signal.aborted || !data) return;
        setObservedToday(Boolean(data.observed_today));
        setObserveCount(data.total_count ?? 0);
        if (data.today) setCanonicalToday(data.today);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled && !controller.signal.aborted) {
          setObserveStatusLoaded(true);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [slug, occurrenceIdParam, vrat.id]);

  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(() => setToast({ visible: false, message: '' }), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  // Global "Around the World" stats -- public, no auth required.
  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/vrat/stats?vrat_id=${encodeURIComponent(vrat.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setGlobalStats(data);
      })
      .catch(() => {
        if (!cancelled) setGlobalStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [vrat.id]);

  const isEligibleToday = useMemo(() => {
    if (!occurrenceIdParam || !occurrence) return false;
    return isEligibleToObserveToday({
      occurrence,
      canonicalTodayDate: canonicalToday,
    });
  }, [occurrenceIdParam, occurrence, canonicalToday]);

  const handleObserve = async () => {
    if (!occurrenceIdParam || !isEligibleToday || observedToday || observeLoading) {
      return;
    }

    if (isGuest) {
      Alert.alert('Sign in required', 'Sign in to track your Vrat observances and earn karma.');
      return;
    }

    setObserveLoading(true);
    try {
      const payload = buildVratObservationPayload({ occurrenceId: occurrenceIdParam });
      const res = await apiFetch('/api/vrat/observe', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setObservedToday(true);
        setObserveCount((count) => count + (data.already_observed ? 0 : 1));
        if (!data.already_observed && data.karma_earned > 0) {
          setToast({ visible: true, message: `🙏 Vrat observed! +${data.karma_earned} karma` });
        } else {
          setToast({ visible: true, message: 'Vrat observed' });
        }
      } else {
        setToast({ visible: true, message: data?.error ?? 'Could not record observation' });
      }
    } catch {
      setToast({ visible: true, message: 'Could not record observation' });
    } finally {
      setObserveLoading(false);
    }
  };

  const hasLocalVrat = Boolean(vrat.nameLocal && vrat.taglineLocal && vrat.significanceLocal && vrat.practiceLocal);
  // VratData currently contains Hindi local copy only. Do not label it Punjabi
  // just because the user's app language is Punjabi; use the original English
  // text until reviewed Punjabi content exists for this vrat.
  const showLocal = readerLanguage === 'hi' && hasLocalVrat;
  const copy = VRAT_DETAIL_COPY[readerLanguage === 'hi' ? 'hi' : readerLanguage === 'pa' ? 'pa' : 'en'];
  const selectedName = showLocal && vrat.nameLocal ? vrat.nameLocal : vrat.name;
  const selectedTagline = showLocal && vrat.taglineLocal ? vrat.taglineLocal : vrat.tagline;
  const selectedSignificance = showLocal && vrat.significanceLocal ? vrat.significanceLocal : vrat.significance;
  const selectedPractice = showLocal && vrat.practiceLocal ? vrat.practiceLocal : vrat.practice;
  const selectedMantra = showLocal && vrat.mantraLocal ? vrat.mantraLocal : vrat.mantra;
  const selectedDos = showLocal && vrat.dosLocal && vrat.dosLocal.length > 0 ? vrat.dosLocal : vrat.dos;
  const selectedDonts = showLocal && vrat.dontsLocal && vrat.dontsLocal.length > 0 ? vrat.dontsLocal : vrat.donts;
  const selectedBreakFastTime = showLocal && vrat.breakFastTimeLocal ? vrat.breakFastTimeLocal : vrat.breakFastTime;
  const selectedFastingType = vrat.fastingType ? (copy.fastTypes[vrat.fastingType] ?? vrat.fastingType) : null;
  const fsScale = fontStep === 0 ? 0.85 : fontStep === 1 ? 1 : fontStep === 2 ? 1.15 : 1.3;

  // Same rendered-image-card approach as app/shloka.tsx's share (via
  // ShoonayaShareCard + shareCapturedShoonayaCard/react-native-view-shot),
  // per explicit request to match that style rather than a plain-text
  // Share.share() call.
  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));
      await shareCapturedShoonayaCard(shareCardRef, {
        fileName: `shoonaya-vrat-${slug}.png`,
        dialogTitle: `Share ${selectedName}`,
        fallbackMessage: `${selectedName}\n\n${selectedTagline}`,
      });
    } catch {
      // sharing cancelled or failed silently
    } finally {
      setSharing(false);
    }
  };

  return (
    <ReaderShell
      title={selectedName}
      subtitle={selectedTagline}
      fallbackBackUrl="/vrat"
      themeColor={theme.brand}
      ambientGlowColor={theme.brand}
      fontPresets={FONT_PRESETS}
      fontStep={fontStep}
      setFontStep={setFontStep}
      languages={hasLocalVrat ? [{ code: 'en' as const, label: 'EN' }, { code: 'hi' as const, label: 'हिंदी' }] : undefined}
      currentLanguage={showLocal ? 'hi' : 'en'}
      onShare={handleShare}
      setLanguage={(code) => setReaderLanguageOverride(code as typeof language)}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <Card style={{ padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 36 }}>{vrat.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TYPE.title, color: theme.text }}>{selectedName}</Text>
              <Text style={{ ...TYPE.body, color: theme.dim, marginTop: 2 }}>{selectedTagline}</Text>
            </View>
          </View>

          {/* Canonical Occurrence Info Banner */}
          {occurrence ? (
            <View
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: RADII.md,
                backgroundColor: theme.brandSoft,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="calendar" size={14} color={theme.brand} />
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.text }}>
                  {occurrence.civilDate ?? occurrence.date}
                </Text>
                {occurrence.status === 'resolved' ? (
                  <View
                    style={{
                      backgroundColor: COLORS.successBg,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      marginLeft: 'auto',
                    }}
                  >
                    <Text style={{ fontSize: 11, color: COLORS.success, fontFamily: FONTS.sansSemiBold }}>{copy.canonical}</Text>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: isDark ? COLORS.warningBgDark : COLORS.warningBgLight,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      marginLeft: 'auto',
                    }}
                  >
                    <Text style={{ fontSize: 11, color: isDark ? COLORS.warningDark : COLORS.warningLight, fontFamily: FONTS.sansSemiBold }}>{copy.upcoming}</Text>
                  </View>
                )}
              </View>

              {occurrence.profile?.calendar ? (
                <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: theme.dim, marginTop: 4 }}>
                  Profile: {occurrence.profile.calendar} · Tradition: {occurrence.profile.tradition}
                </Text>
              ) : null}

              {/* Diagnostics if present */}
              {occurrence.diagnostics && occurrence.diagnostics.length > 0 ? (
                <View style={{ marginTop: 6 }}>
                  {occurrence.diagnostics.map((d, i) => (
                    <Text key={i} style={{ fontFamily: FONTS.sans, fontSize: 11, color: theme.dim }}>
                      ℹ {d}
                    </Text>
                  ))}
                </View>
              ) : null}

              {/* Alternatives if present */}
              {occurrence.alternatives && occurrence.alternatives.length > 0 ? (
                <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: theme.borderSoft }}>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: theme.dim }}>
                    {copy.alternativeTraditions}
                  </Text>
                  {occurrence.alternatives.map((alt, i) => (
                    <Text key={i} style={{ fontFamily: FONTS.sans, fontSize: 11, color: theme.text, marginTop: 2 }}>
                      • {alt.profile.tradition} ({alt.profile.calendar}): {alt.civilDate} {alt.note ? `— ${alt.note}` : ''}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : occurrenceIdParam ? (
            occurrenceLoading ? (
              <View style={{ marginTop: 16, padding: 12, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.brand} />
              </View>
            ) : (
              <View
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: RADII.md,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="info" size={16} color={theme.dim} />
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.text }}>
                    {copy.occurrenceUnavailable}
                  </Text>
                </View>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: theme.dim, marginTop: 4, lineHeight: 18 }}>
                  {copy.occurrenceUnavailableDesc}
                </Text>
                <PressableSurface
                  onPress={() => router.push('/vrat')}
                  style={{
                    marginTop: 10,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: RADII.sm,
                    backgroundColor: theme.brandSoft,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: theme.brand }}>
                    {copy.backToCalendar}
                  </Text>
                </PressableSurface>
              </View>
            )
          ) : null}
        </Card>

        {/* Action CTA: Mark as Observed (only when occurrence is eligible today) */}
        {occurrenceIdParam && isEligibleToday ? (
          <Card style={{ padding: 16, marginBottom: 16, alignItems: 'center' }}>
            {observedToday ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  paddingVertical: 12,
                  borderRadius: RADII.pill,
                  backgroundColor: COLORS.successBg,
                  borderWidth: 1.5,
                  borderColor: COLORS.successBorder,
                }}
              >
                <Feather name="check-circle" size={18} color={COLORS.success} />
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: COLORS.success }}>
                  {copy.observedToday} {observeCount > 1 ? `(${observeCount}× total)` : ''}
                </Text>
              </View>
            ) : (
              <PressableSurface
                onPress={handleObserve}
                disabled={observeLoading || !observeStatusLoaded}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  paddingVertical: 14,
                  borderRadius: RADII.pill,
                  backgroundColor: theme.brand,
                }}
              >
                {observeLoading ? (
                  <ActivityIndicator size="small" color={theme.textOnBrand} />
                ) : (
                  <>
                    <Text style={{ fontSize: 16 }}>🙏</Text>
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: theme.textOnBrand }}>
                      {copy.markAsObserved} {observeCount > 0 ? `(${observeCount}× before)` : ''}
                    </Text>
                  </>
                )}
              </PressableSurface>
            )}
            <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: theme.dim, marginTop: 8 }}>
              {observedToday ? copy.practiceRecorded : copy.earnKarma}
            </Text>
          </Card>
        ) : null}

        {/* Around the World -- global stats, ported from the PWA's
            GET /api/vrat/stats. Same gating as web: only render when there's
            something to show. */}
        {globalStats && (globalStats.next_date || globalStats.total_count > 0) ? (
          <Card style={{ padding: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Feather name="calendar" size={14} color={theme.dim} />
              <Text style={{ ...TYPE.chip, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>
                {copy.aroundWorld}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {globalStats.next_date ? (
                <View style={{ flex: 1, borderRadius: RADII.md, backgroundColor: theme.brandSoft, borderWidth: 1, borderColor: theme.border, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, color: theme.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {copy.nextDate}
                  </Text>
                  <Text style={{ fontFamily: FONTS.serif, fontSize: 16, color: theme.brand, marginTop: 4 }}>
                    {new Date(`${globalStats.next_date}T00:00:00`).toLocaleDateString(readerLanguage === 'hi' ? 'hi-IN' : 'en', { day: 'numeric', month: 'short' })}
                  </Text>
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: theme.dim, marginTop: 2 }}>
                    {new Date(`${globalStats.next_date}T00:00:00`).toLocaleDateString(readerLanguage === 'hi' ? 'hi-IN' : 'en', { weekday: 'long' })}
                  </Text>
                </View>
              ) : null}
              {globalStats.today_count > 0 ? (
                <View style={{ flex: 1, borderRadius: RADII.md, backgroundColor: theme.brandSoft, borderWidth: 1, borderColor: theme.border, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, color: theme.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {copy.observingToday}
                  </Text>
                  <Text style={{ fontFamily: FONTS.serif, fontSize: 16, color: theme.brand, marginTop: 4 }}>
                    {globalStats.today_count.toLocaleString()}
                  </Text>
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: theme.dim, marginTop: 2 }}>
                    {copy.seekersOnShoonaya}
                  </Text>
                </View>
              ) : globalStats.total_count > 0 ? (
                <View style={{ flex: 1, borderRadius: RADII.md, backgroundColor: theme.brandSoft, borderWidth: 1, borderColor: theme.border, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, color: theme.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {copy.allTime}
                  </Text>
                  <Text style={{ fontFamily: FONTS.serif, fontSize: 16, color: theme.brand, marginTop: 4 }}>
                    {globalStats.total_count.toLocaleString()}
                  </Text>
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: theme.dim, marginTop: 2 }}>
                    {copy.observancesRecorded}
                  </Text>
                </View>
              ) : null}
            </View>
            {globalStats.today_count > 0 ? (
              <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: theme.dim, textAlign: 'center', marginTop: 10 }}>
                {globalStats.today_count === 1 ? '1 seeker is' : `${globalStats.today_count} seekers are`} observing with you today
              </Text>
            ) : null}
          </Card>
        ) : null}

        {/* Significance */}
        <Card style={{ padding: 16, marginBottom: 16 }}>
          <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 8 }}>{copy.significance}</Text>
          <Text style={{ ...TYPE.body, color: theme.text, fontSize: TYPE.body.fontSize * fsScale, lineHeight: 22 * fsScale }}>{selectedSignificance}</Text>
        </Card>

        {/* Fasting & Practice */}
        <Card style={{ padding: 16, marginBottom: 16 }}>
          <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 8 }}>{copy.practiceRules}</Text>
          <Text style={{ ...TYPE.body, color: theme.text, fontSize: TYPE.body.fontSize * fsScale, lineHeight: 22 * fsScale }}>{selectedPractice}</Text>

          {selectedFastingType ? (
            <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: theme.text }}>{copy.fastType}</Text>
              <View style={{ backgroundColor: theme.brandSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: theme.brand, textTransform: 'capitalize' }}>
                  {selectedFastingType}
                </Text>
              </View>
            </View>
          ) : null}

          {selectedBreakFastTime ? (
            <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: theme.text }}>{copy.parana}</Text>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: theme.dim }}>{selectedBreakFastTime}</Text>
            </View>
          ) : null}
        </Card>

        {/* Do's and Don'ts if present */}
        {selectedDos && selectedDos.length > 0 ? (
          <Card style={{ padding: 16, marginBottom: 16 }}>
            <Text style={{ ...TYPE.section, color: COLORS.success, marginBottom: 8 }}>{copy.dos}</Text>
            {selectedDos.map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <Feather name="check" size={14} color={COLORS.success} style={{ marginTop: 3 }} />
                <Text style={{ ...TYPE.body, color: theme.text, flex: 1, fontSize: 13 * fsScale, lineHeight: TYPE.body.lineHeight * fsScale }}>{item}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {selectedDonts && selectedDonts.length > 0 ? (
          <Card style={{ padding: 16, marginBottom: 16 }}>
            <Text style={{ ...TYPE.section, color: COLORS.danger, marginBottom: 8 }}>{copy.donts}</Text>
            {selectedDonts.map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <Feather name="x" size={14} color={COLORS.danger} style={{ marginTop: 3 }} />
                <Text style={{ ...TYPE.body, color: theme.text, flex: 1, fontSize: 13 * fsScale, lineHeight: TYPE.body.lineHeight * fsScale }}>{item}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {/* Sacred Mantra */}
        <Card style={{ padding: 16, marginBottom: 16, backgroundColor: theme.brandSoft, borderColor: theme.brand }}>
          <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 6 }}>{copy.mantra}</Text>
          <Text style={{ fontFamily: FONTS.serif, fontSize: 16 * fsScale, lineHeight: 24 * fsScale, color: theme.text, fontStyle: 'italic', textAlign: 'center', marginVertical: 8 }}>
            {selectedMantra}
          </Text>
        </Card>
      </ScrollView>

      {toast.visible ? (
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + 20,
            left: 20,
            right: 20,
            borderRadius: 16,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.brand,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.text }}>{toast.message}</Text>
        </View>
      ) : null}

      {/* Off-screen, rasterized by shareCapturedShoonayaCard via
          react-native-view-shot -- same pattern as app/shloka.tsx. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: -10000, top: 0, width: 360, height: 640 }}>
        <View collapsable={false}>
          <ShoonayaShareCard
            ref={shareCardRef}
            data={{
              tradition: 'universal',
              layout: 'sacredText',
              headlineValue: selectedMantra || selectedTagline,
              title: selectedName,
              subtitle: selectedTagline,
              caption: selectedSignificance,
              date: canonicalToday ?? undefined,
              footer: globalStats && globalStats.today_count > 0
                ? `${globalStats.today_count.toLocaleString()} seekers observing today`
                : undefined,
            }}
          />
        </View>
      </View>
    </ReaderShell>
  );
}
