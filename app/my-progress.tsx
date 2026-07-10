import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
  Dimensions,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import Svg, { Rect } from 'react-native-svg';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import {
  malaSessionDurationSeconds,
  malaSessionRounds,
  malaSessionBeads,
  type MalaSessionRow,
} from '@/lib/mala-sessions';

// Shape returned by GET /api/native/progress (src/app/api/native/progress/route.ts
// in the web repo) — a batched, RLS-scoped passthrough of the same raw rows
// this screen used to fetch via 10 separate direct supabase.from() calls.
// Kept as raw rows (not pre-aggregated) so every derivation below is
// byte-for-byte unchanged from before.
type ProgressApiResponse = {
  profile: ProfileRow | null;
  malaSessions30d: MalaSessionRow[];
  nityaLog182d: NityaLogRow[];
  sadhana182d: SadhanaRow[];
  totalJapaSessions: number;
  karmaLedger30d: KarmaLedgerRow[];
  quizResponses30d: QuizResponseRow[];
};

// ── Types & Shapes ──
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

type ProgressTheme = {
  bg: string;
  text: string;
  dim: string;
  card: string;
  border: string;
};

type ProgressData = {
  profile: ProfileRow | null;
  heatmap: HeatmapDay[];
  sixMonthHeatmap: HeatmapDay[];
  pillarData: { japa: number; nitya: number; quiz: number; pathshala: number; dharmveer: number };
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
};

// ── Date Helpers ──
function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── 6-Month Heatmap Layout ──
function buildHeatmapWeeks(days: HeatmapDay[]) {
  const dayMap: Record<string, { japa: boolean; nitya: boolean }> = {};
  days.forEach(d => { dayMap[d.date] = { japa: d.japa, nitya: d.nitya }; });

  const todayIso = new Date().toISOString().slice(0, 10);
  const anchor = new Date();
  anchor.setDate(anchor.getDate() - anchor.getDay()); // Roll back to Sunday

  const weeks: (string | null)[][] = [];
  for (let w = 25; w >= 0; w--) {
    const week: (string | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(anchor);
      date.setDate(anchor.getDate() - w * 7 + d);
      const iso = date.toISOString().slice(0, 10);
      week.push(iso <= todayIso ? iso : null);
    }
    weeks.push(week);
  }
  return { weeks, dayMap };
}

function SixMonthHeatmap({ days, isDark, theme }: { days: HeatmapDay[]; isDark: boolean; theme: ProgressTheme }) {
  const { weeks, dayMap } = buildHeatmapWeeks(days);
  const amber = COLORS.brandGold;
  const green = '#8fb46e';
  const dimBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  function cellColor(iso: string | null): string {
    if (!iso) return 'transparent';
    const d = dayMap[iso];
    if (!d) return dimBg;
    if (d.japa && d.nitya) return amber;
    if (d.japa)            return `${amber}cc`;
    if (d.nitya)           return `${green}bb`;
    return dimBg;
  }

  const cellSize = 10;
  const cellGap = 3;
  const step = cellSize + cellGap;
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <View style={{ paddingVertical: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
        <Svg width={26 * step} height={7 * step}>
          {weeks.map((week, wi) => (
            week.map((iso, di) => (
              <Rect
                key={`${wi}-${di}`}
                x={wi * step}
                y={di * step}
                width={cellSize}
                height={cellSize}
                rx={2}
                ry={2}
                fill={cellColor(iso)}
                stroke={iso === todayIso ? amber : 'none'}
                strokeWidth={1}
              />
            ))
          ))}
        </Svg>
      </ScrollView>

      {/* Legend */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: dimBg }} />
          <Text style={{ fontSize: 9, fontFamily: FONTS.sans, color: theme.dim }}>None</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: `${amber}cc` }} />
          <Text style={{ fontSize: 9, fontFamily: FONTS.sans, color: theme.dim }}>Japa</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: `${green}bb` }} />
          <Text style={{ fontSize: 9, fontFamily: FONTS.sans, color: theme.dim }}>Nitya</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: amber }} />
          <Text style={{ fontSize: 9, fontFamily: FONTS.sans, color: theme.dim }}>Both</Text>
        </View>
      </View>
    </View>
  );
}

