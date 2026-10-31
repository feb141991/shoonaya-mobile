import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter, type Href } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Screen } from '@/components/ui/Screen';
import { SacredLoader } from '@/components/ui/SacredLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET, TYPE, themeColor } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { useAppIdentity } from '@/lib/appIdentity';
import { setGuestMode } from '@/lib/guestSession';
import {
  malaSessionDurationSeconds,
  malaSessionRounds,
  malaSessionBeads,
  type MalaSessionRow,
} from '@/lib/mala-sessions';

// Featherweight Celestial Components
import { UnboxedHeroRelic } from '@/components/progress/UnboxedHeroRelic';
import { HairlineWeekThread } from '@/components/progress/HairlineWeekThread';
import { HairlineMetricsRow } from '@/components/progress/HairlineMetricsRow';
import { SlenderNeedlesChart } from '@/components/progress/SlenderNeedlesChart';
import { PrecisionAstrolabeDial } from '@/components/progress/PrecisionAstrolabeDial';
import { FeatherweightSheet } from '@/components/progress/FeatherweightSheet';
import { VrataTrackCard } from '@/components/progress/VrataTrackCard';

const PROGRESS_CACHE_KEY = 'shoonaya_progress_cache_v2';

type ProgressApiResponse = {
  profile: ProfileRow | null;
  malaSessions30d: MalaSessionRow[];
  nityaLog182d: NityaLogRow[];
  sadhana182d: SadhanaRow[];
  totalJapaSessions: number;
  karmaLedger30d: KarmaLedgerRow[];
  quizResponses30d: QuizResponseRow[];
  vratObservations?: Array<{ id: string; occurrence_date: string; vrat_id: string; vrat_name: string | null }>;
  totalVratsObserved?: number;
};

type SadhanaRow = {
  date: string;
  japa_done: boolean | null;
  quiz_done: boolean | null;
  pathshala_done: boolean | null;
  dharmveer_done: boolean | null;
  streak_count: number | null;
};
type NityaLogRow = { log_date: string };
type KarmaLedgerRow = { reason: string | null; amount: number | null };
type QuizResponseRow = { date: string; is_correct: boolean | null };
type ProfileRow = { full_name: string | null; username: string | null; karma_points: number | null };

type HeatmapDay = { date: string; japa: boolean; nitya: boolean };

