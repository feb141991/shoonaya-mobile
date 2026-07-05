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
  full_name: string;
  username: string;
  tradition: string | null;
  active_symbol_id: string | null;
};

type HomeState = {
  name: string;
  tradition: string | null;
  relicImageUrl: string | null;
  suggestion: string;
  nudge: string;
  contextLabel: string;
  actionLabel: string;
  actionHref: string;
};

const INITIAL_STATE: HomeState = {
  name: 'Seeker',
  tradition: 'hindu',
  relicImageUrl: null,
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

function mapHrefToRoute(href: string): string {
  if (href.startsWith('/bhakti') || href.startsWith('/japa')) return '/(tabs)/bhakti';
  if (href.startsWith('/pathshala')) return '/(tabs)/pathshala';
  if (href.startsWith('/panchang')) return '/panchang';
  if (href.startsWith('/vrat')) return '/vrat';
  if (href.startsWith('/quiz')) return '/quiz';
  return '/(tabs)/pathshala';
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

    // Parallel fetch: Profile from Supabase & Personalise from API
    const profileQuery = supabase
      .from('profiles')
      .select('full_name, username, tradition, active_symbol_id')
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

  if (loading) {
    return (
      <Screen style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: theme.background, gap: 16 }}>
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
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 24 }}
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

        <Card style={{ backgroundColor: theme.card, borderColor: theme.border, padding: 24 }}>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.brandGold, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            {state.contextLabel}
          </Text>
          <Text style={{ marginTop: 14, fontFamily: FONTS.serifBold, fontSize: 28, lineHeight: 36, color: theme.text }}>
            {state.suggestion}
          </Text>
          {state.nudge ? (
            <Text style={{ marginTop: 12, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 22, color: theme.dim }}>
              {state.nudge}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={state.actionLabel}
            onPress={() => {
              try { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
              router.push(mapHrefToRoute(state.actionHref) as any);
            }}
            style={{
              marginTop: 24,
              borderRadius: 18,
              backgroundColor: COLORS.brandGold,
              paddingVertical: 16,
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
