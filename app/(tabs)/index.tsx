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
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calculatePanchang } from '@sangam/panchang-engine';
import { fetchMoodStatus, type MoodStatus } from '@/lib/mood';
import { findMoodConfig } from '@/lib/mood-registry';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { SacredIcon, type SacredIconName } from '@/components/ui/SacredIcon';
import { IconTile } from '@/components/ui/IconTile';
import { ICON_WELL, iconWellColor } from '@/lib/icons';
import { MoodGlyph } from '@/components/mood/MoodGlyph';
import { HomeSkeleton } from '@/components/home/HomeSkeleton';
import { QuizSparkCard } from '@/components/home/QuizSparkCard';
import { BrahmaMuhurtaPrompt } from '@/components/home/BrahmaMuhurtaPrompt';
import { FirstWeekGuide } from '@/components/home/FirstWeekGuide';
import { SankalpaCard } from '@/components/home/SankalpaCard';
import { apiFetch } from '@/lib/api';
import { API_BASE, COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE } from '@/lib/constants';
import { getMyUnreadNotificationCount, subscribeToMyNotifications } from '@/lib/notificationsData';
import { navScrollHandler } from '@/lib/navScrollBus';
import { resolveNativeRoute } from '@/lib/routes';
import { useScrollToTop } from '@/lib/useScrollToTop';

type PracticeId = 'japa' | 'nitya' | 'pathshala' | 'quiz' | 'dharmveer';

// /api/native/home-summary currently sends Nitya Karma and Pathshala with
// the same green (#5aaa38), so the two rows read as indistinguishable in
// "View all practices" — PWA's own NextPracticeCard ITEM_PALETTE (the
// source of truth this list should match) gives every practice a distinct
// colour. Overriding client-side here rather than in the API route, since
// this is the one place in the app that renders per-practice colour.
const PRACTICE_COLOR: Record<PracticeId, string> = {
  japa: '#F59E4A',
  nitya: '#C5A059',
  pathshala: '#6BC47E',
  quiz: '#A594E0',
  dharmveer: '#FF8A65',
};

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
    viewedToday: boolean;
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
  // New user signal for FirstWeekGuide — mirrors the PWA's own
  // showFirstTimeGuidance formula (no shloka streak, no last-shloka-read
  // date, no guided-path progress), added to /api/native/home-summary
  // rather than re-derived from a second, native-only heuristic.
  firstWeek: boolean;
};

