import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';
import { apiFetch } from '@/lib/api';
import { API_BASE, COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useScrollToTop } from '@/lib/useScrollToTop';

type DigestResponse = {
  headline?: string;
  body?: string;
  fact?: string;
  action?: {
    label?: string;
    href?: string;
    type?: string;
  };
};

type ProfileRow = {
  full_name: string;
  username: string;
  tradition: string | null;
  seva_score: number;
  active_symbol_id: string | null;
};

type DailySadhanaRow = {
  streak_count: number | null;
  shloka_done?: boolean | null;
  japa_done?: boolean | null;
  quiz_done?: boolean | null;
};

type GuidedPathProgressRow = {
  status: 'active' | 'dismissed' | 'completed';
};

type HomeState = {
  name: string;
  tradition: string | null;
  streak: number;
  sevaScore: number;
  relicImageUrl: string | null;
  shlokaText: string;
  shlokaMeaning: string;
  shlokaSource: string;
  shlokaDone: boolean;
  japaDone: boolean;
  quizDone: boolean;
  nextRelicProgressPct: number;
  nextRelicDaysRemaining: number;
};

const INITIAL_STATE: HomeState = {
  name: 'Seeker',
  tradition: 'hindu',
  streak: 0,
  sevaScore: 0,
  relicImageUrl: null,
  shlokaText: 'No sacred verse available yet.',
  shlokaMeaning: 'Your daily verse will appear here once the digest is available.',
  shlokaSource: 'Daily Digest',
  shlokaDone: false,
  japaDone: false,
  quizDone: false,
  nextRelicProgressPct: 0,
  nextRelicDaysRemaining: 3,
};

const GREETINGS: Record<string, string> = {
  hindu: 'Jai Shri Ram',
  sikh: 'Waheguru Ji Ka Khalsa',
  buddhist: 'Namo Buddhaya',
  jain: 'Jai Jinendra',
};

const SANSKRIT_WEEKDAYS = ['Ravivara', 'Somavara', 'Mangalavara', 'Budhavara', 'Guruvāra', 'Shukravara', 'Shanivara'];

const RELICS: Array<{ id: string; imageUrl: string; milestoneDays: number }> = [
  { id: 'diya-bronze', imageUrl: '/relics/diya-bronze.png', milestoneDays: 3 },
  { id: 'clay-kalash', imageUrl: '/relics/clay-kalash.png', milestoneDays: 5 },
  { id: 'incense-sandalwood', imageUrl: '/relics/incense.png', milestoneDays: 7 },
  { id: 'camphor-flame', imageUrl: '/relics/camphor.png', milestoneDays: 10 },
  { id: 'mindful-bell', imageUrl: '/relics/bell.png', milestoneDays: 14 },
  { id: 'copper-lota', imageUrl: '/relics/copper-lota.png', milestoneDays: 30 },
];

function getGreeting(tradition: string | null) {
  return GREETINGS[tradition ?? 'hindu'] ?? 'Pranam';
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
  if (!activeSymbolId) {
    return null;
  }

  const relic = RELICS.find((entry) => entry.id === activeSymbolId);
  return relic ? `${API_BASE}${relic.imageUrl}` : null;
}

function getNextRelicState(streak: number) {
  const nextRelic = RELICS.find((entry) => streak < entry.milestoneDays);

  if (!nextRelic) {
    return {
      nextRelicProgressPct: 100,
      nextRelicDaysRemaining: 0,
    };
  }

  return {
    nextRelicProgressPct: Math.max(0, Math.min(100, Math.round((streak / nextRelic.milestoneDays) * 100))),
    nextRelicDaysRemaining: Math.max(0, nextRelic.milestoneDays - streak),
  };
}

function normalizeDigest(data: DigestResponse | null) {
  if (!data) {
    return {
      shlokaText: INITIAL_STATE.shlokaText,
      shlokaMeaning: INITIAL_STATE.shlokaMeaning,
      shlokaSource: INITIAL_STATE.shlokaSource,
    };
  }

  return {
    shlokaText: data.headline ?? INITIAL_STATE.shlokaText,
    shlokaMeaning: data.body ?? INITIAL_STATE.shlokaMeaning,
    shlokaSource: data.action?.label ?? 'Daily Digest',
  };
}