type ProgressData = {
  profile: ProfileRow | null;
  heatmap: HeatmapDay[];
  karma30dTotal: number;
  japa30dSessions: number;
  japa30dRounds: number;
  japa30dMins: number;
  japa30dBeads: number;
  quiz30dTotal: number;
  quiz30dCorrect: number;
  totalJapaSessions: number;
  streak: number;
  dowCounts: number[];
  harmonyScore: number;
  totalVratsObserved: number;
  vratObservations: Array<{ id: string; occurrence_date: string; vrat_id: string; vrat_name: string | null }>;
};

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function processProgressPayload(payload: ProgressApiResponse): ProgressData {
  const profile = payload.profile;
  const sadhana180Typed = payload.sadhana182d || [];
  const nityaLogTyped = payload.nityaLog182d || [];
  const karmaRowsTyped = payload.karmaLedger30d || [];
  const quizRows30dTyped = payload.quizResponses30d || [];
  const malaCurTyped = (payload.malaSessions30d || []) as MalaSessionRow[];
  const allTimeSessions = payload.totalJapaSessions;
  const thirtyAgo = daysAgoISO(29);

  // Streak
  const streak = sadhana180Typed.sort((a, b) => b.date.localeCompare(a.date))[0]?.streak_count ?? 0;

  // 30d Heatmap
  const sadhanaMap30d: Record<string, boolean> = {};
  sadhana180Typed.filter((r) => r.date >= thirtyAgo).forEach((r) => {
    sadhanaMap30d[r.date] = Boolean(r.japa_done);
  });
  const nityaDates30d = new Set(
    nityaLogTyped.filter((r) => r.log_date >= thirtyAgo).map((r) => r.log_date)
  );

  const heatmap = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    const dt = d.toISOString().slice(0, 10);
    return { date: dt, japa: sadhanaMap30d[dt] || false, nitya: nityaDates30d.has(dt) };
  });

  // Karma Ledger total
  const karmaByReason: Record<string, number> = {};
  karmaRowsTyped.forEach((r) => {
    if (r.reason) {
      karmaByReason[r.reason] = (karmaByReason[r.reason] || 0) + (r.amount || 0);
    }
  });
  const karma30dTotal = Object.values(karmaByReason).reduce((s, v) => s + v, 0);

  // Japa Stats
  const japa30dSessions = malaCurTyped.length;
  const japa30dRounds = malaCurTyped.reduce((s, r) => s + malaSessionRounds(r), 0);
  const japa30dBeads = malaCurTyped.reduce((s, r) => s + malaSessionBeads(r), 0);
  const japa30dMins = Math.round(
    malaCurTyped.reduce((s, r) => s + malaSessionDurationSeconds(r), 0) / 60
  );

  const quizAnswers = quizRows30dTyped;
  const quiz30dTotal = quizAnswers.length;
  const quiz30dCorrect = quizAnswers.filter((r) => r.is_correct).length;

  // Day-of-week counts (0=Sun, ..., 6=Sat)
  const dowCounts = Array(7).fill(0);
  malaCurTyped.forEach((r) => {
    const dateStr = r.created_at || r.completed_at || r.date;
    if (dateStr) {
      const dow = new Date(dateStr).getDay();
      dowCounts[dow]++;
    }
  });

  // Calculate Atma-Vichara Harmony Index (0 to 108 scale)
  // Higher with consistent morning Japa and unbroken streak
  const activeDaysCount = heatmap.filter((d) => d.japa || d.nitya).length;
  const consistencyPct = activeDaysCount / 30;
  const streakBonus = Math.min(28, streak * 2);
  const harmonyScore = Math.min(108, Math.max(36, Math.round(50 + consistencyPct * 30 + streakBonus)));

  return {
    profile,
    heatmap,
    karma30dTotal,
    japa30dSessions,
    japa30dRounds,
    japa30dMins,
    japa30dBeads,
    quiz30dTotal,
    quiz30dCorrect,
    totalJapaSessions: allTimeSessions || 0,
    streak,
    dowCounts,
    harmonyScore,
    totalVratsObserved: payload.totalVratsObserved ?? (payload.vratObservations?.length ?? 0),
    vratObservations: payload.vratObservations ?? [],
  };
}

