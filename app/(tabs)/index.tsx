import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calculatePanchang } from '@sangam/panchang-engine';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { HomeSkeleton } from '@/components/home/HomeSkeleton';
import { apiFetch } from '@/lib/api';
import { API_BASE, COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE } from '@/lib/constants';
import { getMyUnreadNotificationCount, subscribeToMyNotifications } from '@/lib/notificationsData';
import { resolveNativeRoute } from '@/lib/routes';
import { useScrollToTop } from '@/lib/useScrollToTop';

type PracticeId = 'japa' | 'nitya' | 'pathshala' | 'quiz' | 'dharmveer';

type PracticeRow = {
  id: PracticeId;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  detail: string;
  href: string;
  done: boolean;
  progress: number;
  color: string;
  streak?: number;
};

type HomeSummary = {
  profile: {
    name: string;
    firstName: string;
    tradition: string;
    city: string;
    country: string;
    karmaPoints: number;
    relicImageUrl: string | null;
    avatarUrl: string | null;
  };
  hero: {
    imageUrl: string;
    alt: string;
    objectPosition: string;
    label: string;
  };
  date: {
    iso: string;
    timezone: string;
    latitude: number;
    longitude: number;
  };
  sacredText: {
    label: string;
    icon: string;
    original: string;
    transliteration: string;
    meaning: string;
    source: string;
    accentColour: string;
    accentLight: string;
  };
  panchang: {
    href: string;
    tithiLabel: string;
    festivalLabel: string | null;
    vratLabel: string | null;
    observance: {
      name: string;
      emoji: string | null;
      daysLeft: number;
      routeKind: string;
      routeSlug: string;
      href: string;
      label: string;
    } | null;
  };
  nextPractice: {
    id: PracticeId;
    contextLabel: string;
    title: string;
    suggestion: string;
    nudge: string;
    actionLabel: string;
    actionHref: string;
    progress: number;
  };
  practices: PracticeRow[];
  sankalpa: {
    id: string;
    text: string;
    startDate: string;
    endDate: string;
    targetDays: number;
    day: number;
    progress: number;
    tradition: string;
    relatedPractice: string | null;
  } | null;
  dharmVeer: {
    id: string;
    name: string;
    tagline: string;
    href: string;
  };
};

const SANSKRIT_WEEKDAYS = ['Ravivara', 'Somavara', 'Mangalavara', 'Budhavara', 'Guruvāra', 'Shukravara', 'Shanivara'];
const HERO_MIN_HEIGHT = 720;
const HERO_READABILITY_HEIGHT = 400;
const HERO_SHLOKA_TOP_SPACE = 340;

const INITIAL_STATE: HomeSummary = {
  profile: {
    name: 'Seeker',
    firstName: 'Seeker',
    tradition: 'hindu',
    city: '',
    country: '',
    karmaPoints: 0,
    relicImageUrl: null,
    avatarUrl: null,
  },
  hero: {
    imageUrl: '/assets/images/heroes/all/default.webp',
    alt: 'Shoonaya devotional artwork',
    objectPosition: 'center 25%',
    label: 'Global default',
  },
  date: {
    iso: new Date().toISOString().slice(0, 10),
    timezone: 'Asia/Kolkata',
    latitude: 23.1765,
    longitude: 75.7885,
  },
  sacredText: {
    label: "Today's Verse",
    icon: 'ॐ',
    original: 'वसुधैव कुटुम्बकम्',
    transliteration: 'Vasudhaiva Kutumbakam',
    meaning: 'The whole world is one family, a reminder to act with kinship and dignity.',
    source: 'Maha Upanishad',
    accentColour: COLORS.brandGold,
    accentLight: COLORS.authGoldWellBg,
  },
  panchang: {
    href: '/panchang',
    tithiLabel: 'Today’s Panchang',
    festivalLabel: null,
    vratLabel: null,
    observance: null,
  },
  nextPractice: {
    id: 'pathshala',
    contextLabel: 'Next Practice',
    title: 'Pathshala',
    suggestion: 'Continue your practice to quiet the mind.',
    nudge: 'Consistency builds the strongest foundation.',
    actionLabel: 'Go to Pathshala',
    actionHref: '/pathshala',
    progress: 0,
  },
  practices: [],
  sankalpa: null,
  dharmVeer: {
    id: '',
    name: 'Dharm Veer',
    tagline: 'Remember a life of courage',
    href: '/dharm-veer',
  },
};

