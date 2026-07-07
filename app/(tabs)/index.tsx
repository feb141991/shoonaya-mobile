import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calculatePanchang } from '@sangam/panchang-engine';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';
import { apiFetch } from '@/lib/api';
import { API_BASE, COLORS, FONTS } from '@/lib/constants';
import { useScrollToTop } from '@/lib/useScrollToTop';

type PracticeId = 'japa' | 'nitya' | 'pathshala' | 'quiz' | 'dharmveer' | 'panchang';

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
    accentLight: 'rgba(197,160,89,0.14)',
  },
  panchang: {
    href: '/panchang',
    tithiLabel: 'Today’s Panchang',
    festivalLabel: null,
    vratLabel: null,
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

function getGreeting(tradition: string | null) {
  switch (tradition) {
    case 'sikh':
      return 'Waheguru Ji Ka Khalsa';
    case 'buddhist':
      return 'Namo Buddhaya';
    case 'jain':
      return 'Jai Jinendra';
    case 'hindu':
      return 'Jai Shri Ram';
    default:
      return 'Pranam';
  }
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

function mapHrefToRoute(href: string): Href {
  if (href.startsWith('/bhakti') || href.startsWith('/japa')) return '/(tabs)/bhakti';
  if (href.startsWith('/pathshala/')) return href as Href;
  if (href.startsWith('/pathshala')) return '/(tabs)/pathshala';
  if (href.startsWith('/panchang')) return '/panchang';
  if (href.startsWith('/vrat')) return '/vrat';
  if (href.startsWith('/quiz')) return '/quiz';
  if (href.startsWith('/dharm-veer')) return '/dharm-veer';
  if (href.startsWith('/nitya-karma')) return '/panchang';
  return '/(tabs)/pathshala';
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
}: {
  done: boolean;
  progress: number;
  color: string;
  track: string;
}) {
  const size = 34;
  const radius = 14;
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
      {done ? <Feather name="check" size={15} color={color} /> : null}
    </View>
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

  const scrollRef = useScrollToTop();

  const theme = useMemo(
    () => ({
      background: isDark ? COLORS.darkBg : COLORS.creamBg,
      hero: isDark ? '#1B130B' : '#F6E8CF',
      heroOverlay: isDark ? 'rgba(14,8,4,0.55)' : 'rgba(255,249,240,0.72)',
      card: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
      raised: isDark ? '#21170E' : '#FFF8EB',
      soft: isDark ? 'rgba(197,160,89,0.12)' : 'rgba(197,160,89,0.10)',
      border: isDark ? COLORS.borderDark : COLORS.borderLight,
      borderSoft: isDark ? 'rgba(197,160,89,0.18)' : 'rgba(197,160,89,0.20)',
      text: isDark ? COLORS.creamBg : COLORS.ink,
      dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
      shadow: isDark ? '0 18px 36px rgba(0, 0, 0, 0.28)' : '0 14px 28px rgba(105, 75, 35, 0.10)',
      ringTrack: isDark ? 'rgba(255,248,225,0.14)' : 'rgba(105,75,35,0.12)',
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
  const actionRoute = mapHrefToRoute(state.nextPractice.actionHref);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadHome();
    } finally {
      setRefreshing(false);
    }
  }, [loadHome]);

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
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flex: 1, paddingHorizontal: 20, paddingVertical: 18, gap: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
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
            minHeight: 358,
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 24,
            backgroundColor: theme.hero,
            overflow: 'hidden',
          }}
        >
          {heroImageUrl ? (
            <Image
              source={{ uri: heroImageUrl }}
              accessibilityIgnoresInvertColors
              style={[StyleSheet.absoluteFill, { opacity: isDark ? 0.55 : 0.68 }]}
              resizeMode="cover"
            />
          ) : null}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.heroOverlay }]} />
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 138,
              backgroundColor: isDark ? 'rgba(14,8,4,0.72)' : 'rgba(253,246,227,0.78)',
            }}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open notifications"
              style={{
                minWidth: 44,
                minHeight: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.heroOverlay,
                borderWidth: 1,
                borderColor: theme.borderSoft,
              }}
            >
              <Feather name="bell" size={18} color={theme.text} />
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {state.profile.karmaPoints > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${state.profile.karmaPoints} karma points`}
                  onPress={() => navigate('/(tabs)/profile')}
                  style={{
                    minHeight: 38,
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 5,
                    backgroundColor: 'rgba(197,160,89,0.18)',
                    borderWidth: 1,
                    borderColor: 'rgba(197,160,89,0.32)',
                  }}
                >
                  <Feather name="star" size={12} color={COLORS.brandGold} />
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.brandGold }}>
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
                  <Text style={{ fontFamily: FONTS.serifBold, fontSize: 20, color: theme.text }}>
                    {state.profile.firstName.charAt(0)}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          <View style={{ marginTop: 48 }}>
            {state.profile.city ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Feather name="map-pin" size={12} color={theme.dim} />
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: theme.dim }}>
                  {state.profile.city}
                </Text>
              </View>
            ) : null}

            <Text style={{ fontFamily: FONTS.serifBold, fontSize: 34, lineHeight: 40, color: theme.text }}>
              {getGreeting(state.profile.tradition)}, {state.profile.firstName}
            </Text>
            <Text style={{ marginTop: 8, fontFamily: FONTS.sans, fontSize: 13, color: theme.dim }}>
              {getDateLabel(state.date.iso)}
            </Text>

            <View style={{ marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open Panchang, ${tithiPill}`}
                onPress={() => navigate('/panchang')}
                style={{
                  minHeight: 36,
                  borderRadius: 18,
                  paddingHorizontal: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                  backgroundColor: theme.heroOverlay,
                  borderWidth: 1,
                  borderColor: theme.borderSoft,
                }}
              >
                <Feather name="sunrise" size={13} color={COLORS.brandGold} />
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: theme.text }}>
                  {tithiPill}
                </Text>
              </Pressable>

              {state.panchang.festivalLabel ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open Vrat calendar, ${state.panchang.festivalLabel}`}
                  onPress={() => navigate('/vrat')}
                  style={{
                    minHeight: 36,
                    borderRadius: 18,
                    paddingHorizontal: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.heroOverlay,
                    borderWidth: 1,
                    borderColor: theme.borderSoft,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: theme.text }}>
                    {state.panchang.festivalLabel}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: -38, gap: 14 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${state.sacredText.label}: ${state.sacredText.original}. ${state.sacredText.meaning}`}
            onPress={() => navigate('/(tabs)/pathshala')}
            style={{
              borderRadius: 22,
              paddingHorizontal: 20,
              paddingVertical: 18,
              alignItems: 'center',
              backgroundColor: isDark ? 'rgba(23,17,11,0.76)' : 'rgba(255,249,240,0.80)',
            }}
          >
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 2.4, textTransform: 'uppercase', color: COLORS.brandGold }}>
              {state.sacredText.label}
            </Text>
            <Text style={{ marginTop: 12, fontFamily: FONTS.serifBold, fontSize: 25, lineHeight: 33, color: theme.text, textAlign: 'center' }}>
              “{state.sacredText.original}”
            </Text>
            <Text style={{ marginTop: 10, fontFamily: FONTS.sans, fontSize: 13, lineHeight: 20, color: theme.dim, textAlign: 'center' }} numberOfLines={2}>
              {state.sacredText.meaning}
            </Text>
          </Pressable>

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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
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
              onPress={() => navigate(actionRoute)}
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
                    onPress={() => navigate(mapHrefToRoute(row.href))}
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
                          backgroundColor: isDark ? 'rgba(255,248,225,0.06)' : 'rgba(255,255,255,0.58)',
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
            accessibilityLabel={state.sankalpa ? `Open Sankalpa, day ${state.sankalpa.day} of ${state.sankalpa.targetDays}` : 'Set your Sankalpa for this month'}
            onPress={() => navigate('/(tabs)/profile')}
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
            <Feather name="arrow-right" size={20} color={COLORS.brandGold} />
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