// ── Interactive Sadhana Calendar ──
function InteractiveCalendar({ days, isDark, theme, streak }: { days: HeatmapDay[]; isDark: boolean; theme: ProgressTheme; streak: number }) {
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const todayIso = new Date().toISOString().slice(0, 10);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const dayMap = useMemo(() => {
    const m: Record<string, { japa: boolean; nitya: boolean }> = {};
    days.forEach(d => { m[d.date] = { japa: d.japa, nitya: d.nitya }; });
    return m;
  }, [days]);

  const calDays = useMemo(() => {
    const first = new Date(calMonth.year, calMonth.month, 1);
    const last  = new Date(calMonth.year, calMonth.month + 1, 0);
    const cells: (string | null)[] = Array(first.getDay()).fill(null);
    for (let d = 1; d <= last.getDate(); d++) {
      const iso = `${calMonth.year}-${String(calMonth.month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      cells.push(iso);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calMonth]);

  const monthLabel = new Date(calMonth.year, calMonth.month, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const amber = COLORS.brandGold;
  const green = '#8fb46e';

  const rows: (string | null)[][] = [];
  for (let i = 0; i < calDays.length; i += 7) {
    rows.push(calDays.slice(i, i + 7));
  }

  const selectedDayInfo = selectedDay ? dayMap[selectedDay] : null;

  return (
    <View style={{ marginTop: 8 }}>
      {/* Month Navigation */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Pressable
          onPress={() => setCalMonth(m => { const d = new Date(m.year, m.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
          style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Feather name="chevron-left" size={16} color={amber} />
        </Pressable>
        <Text style={{ fontFamily: FONTS.serifBold, fontSize: 14, color: theme.text }}>
          {monthLabel}
        </Text>
        <Pressable
          onPress={() => setCalMonth(m => { const d = new Date(m.year, m.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
          style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Feather name="chevron-right" size={16} color={amber} />
        </Pressable>
      </View>

      {/* Weekdays */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontFamily: FONTS.sansSemiBold, color: theme.dim }}>
            {d}
          </Text>
        ))}
      </View>

      {/* Grid */}
      {rows.map((row, rIdx) => (
        <View key={rIdx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          {row.map((iso, cIdx) => {
            if (!iso) return <View key={cIdx} style={{ flex: 1 }} />;
            const d = dayMap[iso];
            const both = d?.japa && d?.nitya;
            const isToday = iso === todayIso;
            const isSelected = iso === selectedDay;

            const bg = isSelected
              ? amber
              : both ? `${amber}a5`
              : d?.japa ? (isDark ? 'rgba(197, 160, 89, 0.25)' : 'rgba(197, 160, 89, 0.15)')
              : d?.nitya ? (isDark ? 'rgba(143, 180, 110, 0.25)' : 'rgba(143, 180, 110, 0.15)')
              : 'transparent';

            const color = isSelected
              ? COLORS.onMediaWhite
              : (d?.japa || d?.nitya)
                ? (isDark ? '#f5dfa0' : '#1a0a02')
                : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)');

            return (
              <Pressable
                key={iso}
                onPress={() => setSelectedDay(isSelected ? null : iso)}
                style={{
                  flex: 1,
                  aspectRatio: 1,
                  borderRadius: 18,
                  backgroundColor: bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginHorizontal: 2,
                  borderWidth: isToday ? 1.5 : 0,
                  borderColor: amber,
                }}
              >
                <Text style={{ fontSize: 11, fontFamily: isToday || isSelected ? FONTS.sansSemiBold : FONTS.sans, color }}>
                  {new Date(iso + 'T12:00:00').getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}

      {/* Details Box */}
      {selectedDay && (
        <View style={{ marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight, alignItems: 'center' }}>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: theme.text }}>
            {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: theme.dim, marginTop: 2 }}>
            {selectedDayInfo?.japa ? 'Japa completed' : ''}
            {selectedDayInfo?.japa && selectedDayInfo?.nitya ? ' · ' : ''}
            {selectedDayInfo?.nitya ? 'Nitya Karma completed' : ''}
            {!selectedDayInfo?.japa && !selectedDayInfo?.nitya ? 'Rest day' : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Practice Rhythm Chart ──
function DowChart({ counts, isDark, theme }: { counts: number[]; isDark: boolean; theme: ProgressTheme }) {
  const max = Math.max(...counts, 1);
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 72, paddingVertical: 4 }}>
      {counts.map((v, i) => {
        const heightPct = (v / max) * 100;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View style={{ width: '100%', height: 48, justifyContent: 'flex-end' }}>
              <View
                style={{
                  width: '100%',
                  height: `${heightPct}%`,
                  backgroundColor: isDark ? 'rgba(197, 160, 89, 0.45)' : 'rgba(100, 65, 20, 0.50)',
                  borderRadius: 4,
                }}
              />
            </View>
            <Text style={{ fontSize: 9, fontFamily: FONTS.sansSemiBold, color: isDark ? 'rgba(197, 160, 89, 0.45)' : 'rgba(100, 65, 20, 0.50)' }}>
              {labels[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── 5-Pillar Scorecard ──
const PILLAR_META = [
  { key: 'japa',      emoji: '📿', label: 'Japa',       colour: '#F59E4A', bg: 'rgba(245,158,74,0.12)'  },
  { key: 'nitya',     emoji: '🌅', label: 'Nitya',      colour: COLORS.brandGold, bg: COLORS.homeSoftLight },
  { key: 'quiz',      emoji: '🧠', label: 'Quiz',       colour: '#A594E0', bg: 'rgba(165,148,224,0.12)' },
  { key: 'pathshala', emoji: '📖', label: 'Pathshala',  colour: '#6BC47E', bg: 'rgba(107,196,126,0.12)' },
  { key: 'dharmveer', emoji: '⚔️', label: 'Dharm Veer', colour: '#FF8A65', bg: 'rgba(255,138,101,0.12)' },
];

function SadhanaScorecard({ pillarData, isDark, theme }: { pillarData: ProgressData['pillarData']; isDark: boolean; theme: ProgressTheme }) {
  const windowDays = 30;
  return (
    <View style={{ gap: 14 }}>
      {PILLAR_META.map(p => {
        const count = pillarData[p.key as keyof typeof pillarData] ?? 0;
        const pct = Math.min(100, Math.round((count / windowDays) * 100));
        return (
          <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{p.emoji}</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 12, fontFamily: FONTS.sansSemiBold, color: theme.text }}>{p.label}</Text>
                <Text style={{ fontSize: 11, fontFamily: FONTS.sansSemiBold, color: p.colour }}>
                  {count}<Text style={{ fontSize: 9, fontFamily: FONTS.sans, color: theme.dim }}>/{windowDays}d</Text>
                </Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: p.bg, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${pct}%`, backgroundColor: p.colour, borderRadius: 3 }} />
              </View>
            </View>
            <Text style={{ fontSize: 11, fontFamily: FONTS.sansSemiBold, color: pct >= 70 ? p.colour : theme.dim, width: 34, textAlign: 'right' }}>
              {pct}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Main Screen ──
export default function MyProgressScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const router = useRouter();

  const h1 = isDark ? '#f5dfa0' : '#1a0a02';
  const muted = isDark ? 'rgba(245,210,130,0.45)' : 'rgba(100,55,10,0.50)';
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;

  const theme = {
    bg: isDark ? COLORS.darkBg : COLORS.creamBg,
    text: h1,
    dim: muted,
    card: cardBg,
    border: border,
  };

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [data, setData] = useState<ProgressData | null>(null);

  const loadData = useCallback(async () => {
    setLoadError(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    const thirtyAgo = daysAgoISO(29);

    let res: Response;
    try {
      res = await apiFetch('/api/native/progress');
    } catch {
      setLoadError(true);
      return;
    }
    if (!res.ok) {
      setLoadError(true);
      return;
    }

    const payload = (await res.json()) as ProgressApiResponse;
    const profile = payload.profile;
    const sadhana180Typed = payload.sadhana182d || [];
    const nityaLogTyped = payload.nityaLog182d || [];
    const karmaRowsTyped = payload.karmaLedger30d || [];
    const quizRows30dTyped = payload.quizResponses30d || [];
    const malaCurTyped = (payload.malaSessions30d || []) as MalaSessionRow[];
    const allTimeSessions = payload.totalJapaSessions;

    // Extract current streak from most recent sadhana row
    const streak = sadhana180Typed.sort((a, b) => b.date.localeCompare(a.date))[0]?.streak_count ?? 0;

    // Heatmaps
    const sadhanaMap30d: Record<string, boolean> = {};
    sadhana180Typed.filter(r => r.date >= thirtyAgo).forEach(r => { sadhanaMap30d[r.date] = Boolean(r.japa_done); });
    const nityaDates30d = new Set(nityaLogTyped.filter(r => r.log_date >= thirtyAgo).map(r => r.log_date));

    const heatmap = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 29 + i);
      const dt = d.toISOString().slice(0, 10);
      return { date: dt, japa: sadhanaMap30d[dt] || false, nitya: nityaDates30d.has(dt) };
    });

    const sadhanaMap180: Record<string, boolean> = {};
    sadhana180Typed.forEach(r => { sadhanaMap180[r.date] = Boolean(r.japa_done); });
    const nityaDates180 = new Set(nityaLogTyped.map(r => r.log_date));

    const sixMonthHeatmap = Array.from({ length: 182 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 181 + i);
      const dt = d.toISOString().slice(0, 10);
      return { date: dt, japa: sadhanaMap180[dt] || false, nitya: nityaDates180.has(dt) };
    });

    // 5-Pillar Scorecard Stats
    const sadhana30d = sadhana180Typed.filter(r => r.date >= thirtyAgo);
    const pillarData = {
      japa: sadhana30d.filter(r => r.japa_done).length,
      nitya: nityaDates30d.size,
      quiz: sadhana30d.filter(r => r.quiz_done).length,
      pathshala: sadhana30d.filter(r => r.pathshala_done).length,
      dharmveer: sadhana30d.filter(r => r.dharmveer_done).length,
    };

    // Karma Ledger total
    const karmaByReason: Record<string, number> = {};
    karmaRowsTyped.forEach(r => {
      if (r.reason) {
        karmaByReason[r.reason] = (karmaByReason[r.reason] || 0) + (r.amount || 0);
      }
    });
    const karma30dTotal = Object.values(karmaByReason).reduce((s, v) => s + v, 0);

    // Japa Sessions
    const japa30dSessions = malaCurTyped.length;
    const japa30dRounds = malaCurTyped.reduce((s, r) => s + malaSessionRounds(r), 0);
    const japa30dBeads = malaCurTyped.reduce((s, r) => s + malaSessionBeads(r), 0);
    const japa30dMins = Math.round(malaCurTyped.reduce((s, r) => s + malaSessionDurationSeconds(r), 0) / 60);

    const quizAnswers = quizRows30dTyped;
    const quiz30dTotal = quizAnswers.length;
    const quiz30dCorrect = quizAnswers.filter(r => r.is_correct).length;

    // Day-of-week counts (0=Sun, ..., 6=Sat)
    const dowCounts = Array(7).fill(0);
    malaCurTyped.forEach(r => {
      const dateStr = r.created_at || r.completed_at || r.date;
      if (dateStr) {
        const dow = new Date(dateStr).getDay();
        dowCounts[dow]++;
      }
    });

    setData({
      profile,
      heatmap,
      sixMonthHeatmap,
      pillarData,
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
    });
  }, [router]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  if (loading) {
    return (
      <Screen style={{ flex: 1, backgroundColor: theme.bg, paddingHorizontal: 0, paddingBottom: 0 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.brandGold} />
        </View>
      </Screen>
    );
  }

  if (loadError || !data) {
    return (
      <Screen
        style={{ flex: 1, backgroundColor: theme.bg, paddingHorizontal: 0, paddingBottom: 0 }}
        header={{ title: 'My Progress', onBack: () => router.back() }}
      >
        <EmptyState
          icon="alert-circle"
          title="Couldn't load your progress"
          subtitle="Check your connection and try again."
          ctaLabel="Retry"
          onCta={() => { setLoading(true); loadData().finally(() => setLoading(false)); }}
        />
      </Screen>
    );
  }

  const {
    profile,
    heatmap,
    sixMonthHeatmap,
    pillarData,
    karma30dTotal,
    japa30dSessions,
    japa30dRounds,
    japa30dMins,
    japa30dBeads,
    totalJapaSessions,
    streak,
    dowCounts,
  } = data;

  const totalShieldsEarned =
    [7, 9, 21, 40, 54, 108, 365].filter(t => streak >= t).length +
    [7, 21, 40, 108, 365, 1000].filter(t => totalJapaSessions >= t).length;

  return (
    <Screen
      style={{ flex: 1, backgroundColor: theme.bg, paddingHorizontal: 0, paddingBottom: 0 }}
      header={{ title: 'My Progress', onBack: () => router.back() }}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* 1. Streak Header Hero */}
        <View style={{ alignItems: 'center', marginBottom: 24, paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Text style={{ fontSize: 32 }}>🔥</Text>
            <Text style={{ fontSize: 42, fontFamily: FONTS.serifBold, color: streak > 0 ? COLORS.brandGold : theme.text }}>
              {streak}
            </Text>
          </View>
          <Text style={{ fontSize: 15, fontFamily: FONTS.serif, color: theme.text, textAlign: 'center', paddingHorizontal: 20 }}>
            {streak === 0
              ? 'Begin today — every great sādhaka started with day one'
              : `${streak} day${streak !== 1 ? 's' : ''} of unbroken practice, ${profile?.full_name || profile?.username || 'Sādhaka'}`}
          </Text>
        </View>

        {/* 2. 6-Month Contribution Heatmap */}
        <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, marginBottom: 20 }}>
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontFamily: FONTS.sansSemiBold, textTransform: 'uppercase', letterSpacing: 1.5, color: COLORS.brandGold }}>
              6-Month History
            </Text>
            <Text style={{ fontSize: 11, fontFamily: FONTS.sans, color: theme.dim, marginTop: 2 }}>
              26 weeks · Japa & Nitya
            </Text>
          </View>
          <SixMonthHeatmap days={sixMonthHeatmap} isDark={isDark} theme={theme} />
        </Card>

        {/* 3. Sadhana Calendar */}
        <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 11, fontFamily: FONTS.sansSemiBold, textTransform: 'uppercase', letterSpacing: 1.5, color: theme.dim }}>
                Sādhana Calendar
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Text style={{ fontSize: 13, fontFamily: FONTS.serifBold, color: theme.text }}>
                  {streak > 0 ? `${streak} Days Streak` : 'Start your streak'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <View style={{ backgroundColor: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(197, 160, 89, 0.15)' }}>
                <Text style={{ fontSize: 10, fontFamily: FONTS.sansSemiBold, color: theme.text }}>{heatmap.filter(d => d.japa || d.nitya).length} active</Text>
              </View>
            </View>
          </View>
          <InteractiveCalendar days={heatmap} isDark={isDark} theme={theme} streak={streak} />
        </Card>

        {/* 4. Colored Pillar Cards */}
        <View style={{ gap: 16, marginBottom: 20 }}>
          {/* Japa Card (Pink/Rose Tint) */}
          <View
            style={{
              backgroundColor: isDark ? 'rgba(244,63,94,0.05)' : 'rgba(244,63,94,0.03)',
              borderColor: isDark ? 'rgba(244,63,94,0.15)' : 'rgba(244,63,94,0.12)',
              borderWidth: 1,
              borderRadius: 24,
              padding: 20,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 24 }}>📿</Text>
                <View>
                  <Text style={{ fontSize: 10, fontFamily: FONTS.sansSemiBold, textTransform: 'uppercase', letterSpacing: 1.5, color: COLORS.danger }}>
                    Japa · 30 days
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: FONTS.sans, color: theme.dim, marginTop: 1 }}>
                    Mantra repetition
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.push('/my-progress/ledger' as Href)}
                style={{ backgroundColor: 'rgba(244,63,94,0.08)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(244,63,94,0.15)' }}
              >
                <Text style={{ fontSize: 10, fontFamily: FONTS.sansSemiBold, color: COLORS.danger }}>Insights →</Text>
              </Pressable>
            </View>

            {japa30dSessions === 0 ? (
              <View style={{ alignItems: 'center', marginVertical: 8 }}>
                <Text style={{ fontSize: 13, fontFamily: FONTS.sansSemiBold, color: theme.dim, marginBottom: 12 }}>No sessions this cycle</Text>
                <Pressable
                  onPress={() => router.push('/japa' as Href)}
                  style={{ backgroundColor: 'rgba(244,63,94,0.85)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
                >
                  <Text style={{ color: COLORS.onMediaWhite, fontSize: 11, fontFamily: FONTS.sansSemiBold }}>Begin Japa →</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { val: String(japa30dSessions), label: 'sessions' },
                    { val: japa30dBeads >= 1000 ? `${(japa30dBeads / 1000).toFixed(1)}k` : String(japa30dBeads), label: 'beads' },
                    { val: String(japa30dRounds), label: 'rounds' },
                    { val: `${japa30dMins}m`, label: 'time' },
                  ].map(({ val, label }) => (
                    <View key={label} style={{ flex: 1, backgroundColor: isDark ? 'rgba(244,63,94,0.08)' : 'rgba(244,63,94,0.04)', paddingVertical: 8, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(244,63,94,0.08)' }}>
                      <Text style={{ fontSize: 15, fontFamily: FONTS.serifBold, color: theme.text }}>{val}</Text>
                      <Text style={{ fontSize: 9, fontFamily: FONTS.sans, color: theme.dim, marginTop: 2, textTransform: 'uppercase' }}>{label}</Text>
                    </View>
                  ))}
                </View>

                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 10, fontFamily: FONTS.sansSemiBold, color: theme.dim }}>CONSISTENCY</Text>
                    <Text style={{ fontSize: 10, fontFamily: FONTS.sansSemiBold, color: COLORS.danger }}>
                      {Math.round((pillarData.japa / 30) * 100)}%
                    </Text>
                  </View>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: isDark ? 'rgba(244,63,94,0.1)' : 'rgba(244,63,94,0.06)', overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${Math.round((pillarData.japa / 30) * 100)}%`, backgroundColor: COLORS.danger }} />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Nitya Karma Card (Green Tint) */}
          <View
            style={{
              backgroundColor: isDark ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.03)',
              borderColor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.12)',
              borderWidth: 1,
              borderRadius: 24,
              padding: 20,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 24 }}>🌅</Text>
                <View>
                  <Text style={{ fontSize: 10, fontFamily: FONTS.sansSemiBold, textTransform: 'uppercase', letterSpacing: 1.5, color: COLORS.success }}>
                    Nitya Karma · 30 days
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: FONTS.sans, color: theme.dim, marginTop: 1 }}>
                    Daily dharma practice
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.push('/my-progress/ledger' as Href)}
                style={{ backgroundColor: 'rgba(16,185,129,0.08)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(16,185,129,0.15)' }}
              >
                <Text style={{ fontSize: 10, fontFamily: FONTS.sansSemiBold, color: COLORS.success }}>Insights →</Text>
              </Pressable>
            </View>

            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { val: String(pillarData.nitya), label: 'done' },
                  { val: `${Math.round((pillarData.nitya / 30) * 100)}%`, label: 'rate' },
                  { val: String(Math.max(0, 30 - pillarData.nitya)), label: 'left' },
                ].map(({ val, label }) => (
                  <View key={label} style={{ flex: 1, backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.04)', paddingVertical: 8, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(16,185,129,0.08)' }}>
                    <Text style={{ fontSize: 15, fontFamily: FONTS.serifBold, color: theme.text }}>{val}</Text>
                    <Text style={{ fontSize: 9, fontFamily: FONTS.sans, color: theme.dim, marginTop: 2, textTransform: 'uppercase' }}>{label}</Text>
                  </View>
                ))}
              </View>

              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 10, fontFamily: FONTS.sansSemiBold, color: theme.dim }}>MOMENTUM</Text>
                  <Text style={{ fontSize: 10, fontFamily: FONTS.sansSemiBold, color: COLORS.success }}>
                    {Math.round((pillarData.nitya / 30) * 100)}%
                  </Text>
                </View>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.06)', overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${Math.round((pillarData.nitya / 30) * 100)}%`, backgroundColor: COLORS.success }} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 5. 5-Pillar Scorecard */}
        <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, marginBottom: 20 }}>
          <Text style={{ fontSize: 11, fontFamily: FONTS.sansSemiBold, textTransform: 'uppercase', letterSpacing: 1.5, color: COLORS.brandGold, marginBottom: 16 }}>
            5-Pillar Scorecard · 30 days
          </Text>
          <SadhanaScorecard pillarData={pillarData} isDark={isDark} theme={theme} />
        </Card>

        {/* 6. Achievement Shields Teaser */}
        <Pressable
          onPress={() => router.push('/my-progress/shields' as Href)}
          style={({ pressed }) => ({
            backgroundColor: isDark ? 'rgba(197, 160, 89, 0.08)' : 'rgba(255, 246, 220, 0.95)',
            borderColor: 'rgba(197, 160, 89, 0.25)',
            borderWidth: 1,
            borderRadius: 24,
            padding: 18,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ fontSize: 24 }}>🛡️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontFamily: FONTS.sansSemiBold, color: theme.text }}>
              Sanctuary Shields
            </Text>
            <Text style={{ fontSize: 11, fontFamily: FONTS.sans, color: theme.dim, marginTop: 1 }}>
              You have unlocked {totalShieldsEarned} of 13 shields
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={theme.dim} />
        </Pressable>

        {/* 7. Practice Rhythm Chart */}
        <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, marginBottom: 20 }}>
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontFamily: FONTS.sansSemiBold, textTransform: 'uppercase', letterSpacing: 1.5, color: theme.dim }}>
              Practice Rhythm
            </Text>
            <Text style={{ fontSize: 11, fontFamily: FONTS.sans, color: theme.dim, marginTop: 2 }}>
              Which days you sit for japa · last 30 days
            </Text>
          </View>
          <DowChart counts={dowCounts} isDark={isDark} theme={theme} />
        </Card>

        {/* Sub-route Links (Karma & Mood) */}
        <View style={{ gap: 12 }}>
          <Pressable
            onPress={() => router.push('/my-progress/ledger' as Href)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.card,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 18,
              padding: 16,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Feather name="book" size={18} color={COLORS.brandGold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: theme.text }}>Karma Ledger</Text>
            </View>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.text, marginRight: 8 }}>
              {karma30dTotal ? `+${karma30dTotal} pt` : '0 pt'}
            </Text>
            <Feather name="chevron-right" size={14} color={theme.dim} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/my-progress/mood' as Href)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.card,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 18,
              padding: 16,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Feather name="smile" size={18} color={COLORS.brandGold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: theme.text }}>Mood Insights</Text>
            </View>
            <Feather name="chevron-right" size={14} color={theme.dim} />
          </Pressable>
        </View>

      </ScrollView>
    </Screen>
  );
}