const HERO_MIN_HEIGHT = 420;
const HERO_READABILITY_HEIGHT = 210;

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
    icon: '📖',
    original: 'वसुधैव कुटुम्बकम्',
    transliteration: 'Vasudhaiva Kutumbakam',
    meaning: 'The whole world is one family, a reminder to act with kinship and dignity.',
    source: 'Maha Upanishad',
    accentColour: COLORS.brandGoldLight,
    accentLight: COLORS.authGoldWellBg,
  },
  panchang: {
    href: '/panchang',
    tithiLabel: 'Today’s Panchang',
    festivalLabel: null,
    vratLabel: null,
    viewedToday: false,
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
  firstWeek: false,
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

function resolveAssetUrl(url: string | null | undefined) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
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
  summary,
  theme,
  kind = 'panchang',
}: {
  panchang: { tithi: string; paksha: string; nakshatra: string; yoga: string; samvatYear: number };
  summary: HomeSummary['panchang'];
  theme: { heroOverlay: string; borderSoft: string; text: string; brand: string };
  kind?: 'panchang' | 'observance';
}) {
  const [idx, setIdx] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => sub.remove();
  }, []);

  const slides = useMemo(() => {
    const seen = new Set<string>();
    const rows: { key: string; icon: string; label: string }[] = [];
    const normalizeObservanceKey = (label: string) => label
      .replace(/^[^\p{L}\p{N}]+/u, '')
      .replace(/^(today is|tomorrow is)\s+/i, '')
      .replace(/\s+in\s+\d+\s+days$/i, '')
      .replace(/\s+today$/i, '')
      .trim()
      .toLowerCase();
    const add = (row: { key: string; icon: string; label: string; dedupeKey?: string } | null) => {
      if (!row?.label) return;
      const normalized = (row.dedupeKey ?? normalizeObservanceKey(row.label));
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      rows.push({ key: row.key, icon: row.icon, label: row.label });
    };

    if (kind === 'observance') {
      add(summary.observance ? {
        key: 'observance',
        icon: summary.observance.emoji ?? '🪔',
        label: summary.observance.label,
        dedupeKey: summary.observance.name.trim().toLowerCase(),
      } : null);
      add(summary.vratLabel ? { key: 'vrat', icon: '🪔', label: summary.vratLabel } : null);
      add(summary.festivalLabel ? { key: 'festival', icon: '🚩', label: summary.festivalLabel } : null);
      return rows;
    }

    add({ key: 'tithi', icon: '🌙', label: `${panchang.tithi} · VS ${panchang.samvatYear}` });
    add({ key: 'nakshatra', icon: '✨', label: `${panchang.nakshatra} · ${panchang.yoga}` });

    return rows;
  }, [kind, panchang.nakshatra, panchang.samvatYear, panchang.tithi, panchang.yoga, summary.festivalLabel, summary.observance, summary.vratLabel]);
  const total = slides.length;

  useEffect(() => {
    setIdx((current) => (total > 0 ? current % total : 0));
  }, [total]);

  useEffect(() => {
    // Reduced motion means calm, not just "no fade" — auto-cycling on a
    // fixed timer is itself motion the user asked to avoid. Respect that by
    // not auto-advancing at all when reduced motion is on; the pill stays on
    // one slide until the user explicitly taps (handleCycle below, which
    // already skips the animation in that case too).
    if (reducedMotion || total <= 1) {
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
    if (total <= 1) return;
    if (reducedMotion) {
      setIdx((i) => (i + 1) % total);
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
        setIdx((i) => (i + 1) % total);
        Animated.timing(fadeAnim, { toValue: 1, duration: 100, useNativeDriver: true }).start();
      });
    }
  }, [fadeAnim, reducedMotion, total]);

  if (kind === 'observance' && slides.length === 0) {
    return null;
  }

  const currentSlide = slides[idx] ?? slides[0] ?? { key: 'tithi', icon: '🌙', label: `${panchang.tithi} · VS ${panchang.samvatYear}` };
  const isObservance = kind === 'observance';

  return (
    <PressableSurface
      haptic="selection"
      accessibilityLabel={`${isObservance ? 'Sacred observance' : 'Panchang info'}: ${currentSlide.label}. Tap to cycle`}
      onPress={handleCycle}
      hitSlop={4}
      style={{
        minHeight: slides.length > 1 ? 42 : 36,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: slides.length > 1 ? 5 : 4,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        backgroundColor: isObservance ? COLORS.homePwaObservanceBg : COLORS.homePwaPillBg,
        borderWidth: isObservance ? 1 : 0,
        borderColor: COLORS.homePwaObservanceBorder,
        minWidth: 120,
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: fadeAnim }}>
        <Text style={{ fontSize: 12, lineHeight: 14 }}>{currentSlide.icon}</Text>
        <Text style={{ ...TYPE.chip, fontSize: 12, lineHeight: 15, color: isObservance ? COLORS.homePwaObservanceText : COLORS.homePwaPillText }} numberOfLines={1}>
          {currentSlide.label}
        </Text>
      </Animated.View>

      {/* Dot indicators — PWA's PanchangPill (HeroSection.tsx) shows these
          so the pill visibly reads as "tap to cycle through N things"
          instead of just looking like a static label. Colors are the warm
          cream PWA uses verbatim (rgba(255,240,200,*)) rather than
          theme-flipped — the pill always sits over the hero's darkened
          image area in both light and dark mode, same as in PWA. */}
      {slides.length > 1 ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, alignSelf: 'center' }}>
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
      ) : null}
    </PressableSurface>
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
  const [moodStatus, setMoodStatus] = useState<MoodStatus | null>(null);

  const scrollRef = useScrollToTop();

  const theme = useMemo(
    () => ({
      background: isDark ? COLORS.darkBg : COLORS.creamBg,
      hero: isDark ? COLORS.homeHeroDark : COLORS.homeHeroLight,
      heroOverlay: isDark ? COLORS.homeHeroOverlayDark : COLORS.homeHeroOverlayLight,
      card: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
      raised: isDark ? COLORS.homeRaisedDark : COLORS.homeRaisedLight,
      soft: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight,
      glass: isDark ? COLORS.premiumGlassDark : COLORS.premiumGlassLight,
      border: isDark ? COLORS.borderDark : COLORS.borderLight,
      borderSoft: isDark ? COLORS.homeBorderSoftDark : COLORS.homeBorderSoftLight,
      premiumBorder: isDark ? COLORS.premiumBorderDark : COLORS.premiumBorderLight,
      text: isDark ? COLORS.creamBg : COLORS.ink,
      dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
      shadow: isDark ? SHADOWS.heroCard.dark : SHADOWS.heroCard.light,
      ringTrack: isDark ? COLORS.homeRingTrackDark : COLORS.homeRingTrackLight,
      // PWA's brand-primary is theme-aware, not one static value: light mode
      // uses a deeper terracotta while dark mode keeps the softer gold.
      brand: isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight,
    }),
    [isDark]
  );

  const heroImageUrl = resolveAssetUrl(state.hero.imageUrl);
  const avatarImageUrl = resolveAssetUrl(state.profile.avatarUrl);
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
  const nextPracticeColor = nextPracticeRow ? PRACTICE_COLOR[nextPracticeRow.id] : theme.brand;

  // Copy mirrors PWA's getDailySadhanaCta() (HeroSection.tsx) exactly — same
  // three states (begin / continue / complete), same "Next: X · detail" and
  // "Start with X · N practices today" phrasing — so the two apps read the
  // same sentence, not just the same layout.
  const sadhanaComplete = state.nextPractice.progress >= 1;
  const traditionLabel = state.profile.tradition
    ? state.profile.tradition.charAt(0).toUpperCase() + state.profile.tradition.slice(1)
    : 'Dharma';
  const sadhanaTitle = sadhanaComplete
    ? "Today's Sadhana Complete"
    : completedCount === 0
      ? "Begin Today's Sadhana"
      : "Continue Today's Sadhana";
  const sadhanaSubtitle = sadhanaComplete
    ? `Your ${traditionLabel} rhythm is steady today · +seva earned`
    : completedCount === 0
      ? `Start with ${state.nextPractice.title} · ${state.practices.length - completedCount} practices today`
      : `Next: ${state.nextPractice.title} · ${state.nextPractice.suggestion}`;
  const sadhanaButtonLabel = sadhanaComplete ? "Today's Recap" : completedCount === 0 ? 'Begin' : 'Continue';

  const dharmVeerRow = state.practices.find((row) => row.id === 'dharmveer');
  const dharmVeerDone = dharmVeerRow?.done ?? false;
  const dharmVeerIcon = dharmVeerRow?.icon ?? 'shield';
  const dharmVeerColor = PRACTICE_COLOR.dharmveer;

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

  const hasLoadedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        if (!hasLoadedRef.current) setLoading(true);
        try {
          await loadHome();
          hasLoadedRef.current = true;
        } catch {
          setLoadError(true);
        } finally {
          setLoading(false);
        }
      };
      void run();
    }, [loadHome])
  );

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
      void fetchMoodStatus().then(setMoodStatus);
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
    void fetchMoodStatus().then(setMoodStatus);
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
        contentContainerStyle={{ paddingBottom: 128 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} />}
        showsVerticalScrollIndicator={false}
        onScroll={navScrollHandler}
        scrollEventThrottle={16}
      >
        <View
          style={{
            height: HERO_MIN_HEIGHT,
            width: '100%',
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
              style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
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
            style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
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
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: HERO_READABILITY_HEIGHT, zIndex: 1 }}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : 'Notifications'}
            onPress={() => {
              void Haptics.selectionAsync().catch(() => {});
              navigate('/notifications');
            }}
            style={{
              position: 'absolute',
              zIndex: 3,
              top: 18,
              left: 20,
              width: 48,
              height: 48,
              borderRadius: 24,
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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Check in with your mood"
            onPress={() => {
              void Haptics.selectionAsync().catch(() => {});
              navigate('/mood');
            }}
            hitSlop={4}
            style={{
              position: 'absolute',
              zIndex: 3,
              top: 22,
              right: 78,
              minHeight: 36,
              width: 180,
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
            {moodStatus?.hasLoggedMoodToday && moodStatus.lastMood ? (
              <>
                {findMoodConfig(isDark, moodStatus.lastMood) ? (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: findMoodConfig(isDark, moodStatus.lastMood)?.bg,
                    }}
                  >
                    <MoodGlyph
                      mood={moodStatus.lastMood}
                      color={findMoodConfig(isDark, moodStatus.lastMood)?.colour ?? COLORS.homePwaObservanceText}
                      size={13}
                    />
                  </View>
                ) : (
                  <Text style={{ fontSize: 12, lineHeight: 14 }}>✨</Text>
                )}
                <Text
                  style={{
                    ...TYPE.chip,
                    fontSize: 11,
                    lineHeight: 14,
                    color: findMoodConfig(isDark, moodStatus.lastMood)?.colour || COLORS.homePwaObservanceText,
                  }}
                  numberOfLines={1}
                >
                  Feeling {findMoodConfig(isDark, moodStatus.lastMood)?.label || 'Good'}
                </Text>
              </>
            ) : (
              <Text
                style={{
                  ...TYPE.chip,
                  fontSize: 11,
                  lineHeight: 14,
                  color: COLORS.homePwaObservanceText,
                }}
                numberOfLines={1}
              >
                How are you feeling?
              </Text>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => {
              void Haptics.selectionAsync().catch(() => {});
              navigate('/(tabs)/profile');
            }}
            style={{
              position: 'absolute',
              zIndex: 4,
              top: 18,
              right: 20,
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
            {avatarImageUrl ? (
              <Image source={{ uri: avatarImageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : relicImageUrl ? (
              <Image source={{ uri: relicImageUrl }} style={{ width: 34, height: 34 }} resizeMode="contain" />
            ) : (
              <Text style={{ fontFamily: FONTS.serif, fontSize: 20, lineHeight: 24, fontWeight: '700', color: theme.text }}>
                {state.profile.firstName.charAt(0)}
              </Text>
            )}
          </Pressable>

          {/* PWA (HeroSection.tsx) stacks city -> greeting -> pill with only
              mt-3/mt-1.5 between the icon row above and this block — a
              tight rhythm. This block previously used marginTop: 48, which
              is why the greeting/pills read as noticeably lower/detached
              from the bell+avatar row than PWA's version. */}
          <View style={{ position: 'absolute', zIndex: 2, top: 78, left: 20, right: 20, alignItems: 'flex-start' }}>
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

            <View style={{ marginTop: 6, alignItems: 'flex-start', gap: 6, maxWidth: '92%' }}>
              <PanchangPill panchang={panchang} summary={state.panchang} theme={theme} />
              <PanchangPill panchang={panchang} summary={state.panchang} theme={theme} kind="observance" />
            </View>
          </View>
        </View>

        <View style={{ marginTop: -46, marginBottom: 8, paddingHorizontal: 16 }}>
          <PressableSurface
            haptic="selection"
            accessibilityLabel={`${state.sacredText.label}: ${state.sacredText.original}. ${state.sacredText.meaning}. Tap to open, mark as read, and earn seva points`}
            onPress={() => navigate('/shloka')}
            style={{
              paddingHorizontal: 18,
              paddingTop: 14,
              paddingBottom: 18,
              alignItems: 'center',
              backgroundColor: isDark ? COLORS.homeShlokaGlassDark : COLORS.homeShlokaGlassLight,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderBottomLeftRadius: 10,
              borderBottomRightRadius: 10,
              borderWidth: 1,
              borderColor: isDark ? COLORS.homeShlokaGlassBorderDark : COLORS.homeShlokaGlassBorderLight,
            }}
          >
            <Text style={{ ...TYPE.chip, letterSpacing: 2.1, textTransform: 'uppercase', color: theme.brand, textAlign: 'center', alignSelf: 'center' }}>
              {state.sacredText.label}
            </Text>
            <Text
              style={{
                marginTop: 8,
                ...TYPE.shloka,
                fontSize: 17,
                lineHeight: 27,
                color: theme.text,
                textAlign: 'center',
              }}
              numberOfLines={2}
            >
              “{sacredTextLine}”
            </Text>
            <Text style={{ marginTop: 6, ...TYPE.homeHeroMeaning, color: theme.dim, opacity: 0.72, textAlign: 'center' }} numberOfLines={1}>
              {state.sacredText.meaning}
            </Text>
          </PressableSurface>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 0, gap: 12 }}>
          {/* ── Below-fold PWA-parity sections — additive only, hero above
              is untouched. Order mirrors the PWA's own HomeDashboard: a
              Brahma Muhurta prompt (skipped once japa is done today),
              first-week guidance for brand-new users, then upcoming sacred
              days — all ahead of the existing next-practice card so the
              time-sensitive nudge surfaces first, same as PWA. ── */}
          {panchang.brahmaMuhurta && panchang.sunrise ? (
            <BrahmaMuhurtaPrompt
              brahmaMuhurta={panchang.brahmaMuhurta}
              sunrise={panchang.sunrise}
              japaAlreadyDoneToday={state.practices.find((row) => row.id === 'japa')?.done ?? false}
            />
          ) : null}

          {state.firstWeek ? (
            <FirstWeekGuide tradition={state.profile.tradition} userName={state.profile.firstName} />
          ) : null}

          {/* Smart daily Sadhana CTA — mirrors PWA's HeroSection.tsx card
              exactly (same 26px radius, cream/gold gradient, 54px icon well,
              gold-gradient pill button with sparkle + chevron). PWA renders
              this identically in light and dark mode — no isDark branch on
              the source — so this card intentionally doesn't theme-switch
              either; it's a fixed "premium accent" treatment, not a themed
              surface. */}
          <PressableSurface
            haptic="selection"
            accessibilityLabel={`${sadhanaTitle}. ${sadhanaSubtitle}. ${sadhanaButtonLabel}`}
            onPress={() => {
              if (sadhanaComplete) {
                navigate('/my-progress');
                return;
              }
              navigate(actionRoute);
            }}
            style={{
              borderRadius: 26,
              paddingHorizontal: 18,
              paddingVertical: 16,
              borderWidth: 1,
              borderColor: 'rgba(205,166,92,0.28)',
              boxShadow: '0 12px 28px rgba(105,75,35,0.10), inset 0 1px 0 rgba(255,255,255,0.75)',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={['rgba(255,248,234,0.96)', 'rgba(250,236,211,0.88)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 18,
                  backgroundColor: 'rgba(217,178,105,0.18)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SacredIcon
                  name={nextPracticeRow?.id ?? 'japa'}
                  fallbackGlyph={sadhanaComplete ? 'star' : nextPracticeIcon}
                  size={26}
                  color="#a97725"
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 18, lineHeight: 22, letterSpacing: -0.2, color: '#3f2b1f' }} numberOfLines={1}>
                  {sadhanaTitle}
                </Text>
                <Text style={{ marginTop: 4, fontFamily: FONTS.sans, fontSize: 13.5, lineHeight: 17, color: 'rgba(63,43,31,0.66)' }} numberOfLines={1}>
                  {sadhanaSubtitle}
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
                borderRadius: 999,
                paddingLeft: 16,
                paddingRight: 12,
                paddingVertical: 11,
                backgroundColor: '#b6842f',
                boxShadow: '0 8px 18px rgba(160,112,39,0.28), inset 0 1px 0 rgba(255,255,255,0.35)',
              }}
            >
              <Ionicons name="sparkles" size={15} color="#fff8e8" />
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: '#fff8e8' }}>
                {sadhanaButtonLabel}
              </Text>
              <Feather name="chevron-right" size={15} color="#fff8e8" style={{ opacity: 0.65, marginLeft: -2 }} />
            </View>
          </PressableSurface>

          <View
            style={{
              borderRadius: 22,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              overflow: 'hidden',
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: practicesOpen }}
              accessibilityLabel={practicesOpen ? 'Hide all practices' : 'View all practices'}
              onPress={() => setPracticesOpen((value) => !value)}
              style={{
                minHeight: 44,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <Text style={{ ...TYPE.label, flex: 1, color: theme.dim }} numberOfLines={1}>
                {practicesOpen ? 'Hide all practices' : 'View all practices'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <Text style={{ ...TYPE.caption, fontFamily: FONTS.sansSemiBold, color: theme.dim }}>
                  {completedCount} / {state.practices.length}
                </Text>
                <Feather name={practicesOpen ? 'chevron-up' : 'chevron-down'} size={17} color={theme.dim} />
              </View>
            </Pressable>

            {practicesOpen ? (
              <View style={{ paddingHorizontal: 8, paddingBottom: 8, gap: 6 }}>
                {state.practices.map((row) => (
                  <PressableSurface
                    key={row.id}
                    accessibilityLabel={`${row.label}, ${row.done ? 'done' : 'start'}`}
                    onPress={() => navigate(resolveNativeRoute(row.href))}
                    style={{
                      minHeight: 44,
                      borderRadius: 14,
                      paddingHorizontal: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: theme.soft,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <IconTile name={row.id} fallbackGlyph={row.icon} size="sm" color={PRACTICE_COLOR[row.id]} accent={PRACTICE_COLOR[row.id]} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...TYPE.label, color: theme.text }} numberOfLines={1}>
                          {row.label}
                        </Text>
                        <Text style={{ marginTop: 1, ...TYPE.caption, color: theme.dim }} numberOfLines={1}>
                          {row.streak && row.streak > 0 ? `${row.detail} · ${row.streak} day streak` : row.detail}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ ...TYPE.chip, color: row.done ? PRACTICE_COLOR[row.id] : theme.dim }}>
                        {row.done ? 'Done' : 'Start'}
                      </Text>
                      <ProgressRing done={row.done} progress={row.progress} color={PRACTICE_COLOR[row.id]} track={theme.ringTrack} size={26} />
                    </View>
                  </PressableSurface>
                ))}
              </View>
            ) : null}
          </View>

          {/* Self-contained: fetches its own active Sankalpa + today's
              check-in status via /api/sankalpa* (not home-summary's static
              `state.sankalpa` snapshot), and refetches on every screen focus
              so a check-in made on the full /sankalpa screen shows up here
              without an app restart. See components/home/SankalpaCard.tsx. */}
          <SankalpaCard />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${state.dharmVeer.name}, ${dharmVeerDone ? 'seva given today' : state.dharmVeer.tagline}`}
            onPress={() => navigate(resolveNativeRoute(state.dharmVeer.href))}
            style={{
              minHeight: 70,
              borderRadius: 22,
              paddingHorizontal: 16,
              paddingVertical: 11,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: dharmVeerDone ? theme.soft : theme.card,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
              opacity: dharmVeerDone ? 0.72 : 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
              <IconTile name="dharmveer" fallbackGlyph={dharmVeerIcon} size="md" color={dharmVeerColor} accent={dharmVeerColor} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...TYPE.chip, letterSpacing: 1.25, textTransform: 'uppercase', color: theme.brand }}>
                  Dharm Veer
                </Text>
                <Text style={{ marginTop: 3, ...TYPE.cardHeading, color: theme.text }} numberOfLines={1}>
                  {state.dharmVeer.name}
                </Text>
                <Text style={{ marginTop: 2, ...TYPE.caption, color: theme.dim }} numberOfLines={1}>
                  {dharmVeerDone ? 'Seva given today' : state.dharmVeer.tagline}
                </Text>
              </View>
            </View>
            {dharmVeerDone ? (
              <Feather name="check-circle" size={20} color={dharmVeerColor} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    backgroundColor: theme.soft,
                    borderWidth: 1,
                    borderColor: theme.borderSoft,
                  }}
                >
                  <Text style={{ ...TYPE.micro, fontFamily: FONTS.sansSemiBold, color: theme.brand }}>+5 seva</Text>
                </View>
                <Feather name="chevron-right" size={18} color={theme.brand} />
              </View>
            )}
          </Pressable>

          <QuizSparkCard />

          <PressableSurface
            accessibilityLabel="Open Panchang"
            onPress={() => navigate('/panchang')}
            style={{
              minHeight: 102,
              borderRadius: 22,
              padding: 16,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...TYPE.chip, letterSpacing: 1.25, textTransform: 'uppercase', color: theme.brand }}>
                  Sacred rhythm
                </Text>
                <Text style={{ marginTop: 5, ...TYPE.cardHeading, color: theme.text }} numberOfLines={1}>
                  {tithiPill}
                </Text>
                <Text style={{ marginTop: 4, ...TYPE.caption, color: theme.dim }}>
                  Nakshatra {panchang.nakshatra}. Yoga {panchang.yoga}. Brahma Muhurta {panchang.brahmaMuhurta}.
                </Text>
                {state.panchang.viewedToday ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <Feather name="check-circle" size={13} color={theme.brand} />
                    <Text style={{ ...TYPE.label, color: theme.brand }}>
                      Observed today
                    </Text>
                  </View>
                ) : null}
              </View>
              {refreshing ? (
                <ActivityIndicator color={theme.brand} />
              ) : (
                <Feather name="chevron-right" size={22} color={theme.brand} />
              )}
            </View>
          </PressableSurface>

          {/* Jyotish & Panchang — these are real native routes already, but
              were hard to discover. Keep them as contextual Home access
              rather than adding a sixth bottom tab. */}
          <View style={{ marginTop: 12 }}>
            <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 12 }}>
              Jyotish & Panchang
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {([
                {
                  label: 'Panchang',
                  href: '/panchang',
                  icon: '📅',
                  sacredId: 'panchang' as SacredIconName,
                  fallbackGlyph: 'calendar' as const,
                },
                {
                  label: 'Rashiphal',
                  href: '/rashiphala',
                  icon: '🔮',
                  sacredId: null,
                  fallbackGlyph: 'star' as const,
                },
                {
                  label: 'Kundali',
                  href: '/kundali',
                  icon: '🌌',
                  sacredId: null,
                  fallbackGlyph: 'circle' as const,
                },
              ]).map((item) => (
                <PressableSurface
                  key={item.label}
                  accessibilityLabel={item.label}
                  onPress={() => navigate(item.href as Href)}
                  style={{
                    flex: 1,
                    minHeight: 136,
                    borderRadius: 22,
                    paddingVertical: 16,
                    paddingHorizontal: 8,
                    backgroundColor: theme.glass,
                    borderWidth: 1,
                    borderColor: theme.premiumBorder,
                    boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View style={{ marginBottom: 9 }}>
                    {item.sacredId && item.fallbackGlyph ? (
                      <IconTile name={item.sacredId} fallbackGlyph={item.fallbackGlyph} size="xl" color={theme.brand} />
                    ) : (
                      <View
                        style={{
                          width: ICON_WELL.xl.box,
                          height: ICON_WELL.xl.box,
                          borderRadius: ICON_WELL.xl.radius,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: iconWellColor(isDark).bg,
                          borderWidth: 1,
                          borderColor: iconWellColor(isDark).border,
                        }}
                      >
                        <Text style={{ fontSize: 58, lineHeight: 66 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                          {item.icon}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ ...TYPE.label, color: theme.text, textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                    {item.label}
                  </Text>
                </PressableSurface>
              ))}
            </View>
          </View>

          {/* Quick Actions Row */}
          <View style={{ marginTop: 12 }}>
            <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 12 }}>Sadhana</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {([
                { label: 'Nitya',    href: '/nitya-karma', icon: '🧘', sacredId: 'nitya' as SacredIconName,    fallbackGlyph: 'sunrise' as const,     accent: COLORS.tileGold,   bg: isDark ? COLORS.tileGoldBgDark   : COLORS.tileGoldBgLight,   border: COLORS.tileGoldBorder },
                { label: 'Quiz',     href: '/quiz',        icon: '🧠', sacredId: 'quiz' as SacredIconName,     fallbackGlyph: 'help-circle' as const, accent: COLORS.tilePurple, bg: isDark ? COLORS.tilePurpleBgDark : COLORS.tilePurpleBgLight, border: COLORS.tilePurpleBorder },
                { label: 'AI Guide', href: '/ai-chat',     icon: '✨', sacredId: null,                         fallbackGlyph: null,                   accent: COLORS.tileViolet, bg: isDark ? COLORS.tileVioletBgDark : COLORS.tileVioletBgLight, border: COLORS.tileVioletBorder },
                { label: 'Progress', href: '/my-progress', icon: '📊', sacredId: null,                         fallbackGlyph: null,                   accent: COLORS.tileGreen,  bg: isDark ? COLORS.tileGreenBgDark  : COLORS.tileGreenBgLight,  border: COLORS.tileGreenBorder },
              ]).map(item => (
                <PressableSurface
                  key={item.label}
                  accessibilityLabel={item.label}
                  onPress={() => navigate(item.href as Href)}
                  pressedStyle={{ transform: [{ scale: 0.94 }] }}
	                  style={{
	                    alignItems: 'center',
	                    justifyContent: 'center',
	                    backgroundColor: item.bg,
	                    borderRadius: 22,
	                    paddingVertical: 16,
	                    minWidth: 132,
	                    minHeight: 138,
	                    borderWidth: 1,
	                    borderColor: item.border,
	                  }}
	                >
	                  {item.sacredId && item.fallbackGlyph ? (
	                    <View style={{ marginBottom: 10, height: 76, justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
	                      <SacredIcon name={item.sacredId} fallbackGlyph={item.fallbackGlyph} size={72} color={item.accent} />
	                    </View>
	                  ) : (
	                    <Text style={{ fontSize: 68, lineHeight: 76, marginBottom: 10 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{item.icon}</Text>
	                  )}
                  <Text style={{ ...TYPE.caption, fontFamily: FONTS.sansSemiBold, color: theme.text, textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                    {item.label}
                  </Text>
                </PressableSurface>
              ))}
            </ScrollView>
          </View>

          {/* Community Row */}
          <View style={{ marginTop: 12, marginBottom: 12 }}>
            <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 12 }}>Community</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {([
                { label: 'Live Darshan', href: '/live-darshan',    icon: '📡', sacredId: 'live-darshan' as SacredIconName, fallbackGlyph: 'radio' as const, accent: COLORS.tileBlue,   bg: isDark ? COLORS.tileBlueBgDark   : COLORS.tileBlueBgLight,   border: COLORS.tileBlueBorder },
                { label: 'Mandali',      href: '/(tabs)/mandali',  icon: '👥', sacredId: 'mandali' as SacredIconName,      fallbackGlyph: 'users' as const, accent: COLORS.tilePurple, bg: isDark ? COLORS.tilePurpleBgDark : COLORS.tilePurpleBgLight, border: COLORS.tilePurpleBorder },
                // Tirtha (app/(tabs)/tirtha.tsx) is a real, complete screen —
                // nearby-temple map, save/check-in, passport — that was a
                // hidden tab (href: null in _layout.tsx) with no entry point
                // anywhere in the app. This card is the fix; the tab stays
                // hidden (tab bar hierarchy is out of scope here). Not in
                // this task's required SacredIconName list, so it stays on
                // its emoji glyph rather than growing the union unasked.
                { label: 'Tirtha',      href: '/(tabs)/tirtha',    icon: '🛕', sacredId: null,                              fallbackGlyph: null,             accent: COLORS.tileCoral,  bg: isDark ? COLORS.tileCoralBgDark  : COLORS.tileCoralBgLight,  border: COLORS.tileCoralBorder },
                { label: 'Seva',        href: '/my-progress',      icon: '🤲', sacredId: null,                              fallbackGlyph: null,             accent: COLORS.tileGreen,  bg: isDark ? COLORS.tileGreenBgDark  : COLORS.tileGreenBgLight,  border: COLORS.tileGreenBorder },
              ]).map(item => (
                <PressableSurface
                  key={item.label}
                  accessibilityLabel={item.label}
                  onPress={() => navigate(item.href as Href)}
                  pressedStyle={{ transform: [{ scale: 0.94 }] }}
	                  style={{
	                    alignItems: 'center',
	                    justifyContent: 'center',
	                    backgroundColor: item.bg,
	                    borderRadius: 22,
	                    paddingVertical: 16,
	                    minWidth: 132,
	                    minHeight: 138,
	                    borderWidth: 1,
	                    borderColor: item.border,
	                  }}
	                >
	                  {item.sacredId && item.fallbackGlyph ? (
	                    <View style={{ marginBottom: 10, height: 76, justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
	                      <SacredIcon name={item.sacredId} fallbackGlyph={item.fallbackGlyph} size={72} color={item.accent} />
	                    </View>
	                  ) : (
	                    <Text style={{ fontSize: 68, lineHeight: 76, marginBottom: 10 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{item.icon}</Text>
	                  )}
                  <Text style={{ ...TYPE.caption, fontFamily: FONTS.sansSemiBold, color: theme.text, textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                    {item.label}
                  </Text>
                </PressableSurface>
              ))}
            </ScrollView>
          </View>

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