function HomeContent() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [state, setState] = useState<HomeState>(INITIAL_STATE);
  const [loadError, setLoadError] = useState(false);

  const scrollRef = useScrollToTop();

  const theme = useMemo(
    () => ({
      background: isDark ? COLORS.darkBg : COLORS.creamBg,
      card: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
      border: isDark ? COLORS.borderDark : COLORS.borderLight,
      text: isDark ? COLORS.creamBg : COLORS.ink,
      dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
      pillText: isDark ? COLORS.creamBg : COLORS.ink,
    }),
    [isDark]
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

    const homeResponse = await apiFetch('/api/home').catch(() => null);

    if (homeResponse?.ok) {
      const payload = (await homeResponse.json()) as Partial<HomeState>;
      setState((prev) => ({
        ...prev,
        ...payload,
      }));
      return;
    }

    const profileQuery = supabase
      .from('profiles')
      .select('full_name, username, tradition, seva_score, active_symbol_id')
      .eq('id', user.id)
      .single();

    const sadhanaQuery = supabase
      .from('daily_sadhana')
      .select('streak_count, shloka_done, japa_done, quiz_done')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const pathProgressQuery = supabase
      .from('guided_path_progress')
      .select('status')
      .eq('user_id', user.id);

    const digestQuery = apiFetch('/api/digest/today')
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as DigestResponse;
      })
      .catch(() => null);

    const [profileResult, sadhanaResult, pathProgressResult, digestResult] = await Promise.all([
      profileQuery,
      sadhanaQuery,
      pathProgressQuery,
      digestQuery,
    ]);

    const profile = profileResult.data as ProfileRow | null;
    const daily = sadhanaResult.data as DailySadhanaRow | null;
    const pathProgress = (pathProgressResult.data ?? []) as GuidedPathProgressRow[];

    const streak = daily?.streak_count ?? 0;
    const nextRelic = getNextRelicState(streak);
    const digest = normalizeDigest(digestResult);

    setState({
      name: profile?.full_name || profile?.username || 'Seeker',
      tradition: profile?.tradition ?? 'hindu',
      streak,
      sevaScore: profile?.seva_score ?? 0,
      relicImageUrl: getRelicImage(profile?.active_symbol_id ?? null),
      shlokaText: digest.shlokaText,
      shlokaMeaning: digest.shlokaMeaning,
      shlokaSource: digest.shlokaSource,
      shlokaDone: Boolean(daily?.shloka_done),
      japaDone: Boolean(daily?.japa_done),
      quizDone: Boolean(daily?.quiz_done),
      nextRelicProgressPct: nextRelic.nextRelicProgressPct,
      nextRelicDaysRemaining: nextRelic.nextRelicDaysRemaining,
    });

    void pathProgress;
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

  const checklist = [
    { key: 'shloka', label: 'Shloka', done: state.shlokaDone, route: '/pathshala' as const },
    { key: 'japa', label: 'Japa', done: state.japaDone, route: '/bhakti' as const },
    { key: 'quiz', label: 'Quiz', done: state.quizDone, route: '/profile' as const },
  ];

  if (loading) {
    return (
      <Screen style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: theme.background, gap: 16 }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen style={{ backgroundColor: theme.background, justifyContent: 'center' }}>
        <EmptyState
          icon="wifi-off"
          title="Could not load home"
          subtitle="Check your connection and try again."
          ctaLabel="Retry"
          onCta={() => { void onRefresh(); }}
        />
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingHorizontal: 0, paddingVertical: 0, backgroundColor: theme.background }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brandGold} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontFamily: FONTS.serifBold, fontSize: 31, color: theme.text }}>
              {getGreeting(state.tradition)}, {state.name}
            </Text>
            <Text style={{ marginTop: 6, fontFamily: FONTS.sans, fontSize: 13, color: theme.dim }}>
              {getDateLabel(new Date())}
            </Text>
          </View>
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 20,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {state.relicImageUrl ? (
              <Image source={{ uri: state.relicImageUrl }} style={{ width: 42, height: 42 }} resizeMode="contain" />
            ) : (
              <Feather name="star" size={22} color={COLORS.brandGold} />
            )}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View
            style={{
              flex: 1,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 16 }}>🔥</Text>
            <Text style={{ color: theme.pillText, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>
              {state.streak} day streak
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 16 }}>⭐</Text>
            <Text style={{ color: theme.pillText, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>
              {state.sevaScore} seva points
            </Text>
          </View>
        </View>

        <Card style={{ backgroundColor: theme.card, borderColor: theme.border }}>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: COLORS.brandGold, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Today&apos;s Shloka
          </Text>
          <Text style={{ marginTop: 12, fontFamily: FONTS.serifBold, fontSize: 28, lineHeight: 36, color: theme.text }}>
            {state.shlokaText}
          </Text>
          <Text style={{ marginTop: 12, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 22, color: theme.dim }}>
            {state.shlokaMeaning}
          </Text>
          <Text style={{ marginTop: 12, fontFamily: FONTS.sansMedium, fontSize: 12, color: COLORS.brandGold }}>
            {state.shlokaSource}
          </Text>
        </Card>

        <Card style={{ backgroundColor: theme.card, borderColor: theme.border }}>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: COLORS.brandGold, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Sadhana Checklist
          </Text>
          <View style={{ marginTop: 10, gap: 10 }}>
            {checklist.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => {
                  try { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  router.push(item.route);
                }}
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 15 }}>{item.label}</Text>
                {item.done ? (
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: COLORS.brandGold,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Feather name="check" size={14} color={COLORS.ink} />
                  </View>
                ) : (
                  <Feather name="chevron-right" size={18} color={theme.dim} />
                )}
              </Pressable>
            ))}
          </View>
        </Card>

        <Card style={{ backgroundColor: theme.card, borderColor: theme.border }}>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: COLORS.brandGold, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Next Relic Progress
          </Text>
          <View
            style={{
              marginTop: 14,
              height: 10,
              borderRadius: 999,
              backgroundColor: theme.background,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${state.nextRelicProgressPct}%`,
                height: '100%',
                borderRadius: 999,
                backgroundColor: COLORS.brandGold,
              }}
            />
          </View>
          <Text style={{ marginTop: 12, color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
            {state.nextRelicDaysRemaining === 0 ? 'Your next relic is ready to equip.' : `${state.nextRelicDaysRemaining} more days`}
          </Text>
          <Text style={{ marginTop: 4, color: theme.dim, fontFamily: FONTS.sans, fontSize: 13 }}>
            {state.nextRelicDaysRemaining === 0
              ? 'Open your relic treasury and equip the next sacred symbol.'
              : 'Stay steady. Your next Kosh unlock comes with consistent daily practice.'}
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

export default function HomeScreen() {
  return (
    <ErrorBoundary>
      <HomeContent />
    </ErrorBoundary>
  );
}
