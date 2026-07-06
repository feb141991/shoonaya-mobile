import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';
import { apiFetch } from '@/lib/api';
import { API_BASE, COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useScrollToTop } from '@/lib/useScrollToTop';

type PersonaliseResponse = {
  suggestion: string;
  nudge?: string;
  context_label?: string;
  action?: {
    label: string;
    href: string;
    type?: string;
  };
};

type ProfileRow = {
  full_name: string | null;
  username: string | null;
  tradition: string | null;
  active_symbol_id: string | null;
  city: string | null;
  karma_points: number | null;
};

type HomeState = {
  name: string;
  tradition: string | null;
  relicImageUrl: string | null;
  city: string;
  karmaPoints: number;
  suggestion: string;
  nudge: string;
  contextLabel: string;
  actionLabel: string;
  actionHref: string;
};

type PracticeRow = {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  detail: string;
  href: Href;
  done: boolean;
  progress: number;
  color: string;
};

const INITIAL_STATE: HomeState = {
  name: 'Seeker',
  tradition: 'hindu',
  relicImageUrl: null,
  city: '',
  karmaPoints: 0,
  suggestion: 'Continue your practice to quiet the mind.',
  nudge: 'Consistency builds the strongest foundation.',
  contextLabel: "Today's practice",
  actionLabel: 'Go to Pathshala',
  actionHref: '/pathshala',
};

const GREETINGS: Record<string, string> = {
  hindu: 'Jai Shri Ram',
  sikh: 'Waheguru Ji Ka Khalsa',
  buddhist: 'Namo Buddhaya',
  jain: 'Jai Jinendra',
};

const VERSE_BY_TRADITION: Record<string, { label: string; text: string; meaning: string }> = {
  hindu: {
    label: "Today's Verse",
    text: 'वसुधैव कुटुम्बकम्',
    meaning: 'The whole world is one family, a reminder to act with kinship and dignity.',
  },
  sikh: {
    label: "Today's Shabad",
    text: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ',
    meaning: 'There is One Reality, remembered through truthful living and service.',
  },
  buddhist: {
    label: "Today's Reflection",
    text: 'Buddham sharanam gacchami',
    meaning: 'Return to wakefulness, compassion, and the path of practice.',
  },
  jain: {
    label: "Today's Reflection",
    text: 'अहिंसा परमो धर्मः',
    meaning: 'Non-harm is the highest discipline, beginning with thought, word, and action.',
  },
};

const SANSKRIT_WEEKDAYS = ['Ravivara', 'Somavara', 'Mangalavara', 'Budhavara', 'Guruvāra', 'Shukravara', 'Shanivara'];

const RELICS: Array<{ id: string; imageUrl: string }> = [
  { id: 'diya-bronze', imageUrl: '/relics/diya-bronze.png' },
  { id: 'clay-kalash', imageUrl: '/relics/clay-kalash.png' },
  { id: 'incense-sandalwood', imageUrl: '/relics/incense.png' },
  { id: 'camphor-flame', imageUrl: '/relics/camphor.png' },
  { id: 'mindful-bell', imageUrl: '/relics/bell.png' },
  { id: 'copper-lota', imageUrl: '/relics/copper-lota.png' },
];

function getGreeting(tradition: string | null) {
  return GREETINGS[tradition ?? 'hindu'] ?? 'Pranam';
}

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'Seeker';
}

function getDateLabel(date: Date) {
  const english = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  const sanskritWeekday = SANSKRIT_WEEKDAYS[date.getDay()] ?? 'Dina';
  return `${sanskritWeekday} · ${english}`;
}

function getRelicImage(activeSymbolId: string | null) {
  if (!activeSymbolId) return null;
  const relic = RELICS.find((entry) => entry.id === activeSymbolId);
  return relic ? `${API_BASE}${relic.imageUrl}` : null;
}