export default function MyProgressScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const router = useRouter();
  const theme = themeColor(isDark);

  const returnToProfile = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  }, [router]);

  const appIdentity = useAppIdentity();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [data, setData] = useState<ProgressData | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // Fast SWR Cache Loader
  useEffect(() => {
    async function loadCachedData() {
      try {
        const raw = await AsyncStorage.getItem(PROGRESS_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as ProgressApiResponse;
          setData(processProgressPayload(parsed));
          setLoading(false);
        }
      } catch {
        // Cache miss is normal
      }
    }
    void loadCachedData();
  }, []);

  const loadData = useCallback(async () => {
    setLoadError(false);

    if (appIdentity.kind === 'loading') {
      return;
    }

    if (appIdentity.kind === 'guest' || appIdentity.kind === 'unauthenticated') {
      setIsGuest(true);
      setLoading(false);
      return;
    }

    setIsGuest(false);

    try {
      const res = await apiFetch('/api/native/progress');
      if (!res.ok) {
        if (!data) setLoadError(true);
        return;
      }

      const payload = (await res.json()) as ProgressApiResponse;
      const processed = processProgressPayload(payload);
      setData(processed);

      // Update offline SWR cache asynchronously
      void AsyncStorage.setItem(PROGRESS_CACHE_KEY, JSON.stringify(payload)).catch(() => {});
    } catch {
      if (!data) setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [appIdentity, data]);

  useEffect(() => {
    if (appIdentity.kind === 'loading') return;
    void loadData();
  }, [loadData, appIdentity]);

  if (loading && !data) {
    return (
      <Screen style={{ flex: 1, backgroundColor: theme.bg, paddingHorizontal: 0, paddingBottom: 0 }}>
        <SacredLoader
          icon="progress"
          title="Calculating Spiritual Progress"
          subtitle="Honoring your sacred karma, sadhana, and consistency..."
          showBack={true}
        />
      </Screen>
    );
  }

  if (isGuest) {
    return (
      <Screen
        style={{ flex: 1, backgroundColor: theme.bg, paddingHorizontal: 0, paddingBottom: 0 }}
        header={{ title: 'My Progress', onBack: returnToProfile }}
      >
        <EmptyState
          icon="trending-up"
          title="Sign in to see your progress"
          subtitle="Your sadhana history, karma, and streaks are saved to your account."
          ctaLabel="Sign in"
          onCta={() => {
            void setGuestMode(false).then(() => router.replace('/(auth)/login'));
          }}
        />
      </Screen>
    );
  }

  if (loadError && !data) {
    return (
      <Screen
        style={{ flex: 1, backgroundColor: theme.bg, paddingHorizontal: 0, paddingBottom: 0 }}
        header={{ title: 'My Progress', onBack: returnToProfile }}
      >
        <EmptyState
          icon="alert-circle"
          title="Couldn't load your progress"
          subtitle="Check your connection and try again."
          ctaLabel="Retry"
          onCta={() => {
            setLoading(true);
            void loadData();
          }}
        />
      </Screen>
    );
  }

  const streak = data?.streak ?? 0;
  const beads = data?.japa30dBeads ?? 0;
  const totalJapaSessions = data?.totalJapaSessions ?? 0;
  const dowCounts = data?.dowCounts ?? Array(7).fill(0);
  const heatmap = data?.heatmap ?? [];
  const karmaTotal = data?.karma30dTotal ?? 0;
  const harmonyScore = data?.harmonyScore ?? 108;
  const userName = data?.profile?.full_name || data?.profile?.username || null;

  const totalVrats = data?.totalVratsObserved ?? 0;
  const recentVrats = data?.vratObservations ?? [];

  const totalShieldsEarned =
    [7, 9, 21, 40, 54, 108, 365].filter((t) => streak >= t).length +
    [7, 21, 40, 108, 365, 1000].filter((t) => totalJapaSessions >= t).length +
    [1, 3, 11, 24, 54, 108].filter((t) => totalVrats >= t).length;

  return (
    <Screen
      style={{ flex: 1, backgroundColor: theme.bg, paddingHorizontal: 0, paddingBottom: 0 }}
      header={{ title: 'My Progress', onBack: returnToProfile }}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Unboxed Sacred Hero Relic & Devotional Presence */}
        <UnboxedHeroRelic
          streak={streak}
          userName={userName}
          isDark={isDark}
          theme={theme}
        />

        {/* 2. Razor-Thin Continuous Week Thread */}
        <HairlineWeekThread
          days={heatmap}
          isDark={isDark}
          theme={theme}
        />

        {/* 3. Hairline Metrics Row (Unboxed Beads, Tapas, Shields) */}
        <HairlineMetricsRow
          beads={beads}
          streak={streak}
          shieldsCount={totalShieldsEarned}
          theme={theme}
          onPressShields={() => router.push('/my-progress/shields' as Href)}
        />

        {/* 4. Slender Light Needles Volume Chart */}
        <SlenderNeedlesChart
          dowCounts={dowCounts}
          totalBeads={beads}
          isDark={isDark}
          theme={theme}
        />

        {/* 5. Vrata Sādhana Track (Sacred Fasting Track) */}
        <VrataTrackCard
          totalVrats={totalVrats}
          recentVrats={recentVrats}
          isDark={isDark}
          theme={theme}
        />

        {/* 6. Precision Astrolabe Dial (Atma-Vichara Harmony) */}
        <PrecisionAstrolabeDial
          harmonyScore={harmonyScore}
          isDark={isDark}
          theme={theme}
        />

        {/* 7. Featherweight Translucent Bottom Sheet & Sub-Routes */}
        <FeatherweightSheet
          onEnterJapa={() => router.push('/japa' as Href)}
          onOpenShields={() => router.push('/my-progress/shields' as Href)}
          onOpenLedger={() => router.push('/my-progress/ledger' as Href)}
          onOpenMood={() => router.push('/my-progress/mood' as Href)}
          karmaTotal={karmaTotal}
          shieldsUnlocked={totalShieldsEarned}
          isDark={isDark}
          theme={theme}
        />
      </ScrollView>
    </Screen>
  );
}