const GREETING_POOLS: Record<string, string[]> = {
  hindu: ['Jai Shri Ram', 'Hari Om', 'Om Namah Shivaya', 'Radhe Radhe'],
  sikh: ['Sat Sri Akal', 'Waheguru Ji Ka Khalsa'],
  buddhist: ['Namo Buddhaya', 'Om Mani Padme Hum'],
  jain: ['Jai Jinendra', 'Namo Arihantanam'],
  default: ['Jai Shri Ram', 'Om Namah Shivaya', 'Hari Om', 'Pranam'],
};

function getTraditionGreeting(tradition: string | null, seed: number) {
  const pool = (tradition && GREETING_POOLS[tradition]) || GREETING_POOLS.default;
  return pool[seed % pool.length];
}

function getTimeGreeting(hour: number): string | null {
  if (hour >= 5 && hour < 12) return 'Suprabhat';
  if (hour >= 17 && hour < 20) return 'Shubh Sandhya';
  if (hour >= 20 || hour < 5) return 'Shubh Ratri';
  return null;
}

function getDateLabel(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00`);
  const english = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  const sanskritWeekday = SANSKRIT_WEEKDAYS[date.getDay()] ?? 'Dina';
  return `${sanskritWeekday} · ${english}`;
}

function resolveAssetUrl(url: string | null | undefined) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
}

function formatKarma(points: number) {
  if (points >= 1000) return `${Math.floor(points / 1000)}k`;
  return String(points);
}

function ProgressRing({
  done,
  progress,
  color,
  track,
  size = 34,
}: {
  done: boolean;
  progress: number;
  color: string;
  track: string;
  size?: number;
}) {
  const radius = size / 2 - 3.5;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={2.5} />
        {done || clamped > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={`${clamped * circumference} ${circumference}`}
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        ) : null}
      </Svg>
      {done ? <Feather name="check" size={size <= 26 ? 12 : 15} color={color} /> : null}
    </View>
  );
}

function PanchangPill({
  panchang,
  selectedDateIso,
  theme,
}: {
  panchang: { tithi: string; paksha: string; nakshatra: string; yoga: string; samvatYear: number };
  selectedDateIso: string;
  theme: { heroOverlay: string; borderSoft: string; text: string; brand: string };
}) {
  const [idx, setIdx] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => sub.remove();
  }, []);

  const total = 3;

  useEffect(() => {
    // Reduced motion means calm, not just "no fade" — auto-cycling on a
    // fixed timer is itself motion the user asked to avoid. Respect that by
    // not auto-advancing at all when reduced motion is on; the pill stays on
    // one slide until the user explicitly taps (handleCycle below, which
    // already skips the animation in that case too).
    if (reducedMotion) {
      return;
    }
    const t = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        setIdx((i) => (i + 1) % total);
        Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      });
    }, 3500);
    return () => clearInterval(t);
  }, [fadeAnim, reducedMotion, total]);

  const handleCycle = useCallback(() => {
    if (reducedMotion) {
      setIdx((i) => (i + 1) % total);
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
        setIdx((i) => (i + 1) % total);
        Animated.timing(fadeAnim, { toValue: 1, duration: 100, useNativeDriver: true }).start();
      });
    }
  }, [fadeAnim, reducedMotion]);

  const slides: { key: string; icon: string; label: string }[] = [
    { key: 'tithi', icon: '🌙', label: `${panchang.tithi} · VS ${panchang.samvatYear}` },
    { key: 'nakshatra', icon: '✨', label: `${panchang.nakshatra} · ${panchang.yoga}` },
    { key: 'date', icon: '📅', label: getDateLabel(selectedDateIso) },
  ];
  const currentSlide = slides[idx];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Panchang info: ${currentSlide.label}. Tap to cycle`}
      onPress={handleCycle}
      hitSlop={4}
      style={{
        minHeight: 36,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 4,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        backgroundColor: COLORS.homePwaPillBg,
        minWidth: 120,
        overflow: 'hidden',
      }}
    >
      <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: fadeAnim }}>
        <Text style={{ fontSize: 12, lineHeight: 14 }}>{currentSlide.icon}</Text>
        <Text style={{ ...TYPE.chip, fontSize: 12, lineHeight: 15, color: COLORS.homePwaPillText }} numberOfLines={1}>
          {currentSlide.label}
        </Text>
      </Animated.View>

      {/* Dot indicators — PWA's PanchangPill (HeroSection.tsx) shows these
          so the pill visibly reads as "tap to cycle through N things"
          instead of just looking like a static label. Colors are the warm
          cream PWA uses verbatim (rgba(255,240,200,*)) rather than
          theme-flipped — the pill always sits over the hero's darkened
          image area in both light and dark mode, same as in PWA. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 4 }}>
        {slides.map((s, i) => (
          <View
            key={s.key}
            style={{
              width: i === idx ? 10 : 4,
              height: 4,
              borderRadius: 99,
              backgroundColor: i === idx ? COLORS.homePwaPillDotActive : COLORS.homePwaPillDotInactive,
            }}
          />
        ))}
      </View>
    </Pressable>
  );
}

function HomeContent() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [state, setState] = useState<HomeSummary>(INITIAL_STATE);
  const [loadError, setLoadError] = useState(false);
  const [practicesOpen, setPracticesOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const scrollRef = useScrollToTop();

  const theme = useMemo(
    () => ({
      background: isDark ? COLORS.darkBg : COLORS.creamBg,
      hero: isDark ? COLORS.homeHeroDark : COLORS.homeHeroLight,
      heroOverlay: isDark ? COLORS.homeHeroOverlayDark : COLORS.homeHeroOverlayLight,
      card: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
      raised: isDark ? COLORS.homeRaisedDark : COLORS.homeRaisedLight,
      soft: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight,
      border: isDark ? COLORS.borderDark : COLORS.borderLight,
      borderSoft: isDark ? COLORS.homeBorderSoftDark : COLORS.homeBorderSoftLight,
      text: isDark ? COLORS.creamBg : COLORS.ink,
      dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
      shadow: isDark ? SHADOWS.heroCard.dark : SHADOWS.heroCard.light,
      ringTrack: isDark ? COLORS.homeRingTrackDark : COLORS.homeRingTrackLight,
      iconWell: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight,
      // PWA's brand-primary is theme-aware, not one static value — its real
      // light-mode primary is a deeper terracotta (#D88A1C), reserving
      // #C5A059 (COLORS.brandGold, used as a flat constant everywhere else
      // in this file today) for dark mode specifically. Applied here first
      // within the hero card being rebuilt this pass; the rest of this
      // screen's ~15 remaining COLORS.brandGold call sites (Next
      // Practice/Sankalpa/Dharm Veer cards below) are flagged as a tracked
      // follow-up rather than swept blindly in the same change.
      brand: isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight,
    }),
    [isDark]
  );

  const heroImageUrl = resolveAssetUrl(state.hero.imageUrl);
  const relicImageUrl = resolveAssetUrl(state.profile.relicImageUrl);

  const panchang = useMemo(
    () => calculatePanchang(
      new Date(`${state.date.iso}T12:00:00`),
      state.date.latitude,
      state.date.longitude,
      state.date.timezone
    ),
    [state.date.iso, state.date.latitude, state.date.longitude, state.date.timezone]
  );

  const tithiPill = `${panchang.tithi} · ${panchang.paksha}`;
  const completedCount = state.practices.filter((row) => row.done).length;
  const actionRoute = resolveNativeRoute(state.nextPractice.actionHref);

  const greeting = useMemo(
    () => getTimeGreeting(new Date().getHours()) ?? getTraditionGreeting(state.profile.tradition, new Date(`${state.date.iso}T12:00:00`).getDate()),
    [state.profile.tradition, state.date.iso]
  );

  const nextPracticeRow = state.practices.find((row) => row.id === state.nextPractice.id);
  const nextPracticeIcon = nextPracticeRow?.icon ?? 'compass';
  const nextPracticeColor = nextPracticeRow?.color ?? COLORS.brandGold;

  const dharmVeerRow = state.practices.find((row) => row.id === 'dharmveer');
  const dharmVeerDone = dharmVeerRow?.done ?? false;
  const dharmVeerIcon = dharmVeerRow?.icon ?? 'shield';
  const dharmVeerColor = dharmVeerRow?.color ?? COLORS.brandGold;

  const loadHome = useCallback(async () => {
    setLoadError(false);
    const response = await apiFetch('/api/native/home-summary');

    if (response.status === 401) {
      router.replace('/(auth)/login');
      return;
    }

    if (!response.ok) {
      throw new Error('Could not load home summary');
    }

    const payload = (await response.json()) as HomeSummary;
    setState({
      ...INITIAL_STATE,
      ...payload,
      profile: { ...INITIAL_STATE.profile, ...payload.profile },
      hero: { ...INITIAL_STATE.hero, ...payload.hero },
      date: { ...INITIAL_STATE.date, ...payload.date },
      sacredText: { ...INITIAL_STATE.sacredText, ...payload.sacredText },
      panchang: { ...INITIAL_STATE.panchang, ...payload.panchang },
      nextPractice: { ...INITIAL_STATE.nextPractice, ...payload.nextPractice },
      practices: payload.practices ?? [],
      dharmVeer: { ...INITIAL_STATE.dharmVeer, ...payload.dharmVeer },
    });
  }, [router]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        await loadHome();
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [loadHome]);

  // Keeps the bell badge honest without a full app restart. Two parts:
  // 1. Refetch on every focus — covers returning to Home after marking
  //    everything read in the inbox (app/notifications.tsx), where Home's
  //    own state was never told the count changed.
  // 2. A live INSERT subscription, but only while Home is the focused
  //    screen — covers a new notification arriving while Home is actually
  //    on screen. Scoped to focus (not mount) so it disconnects the moment
  //    Home is blurred (e.g. navigating into Notifications), rather than
  //    running a second long-lived channel alongside that screen's own
  //    subscription (lib/notificationsData.ts's subscribeToNotifications).
  // Both paths are best-effort — a failed unread count fetch should never
  // flip Home into its error state, it just means the bell shows no badge.
  useFocusEffect(
    useCallback(() => {
      void getMyUnreadNotificationCount().then(setUnreadNotifications);
      return subscribeToMyNotifications(() => {
        void getMyUnreadNotificationCount().then(setUnreadNotifications);
      });
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadHome();
    } finally {
      setRefreshing(false);
    }
    void getMyUnreadNotificationCount().then(setUnreadNotifications);
  }, [loadHome]);

  // Match the PWA Home hero: show only the first verse line in the
  // transitional Home block, with the full text available on /shloka.
  const sacredTextLine = state.sacredText.original.split('\n')[0] || state.sacredText.original;

  const navigate = useCallback(
    (href: Href) => {
      try {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
      router.push(href);
    },
    [router]
  );

  if (loading) {
    return <HomeSkeleton />;
  }

  if (loadError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="wifi-off"
            title="Could not load home"
            subtitle="Check your connection and try again."
            ctaLabel="Retry"
            onCta={() => {
              void onRefresh();
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 34 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brandGold} />}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            minHeight: HERO_MIN_HEIGHT,
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 34,
            backgroundColor: theme.hero,
            overflow: 'hidden',
            justifyContent: 'flex-start',
          }}
        >
          {heroImageUrl ? (
            <Image
              source={{ uri: heroImageUrl }}
              accessibilityIgnoresInvertColors
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : null}

          {/* Two-layer gradient, ported from PWA's .divine-hero-overlay +
              .divine-hero-readability (src/app/globals.css) — replaces the
              old flat image-opacity + solid-color wash, which crushed the
              whole image to one uniform dullness instead of only darkening
              where text needs to sit. Layer 1 (top scrim) keeps the bell/
              avatar/greeting legible without touching the rest of the
              image. Layer 2 (bottom readability) fades to the exact same
              solid `theme.background` the shloka panel below now uses, so
              image → gradient → panel is one continuous blend with no
              visible seam — the fix for the "separated white line". */}
          <LinearGradient
            pointerEvents="none"
            colors={[
              isDark ? COLORS.heroScrimTopDark : COLORS.heroScrimTopLight,
              isDark ? COLORS.heroScrimMidDark : COLORS.heroScrimMidLight,
              'transparent',
            ]}
            locations={[0, 0.4, 0.8]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[
              'transparent',
              isDark ? COLORS.heroReadabilitySoftDark : COLORS.heroReadabilitySoftLight,
              isDark ? COLORS.heroReadabilityDark : COLORS.heroReadabilityLight,
              theme.background,
            ]}
            locations={[0, 0.35, 0.75, 1]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: HERO_READABILITY_HEIGHT }}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : 'Notifications'}
              onPress={() => navigate('/notifications')}
              style={{
                minWidth: MIN_TOUCH_TARGET,
                minHeight: MIN_TOUCH_TARGET,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.heroOverlay,
                borderWidth: 1,
                borderColor: theme.borderSoft,
              }}
            >
              <Feather name="bell" size={18} color={theme.text} />
              {unreadNotifications > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 9,
                    height: 9,
                    borderRadius: 5,
                    backgroundColor: theme.brand,
                    borderWidth: 1.5,
                    borderColor: theme.heroOverlay,
                  }}
                />
              ) : null}
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {state.profile.karmaPoints > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${state.profile.karmaPoints} karma points`}
                  onPress={() => navigate('/(tabs)/profile')}
                  style={{
                    minHeight: MIN_TOUCH_TARGET,
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 5,
                    backgroundColor: COLORS.homeGoldPillBg,
                    borderWidth: 1,
                    borderColor: COLORS.homeGoldPillBorder,
                  }}
                >
                  <Feather name="star" size={12} color={theme.brand} />
                  <Text style={{ ...TYPE.chip, color: theme.brand }}>
                    {formatKarma(state.profile.karmaPoints)}
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open profile"
                onPress={() => navigate('/(tabs)/profile')}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.heroOverlay,
                  borderWidth: 1,
                  borderColor: theme.borderSoft,
                  overflow: 'hidden',
                }}
              >
                {relicImageUrl ? (
                  <Image source={{ uri: relicImageUrl }} style={{ width: 34, height: 34 }} resizeMode="contain" />
                ) : (
                  <Text style={{ ...TYPE.homeHeroGreeting, color: theme.text }}>
                    {state.profile.firstName.charAt(0)}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* PWA (HeroSection.tsx) stacks city -> greeting -> pill with only
              mt-3/mt-1.5 between the icon row above and this block — a
              tight rhythm. This block previously used marginTop: 48, which
              is why the greeting/pills read as noticeably lower/detached
              from the bell+avatar row than PWA's version. */}
          <View style={{ marginTop: 18, alignItems: 'flex-start' }}>
            {state.profile.city ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Feather name="map-pin" size={12} color={theme.dim} />
                <Text style={{ ...TYPE.homeHeroLocation, letterSpacing: 1.1, textTransform: 'uppercase', color: theme.dim }}>
                  {state.profile.city}
                </Text>
              </View>
            ) : null}

            <Text style={{ ...TYPE.homeHeroGreeting, color: theme.text }}>
              {greeting}, {state.profile.firstName}
            </Text>
            <Text style={{ marginTop: 6, ...TYPE.caption, color: theme.dim }}>
              {getDateLabel(state.date.iso)}
            </Text>

            <View style={{ marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <PanchangPill panchang={panchang} selectedDateIso={state.date.iso} theme={theme} />

              {state.panchang.observance ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open calendar, ${state.panchang.observance.label}`}
                  onPress={() => navigate(state.panchang.observance!.href as Href)}
                  hitSlop={4}
                  style={{
                    minHeight: 36,
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                    backgroundColor: COLORS.homePwaObservanceBg,
                    borderWidth: 1,
                    borderColor: COLORS.homePwaObservanceBorder,
                  }}
                >
                  <Text style={{ fontSize: 12, lineHeight: 14 }}>{state.panchang.observance.emoji}</Text>
                  <Text
                    style={{
                      ...TYPE.chip,
                      fontSize: 11,
                      lineHeight: 14,
                      color: COLORS.homePwaObservanceText,
                    }}
                    numberOfLines={1}
                  >
                    {state.panchang.observance.label}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${state.sacredText.label}: ${state.sacredText.original}. ${state.sacredText.meaning}. Tap to open, mark as read, and earn seva points`}
            onPress={() => navigate('/shloka')}
            style={{
              marginTop: HERO_SHLOKA_TOP_SPACE,
              marginHorizontal: -20,
              marginBottom: -34,
              paddingHorizontal: 24,
              paddingTop: 12,
              paddingBottom: 34,
              alignItems: 'center',
              // PWA's transitional shloka is not a card: no rounded edge,
              // no border, no shadow. It sits on the same page background
              // that the hero readability gradient fades into.
              backgroundColor: theme.background,
            }}
          >
            <Text style={{ ...TYPE.chip, letterSpacing: 2.1, textTransform: 'uppercase', color: theme.brand }}>
              {state.sacredText.label}
            </Text>
            <Text style={{ marginTop: 10, ...TYPE.shloka, color: theme.text, textAlign: 'center' }} numberOfLines={2}>
              “{sacredTextLine}”
            </Text>
            <Text style={{ marginTop: 8, ...TYPE.homeHeroMeaning, color: theme.dim, textAlign: 'center' }} numberOfLines={1}>
              {state.sacredText.meaning}
            </Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 14, gap: 14 }}>
          <View
            style={{
              borderRadius: 26,
              padding: 18,
              backgroundColor: theme.raised,
              borderWidth: 1,
              borderColor: theme.borderSoft,
              boxShadow: theme.shadow,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.iconWell,
                }}
              >
                <Feather name={nextPracticeIcon} size={20} color={nextPracticeColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: COLORS.brandGold }}>
                  {state.nextPractice.contextLabel}
                </Text>
                <Text style={{ marginTop: 9, fontFamily: FONTS.serifBold, fontSize: 27, lineHeight: 33, color: theme.text }}>
                  {state.nextPractice.title}
                </Text>
                <Text style={{ marginTop: 8, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 21, color: theme.dim }}>
                  {state.nextPractice.suggestion}
                </Text>
              </View>
              <ProgressRing done={state.nextPractice.progress >= 1} progress={state.nextPractice.progress} color={COLORS.brandGold} track={theme.ringTrack} />
            </View>

            {state.nextPractice.nudge ? (
              <Text style={{ marginTop: 13, fontFamily: FONTS.sans, fontSize: 13, lineHeight: 20, color: theme.dim }}>
                {state.nextPractice.nudge}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={state.nextPractice.actionLabel}
              onPress={() => {
                if (state.nextPractice.progress >= 1) {
                  // Day complete — "View all practices" should show the
                  // in-page practice list, not deep-link into one practice.
                  setPracticesOpen(true);
                  return;
                }
                navigate(actionRoute);
              }}
              style={{
                marginTop: 18,
                minHeight: 52,
                borderRadius: 18,
                backgroundColor: COLORS.brandGold,
                paddingHorizontal: 18,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 16 }}>
                {state.nextPractice.actionLabel}
              </Text>
              <Feather name="arrow-right" size={18} color={COLORS.ink} />
            </Pressable>
          </View>

          <View
            style={{
              borderRadius: 18,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.borderSoft,
              overflow: 'hidden',
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: practicesOpen }}
              accessibilityLabel={practicesOpen ? 'Hide all practices' : 'View all practices'}
              onPress={() => setPracticesOpen((value) => !value)}
              style={{
                minHeight: 48,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.dim }}>
                {practicesOpen ? 'Hide all practices' : 'View all practices'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: theme.dim }}>
                  {completedCount} / {state.practices.length}
                </Text>
                <Feather name={practicesOpen ? 'chevron-up' : 'chevron-down'} size={17} color={theme.dim} />
              </View>
            </Pressable>

            {practicesOpen ? (
              <View style={{ paddingHorizontal: 8, paddingBottom: 8, gap: 7 }}>
                {state.practices.map((row) => (
                  <Pressable
                    key={row.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${row.label}, ${row.done ? 'done' : 'start'}`}
                    onPress={() => navigate(resolveNativeRoute(row.href))}
                    style={{
                      minHeight: 54,
                      borderRadius: 14,
                      paddingHorizontal: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: theme.soft,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 14,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: theme.iconWell,
                        }}
                      >
                        <Feather name={row.icon} size={17} color={row.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: theme.text }}>
                          {row.label}
                        </Text>
                        <Text style={{ marginTop: 2, fontFamily: FONTS.sans, fontSize: 12, color: theme.dim }}>
                          {row.streak && row.streak > 0 ? `${row.detail} · ${row.streak} day streak` : row.detail}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: row.done ? row.color : theme.dim }}>
                        {row.done ? 'Done' : 'Start'}
                      </Text>
                      <ProgressRing done={row.done} progress={row.progress} color={row.color} track={theme.ringTrack} />
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={state.sankalpa ? `Sankalpa, day ${state.sankalpa.day} of ${state.sankalpa.targetDays}` : 'Set your Sankalpa'}
            onPress={() => navigate('/sankalpa')}
            style={{
              minHeight: 76,
              borderRadius: 22,
              paddingHorizontal: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: theme.soft,
              borderWidth: 1,
              borderColor: theme.borderSoft,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
              <Feather name="sun" size={20} color={theme.text} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 17, color: theme.text }}>
                  {state.sankalpa ? state.sankalpa.text : 'Set your Sankalpa for this month'}
                </Text>
                {state.sankalpa ? (
                  <Text style={{ marginTop: 4, fontFamily: FONTS.sans, fontSize: 12, color: theme.dim }}>
                    Day {state.sankalpa.day} of {state.sankalpa.targetDays}
                  </Text>
                ) : null}
              </View>
            </View>
            {state.sankalpa ? (
              <ProgressRing
                done={state.sankalpa.progress >= 1}
                progress={state.sankalpa.progress}
                color={COLORS.brandGold}
                track={theme.ringTrack}
                size={30}
              />
            ) : (
              <Feather name="arrow-right" size={20} color={COLORS.brandGold} />
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${state.dharmVeer.name}, ${dharmVeerDone ? 'seva given today' : state.dharmVeer.tagline}`}
            onPress={() => navigate(resolveNativeRoute(state.dharmVeer.href))}
            style={{
              minHeight: 76,
              borderRadius: 22,
              paddingHorizontal: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.borderSoft,
              opacity: dharmVeerDone ? 0.72 : 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.iconWell,
                }}
              >
                <Feather name={dharmVeerIcon} size={19} color={dharmVeerColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: COLORS.brandGold }}>
                  Dharm Veer
                </Text>
                <Text style={{ marginTop: 3, fontFamily: FONTS.sansSemiBold, fontSize: 15, color: theme.text }}>
                  {state.dharmVeer.name}
                </Text>
                <Text style={{ marginTop: 2, fontFamily: FONTS.sans, fontSize: 12, color: theme.dim }} numberOfLines={1}>
                  {dharmVeerDone ? 'Seva given today' : state.dharmVeer.tagline}
                </Text>
              </View>
            </View>
            {dharmVeerDone ? (
              <Feather name="check-circle" size={20} color={dharmVeerColor} />
            ) : (
              <Feather name="arrow-right" size={20} color={COLORS.brandGold} />
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Panchang"
            onPress={() => navigate('/panchang')}
            style={{
              minHeight: 108,
              borderRadius: 24,
              padding: 18,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.brandGold, letterSpacing: 1.3, textTransform: 'uppercase' }}>
                  Sacred rhythm
                </Text>
                <Text style={{ marginTop: 8, fontFamily: FONTS.serifBold, fontSize: 22, color: theme.text }}>
                  {tithiPill}
                </Text>
                <Text style={{ marginTop: 6, fontFamily: FONTS.sans, fontSize: 13, lineHeight: 20, color: theme.dim }}>
                  Nakshatra {panchang.nakshatra}. Yoga {panchang.yoga}. Brahma Muhurta {panchang.brahmaMuhurta}.
                </Text>
              </View>
              {refreshing ? (
                <ActivityIndicator color={COLORS.brandGold} />
              ) : (
                <Feather name="chevron-right" size={22} color={COLORS.brandGold} />
              )}
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function HomeScreen() {
  return (
    <ErrorBoundary>
      <HomeContent />
    </ErrorBoundary>
  );
}