function mapHrefToRoute(href: string): Href {
  if (href.startsWith('/bhakti') || href.startsWith('/japa')) return '/(tabs)/bhakti';
  if (href.startsWith('/pathshala')) return '/(tabs)/pathshala';
  if (href.startsWith('/panchang')) return '/panchang';
  if (href.startsWith('/vrat')) return '/vrat';
  if (href.startsWith('/quiz')) return '/quiz';
  if (href.startsWith('/dharm-veer')) return '/dharm-veer';
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
  const [state, setState] = useState<HomeState>(INITIAL_STATE);
  const [loadError, setLoadError] = useState(false);
  const [practicesOpen, setPracticesOpen] = useState(false);

  const scrollRef = useScrollToTop();

  const theme = useMemo(
    () => ({
      background: isDark ? COLORS.darkBg : COLORS.creamBg,
      hero: isDark ? '#1B130B' : '#F6E8CF',
      heroOverlay: isDark ? 'rgba(14,8,4,0.55)' : 'rgba(255,249,240,0.64)',
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

  const verse = VERSE_BY_TRADITION[state.tradition ?? 'hindu'] ?? VERSE_BY_TRADITION.hindu;

  const practiceRows = useMemo<PracticeRow[]>(
    () => [
      {
        id: 'japa',
        icon: 'circle',
        label: 'Japa Mala',
        detail: 'Begin your mala',
        href: '/(tabs)/bhakti',
        done: false,
        progress: 0,
        color: '#F59E4A',
      },
      {
        id: 'pathshala',
        icon: 'book-open',
        label: 'Pathshala',
        detail: 'Study scripture',
        href: '/(tabs)/pathshala',
        done: false,
        progress: 0,
        color: COLORS.success,
      },
      {
        id: 'quiz',
        icon: 'help-circle',
        label: 'Daily Quiz',
        detail: 'Test your dharmic memory',
        href: '/quiz',
        done: false,
        progress: 0,
        color: '#A594E0',
      },
      {
        id: 'dharmveer',
        icon: 'shield',
        label: 'Dharm Veer',
        detail: 'Remember a life of courage',
        href: '/dharm-veer',
        done: false,
        progress: 0,
        color: '#FF8A65',
      },
      {
        id: 'panchang',
        icon: 'sunrise',
        label: 'Panchang',
        detail: 'Today’s sacred rhythm',
        href: '/panchang',
        done: false,
        progress: 0,
        color: COLORS.brandGold,
      },
    ],
    []
  );

  const loadHome = useCallback(async () => {
    setLoadError(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setState(INITIAL_STATE);
      return;
    }

    const profileQuery = supabase
      .from('profiles')
      .select('full_name, username, tradition, active_symbol_id, city, karma_points')
      .eq('id', user.id)
      .single();

    const personaliseQuery = apiFetch('/api/home/personalise')
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as PersonaliseResponse;
      })
      .catch(() => null);

    const [profileRes, personaliseRes] = await Promise.all([profileQuery, personaliseQuery]);
    const profile = profileRes.data as ProfileRow | null;

    setState({
      name: profile?.full_name || profile?.username || 'Seeker',
      tradition: profile?.tradition ?? 'hindu',
      relicImageUrl: getRelicImage(profile?.active_symbol_id ?? null),
      city: profile?.city ?? '',
      karmaPoints: profile?.karma_points ?? 0,
      suggestion: personaliseRes?.suggestion ?? INITIAL_STATE.suggestion,
      nudge: personaliseRes?.nudge ?? INITIAL_STATE.nudge,
      contextLabel: personaliseRes?.context_label ?? INITIAL_STATE.contextLabel,
      actionLabel: personaliseRes?.action?.label ?? INITIAL_STATE.actionLabel,
      actionHref: personaliseRes?.action?.href ?? INITIAL_STATE.actionHref,
    });
  }, []);

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

  const actionRoute = mapHrefToRoute(state.actionHref);
  const completedCount = practiceRows.filter((row) => row.done).length;

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
            minHeight: 332,
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 24,
            backgroundColor: theme.hero,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: -70,
              right: -70,
              width: 220,
              height: 220,
              borderRadius: 110,
              backgroundColor: isDark ? 'rgba(197,160,89,0.18)' : 'rgba(255,255,255,0.48)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: -50,
              bottom: -75,
              width: 190,
              height: 190,
              borderRadius: 95,
              backgroundColor: isDark ? 'rgba(255,248,225,0.05)' : 'rgba(197,160,89,0.13)',
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
              {state.karmaPoints > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${state.karmaPoints} karma points`}
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
                    {formatKarma(state.karmaPoints)}
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
                {state.relicImageUrl ? (
                  <Image source={{ uri: state.relicImageUrl }} style={{ width: 34, height: 34 }} resizeMode="contain" />
                ) : (
                  <Text style={{ fontFamily: FONTS.serifBold, fontSize: 20, color: theme.text }}>
                    {getFirstName(state.name).charAt(0)}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          <View style={{ marginTop: 46 }}>
            {state.city ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Feather name="map-pin" size={12} color={theme.dim} />
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: theme.dim }}>
                  {state.city}
                </Text>
              </View>
            ) : null}

            <Text style={{ fontFamily: FONTS.serifBold, fontSize: 34, lineHeight: 40, color: theme.text }}>
              {getGreeting(state.tradition)}, {getFirstName(state.name)}
            </Text>
            <Text style={{ marginTop: 8, fontFamily: FONTS.sans, fontSize: 13, color: theme.dim }}>
              {getDateLabel(new Date())}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: -44, gap: 14 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${verse.label}: ${verse.text}. ${verse.meaning}`}
            onPress={() => navigate('/(tabs)/pathshala')}
            style={{
              borderRadius: 26,
              paddingHorizontal: 20,
              paddingVertical: 18,
              alignItems: 'center',
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              boxShadow: theme.shadow,
            }}
          >
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 2.4, textTransform: 'uppercase', color: COLORS.brandGold }}>
              {verse.label}
            </Text>
            <Text style={{ marginTop: 12, fontFamily: FONTS.serifBold, fontSize: 25, lineHeight: 33, color: theme.text, textAlign: 'center' }}>
              “{verse.text}”
            </Text>
            <Text style={{ marginTop: 10, fontFamily: FONTS.sans, fontSize: 13, lineHeight: 20, color: theme.dim, textAlign: 'center' }} numberOfLines={2}>
              {verse.meaning}
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
                  Next Practice
                </Text>
                <Text style={{ marginTop: 9, fontFamily: FONTS.serifBold, fontSize: 27, lineHeight: 33, color: theme.text }}>
                  {state.contextLabel}
                </Text>
                <Text style={{ marginTop: 8, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 21, color: theme.dim }}>
                  {state.suggestion}
                </Text>
              </View>
              <ProgressRing done={false} progress={0.2} color={COLORS.brandGold} track={theme.ringTrack} />
            </View>

            {state.nudge ? (
              <Text style={{ marginTop: 13, fontFamily: FONTS.sans, fontSize: 13, lineHeight: 20, color: theme.dim }}>
                {state.nudge}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={state.actionLabel}
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
                {state.actionLabel}
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
                  {completedCount} / {practiceRows.length}
                </Text>
                <Feather name={practicesOpen ? 'chevron-up' : 'chevron-down'} size={17} color={theme.dim} />
              </View>
            </Pressable>

            {practicesOpen ? (
              <View style={{ paddingHorizontal: 8, paddingBottom: 8, gap: 7 }}>
                {practiceRows.map((row) => (
                  <Pressable
                    key={row.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${row.label}, ${row.done ? 'done' : 'start'}`}
                    onPress={() => navigate(row.href)}
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
                          {row.detail}
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
            accessibilityLabel="Set your Sankalpa for this month"
            onPress={() => navigate('/(tabs)/profile')}
            style={{
              minHeight: 68,
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
              <Text style={{ flex: 1, fontFamily: FONTS.sansSemiBold, fontSize: 17, color: theme.text }}>
                Set your Sankalpa for this month
              </Text>
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
                  Open today’s Panchang
                </Text>
                <Text style={{ marginTop: 6, fontFamily: FONTS.sans, fontSize: 13, lineHeight: 20, color: theme.dim }}>
                  Check tithi, vrat, and sacred timing before you plan the day.
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
