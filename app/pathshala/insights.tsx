import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View, useColorScheme } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { BackButton } from '@/components/ui/BackButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { SkeletonRow } from '@/components/ui/SkeletonLoader';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, SHADOWS, TYPE, themeColor } from '@/lib/constants';

// Native port of PWA's /pathshala/insights (PathshalaInsightsClient.tsx),
// reading the new GET /api/pathshala/insights route. Deliberately omits
// PWA's "Shruti Recitation" section — native has no recitation/scoring
// feature yet to attach those numbers to, so showing them here would be a
// stat with nothing behind it.

type PathInsight = {
  pathId: string;
  title: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  status: string | null;
  totalLessons: number;
  completedLessons: number;
  progressPct: number;
  startedAt: string;
  lastActiveAt: string;
  completedAt: string | null;
};

type InsightsResponse = {
  daysOnJourney: number;
  pathsEnrolled: number;
  pathsComplete: number;
  activePaths: number;
  lessonsDone: number;
  paths: PathInsight[];
};

type Status = 'loading' | 'ready' | 'error';

function StatCard({ label, value, theme, cardBg, border }: { label: string; value: number; theme: ReturnType<typeof themeColor>; cardBg: string; border: string }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: '46%',
        borderRadius: 18,
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: border,
        padding: 14,
        gap: 4,
      }}
    >
      <Text style={{ fontFamily: FONTS.serifBold, fontSize: 26, color: theme.brand }}>{value}</Text>
      <Text style={{ ...TYPE.caption, color: theme.dim }}>{label}</Text>
    </View>
  );
}

export default function PathshalaInsightsScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const bg = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;

  const [status, setStatus] = useState<Status>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<InsightsResponse | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setStatus('loading');

    try {
      const response = await apiFetch('/api/pathshala/insights');
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const payload = (await response.json()) as InsightsResponse;
      setData(payload);
      setStatus('ready');
    } catch {
      setStatus('error');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <Screen style={{ backgroundColor: bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <BackButton showLabel={false} iconSize={22} iconColor={text} onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text style={{ ...TYPE.screenTitle, color: text }}>Learning Journey</Text>
          <Text style={{ ...TYPE.caption, color: dim }}>Your Pathshala progress</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 28, gap: 18 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void load(true); }} tintColor={brand} />}
      >
        {status === 'loading' ? (
          <View style={{ gap: 12 }}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : status === 'error' ? (
          <EmptyState
            icon="alert-circle"
            title="Couldn't load your insights"
            subtitle="Check your connection and try again."
            ctaLabel="Retry"
            onCta={() => { void load(); }}
          />
        ) : !data || data.pathsEnrolled === 0 ? (
          <EmptyState
            icon="bar-chart-2"
            title="No journey yet"
            subtitle="Enroll in a path from Pathshala to start tracking your progress here."
          />
        ) : (
          <>
            <View
              style={{
                borderRadius: 20,
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: border,
                padding: 18,
                gap: 4,
                boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
              }}
            >
              <Text style={{ ...TYPE.chip, letterSpacing: 1.25, textTransform: 'uppercase', color: brand }}>
                Days on Journey
              </Text>
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 36, color: text }}>
                {data.daysOnJourney}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <StatCard label="Paths Enrolled" value={data.pathsEnrolled} theme={theme} cardBg={cardBg} border={border} />
              <StatCard label="Paths Complete" value={data.pathsComplete} theme={theme} cardBg={cardBg} border={border} />
              <StatCard label="Lessons Done" value={data.lessonsDone} theme={theme} cardBg={cardBg} border={border} />
              <StatCard label="Active Paths" value={data.activePaths} theme={theme} cardBg={cardBg} border={border} />
            </View>

            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: dim, textTransform: 'uppercase', letterSpacing: 1 }}>
                Your Paths
              </Text>
              {data.paths.map((path) => (
                <View
                  key={path.pathId}
                  style={{
                    borderRadius: 18,
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: border,
                    padding: 16,
                    gap: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <Text style={{ ...TYPE.label, fontFamily: FONTS.sansSemiBold, color: text, flex: 1 }} numberOfLines={1}>
                      {path.title}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        borderRadius: 999,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        backgroundColor: path.status === 'completed' ? theme.brandSoft : theme.cardSoft,
                      }}
                    >
                      {path.status === 'completed' ? <Feather name="check" size={11} color={brand} /> : null}
                      <Text style={{ ...TYPE.micro, fontFamily: FONTS.sansSemiBold, color: path.status === 'completed' ? brand : dim }}>
                        {path.status === 'completed' ? 'Done' : 'Active'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ height: 6, borderRadius: 999, backgroundColor: border, overflow: 'hidden' }}>
                    <View
                      style={{
                        width: `${Math.max(0, Math.min(path.progressPct, 100))}%`,
                        height: '100%',
                        backgroundColor: brand,
                        borderRadius: 999,
                      }}
                    />
                  </View>
                  <Text style={{ ...TYPE.caption, color: dim }}>
                    {path.completedLessons}/{path.totalLessons} lessons · {path.progressPct}%
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
