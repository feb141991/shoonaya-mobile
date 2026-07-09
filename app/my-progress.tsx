import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import Svg, { Path, Circle as SvgCircle, Defs, LinearGradient, Stop, Line } from 'react-native-svg';

import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import {
  malaSessionDurationSeconds,
  malaSessionRounds,
  type MalaSessionRow,
} from '@/lib/mala-sessions';

// ── Row shapes (mirror the `.select()` strings below — see SHOONAYA_RULES.md:
// no `any` on Supabase rows; widen the select if a field is missing) ──
type SadhanaRow = {
  date: string;
  japa_done: boolean | null;
  quiz_done: boolean | null;
  pathshala_done: boolean | null;
  dharmveer_done: boolean | null;
};
type NityaLogRow = { log_date: string };
type KarmaLedgerRow = { reason: string | null; amount: number | null };
type QuizResponseRow = { date: string; is_correct: boolean | null };
type ProfileRow = { full_name: string | null; username: string | null; karma_points: number | null };

type ProgressData = {
  profile: ProfileRow | null;
  heatmap: HeatmapDay[];
  pillarData: { japa: number; nitya: number; quiz: number; pathshala: number; dharmveer: number };
  karma30dTotal: number;
  japa30dSessions: number;
  japa30dRounds: number;
  japa30dMins: number;
  quiz30dTotal: number;
  quiz30dCorrect: number;
  mandaliPosts: number;
  kulTasksCount: number;
  vratTotal: number;
};

// ── Date Helpers ──
function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── Types ──
type HeatmapDay = { date: string; japa: boolean; nitya: boolean };

function SparklineGraph({ days, isDark }: { days: HeatmapDay[]; isDark: boolean }) {
  const amber = '197, 160, 89';
  const sub = isDark ? 'rgba(245,210,130,0.35)' : 'rgba(100,60,10,0.40)';

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date)).slice(-28);
  const W = 300;
  const H = 72;
  const pad = 8;
  const n = sorted.length;

  if (n < 2) {
    return <Text style={{ textAlign: 'center', color: sub, fontSize: 12, paddingVertical: 16 }}>Not enough data yet</Text>;
  }

  const stepX = (W - pad * 2) / (n - 1);
  const pts = sorted.map((d, i) => ({
    x: pad + i * stepX,
    y: d.japa ? H * 0.18 : H * 0.82,
    japa: d.japa,
    date: d.date,
  }));

  function catmullRom(p: typeof pts) {
    if (p.length < 2) return '';
    let d = `M ${p[0].x} ${p[0].y}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[Math.max(i - 1, 0)];
      const p1 = p[i];
      const p2 = p[i + 1];
      const p3 = p[Math.min(i + 2, p.length - 1)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

  const linePath = catmullRom(pts);
  const areaPath = linePath + ` L ${pts[n - 1].x} ${H} L ${pts[0].x} ${H} Z`;
  const todayIso = new Date().toISOString().slice(0, 10);

  const streak = sorted.reduceRight(
    (acc, d) => {
      if (acc.done) return acc;
      if (d.japa) {
        acc.count++;
        return acc;
      }
      acc.done = true;
      return acc;
    },
    { count: 0, done: false }
  ).count;

  return (
    <View>
      <View style={{ alignItems: 'center' }}>
        <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
          <Defs>
            <LinearGradient id="spkGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={`rgba(${amber}, 0.35)`} />
              <Stop offset="100%" stopColor={`rgba(${amber}, 0.0)`} />
            </LinearGradient>
          </Defs>
          <Path d={areaPath} fill="url(#spkGrad)" />
          <Path
            d={linePath}
            fill="none"
            stroke={`rgba(${amber}, 0.8)`}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line x1={pad} y1={H * 0.18} x2={W - pad} y2={H * 0.18} stroke={`rgba(${amber}, 0.08)`} strokeWidth={1} strokeDasharray="3,4" />
          <Line x1={pad} y1={H * 0.82} x2={W - pad} y2={H * 0.82} stroke={`rgba(${amber}, 0.08)`} strokeWidth={1} strokeDasharray="3,4" />

          {pts.map((pt, i) => (
            <SvgCircle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={pt.date === todayIso ? 4 : pt.japa ? 3 : 2}
              fill={pt.japa ? `rgba(${amber}, 0.9)` : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'}
              stroke={pt.date === todayIso ? `rgba(${amber}, 1.0)` : 'none'}
              strokeWidth={1.5}
            />
          ))}
        </Svg>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginTop: 4 }}>
        {['4w ago', '3w ago', '2w ago', 'This week'].map(l => (
          <Text key={l} style={{ fontSize: 9, color: sub }}>{l}</Text>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {[
          { val: `${sorted.filter(d => d.japa).length}`, label: 'days active' },
          { val: `${streak}`, label: 'current streak' },
          { val: `${Math.round((sorted.filter(d => d.japa).length / Math.max(sorted.length, 1)) * 100)}%`, label: 'consistency' },
        ].map(({ val, label }) => (
          <View
            key={label}
            style={{
              flex: 1,
              alignItems: 'center',
              borderRadius: 12,
              paddingVertical: 6,
              backgroundColor: isDark ? 'rgba(197, 160, 89,0.07)' : 'rgba(197, 160, 89,0.06)',
            }}
          >
            <Text style={{ fontSize: 13, fontFamily: FONTS.sansSemiBold, color: isDark ? '#f5dfa0' : '#1a0a02' }}>{val}</Text>
            <Text style={{ fontSize: 9, fontFamily: FONTS.sans, color: sub, marginTop: 2 }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function MyProgressScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const router = useRouter();

  const h1 = isDark ? '#f5dfa0' : '#1a0a02';
  const muted = isDark ? 'rgba(245,210,130,0.45)' : 'rgba(100,55,10,0.50)';
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProgressData | null>(null);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const thirtyAgo = daysAgoISO(29);

    const [
      { data: profile },
      { data: malaCur },
      { data: nityaLog },
      { data: sadhana28 },
      { count: mandaliPosts },
      { count: kulTasksCount },
      { data: karmaRows },
      { count: vratTotal },
      { data: quizRows30d },
    ] = await Promise.all([
      supabase.from('profiles').select('full_name, username, karma_points').eq('id', user.id).single(),
      supabase.from('mala_sessions').select('id, count, bead_count, target_count, rounds, duration_seconds, duration_secs, completed_at, created_at, date')
        .eq('user_id', user.id)
        .gte('created_at', thirtyAgo)
        .lte('created_at', today + 'T23:59:59')
        .order('created_at', { ascending: false }),
      supabase.from('nitya_karma_log').select('log_date').eq('user_id', user.id).gte('log_date', thirtyAgo).lte('log_date', today),
      supabase.from('daily_sadhana').select('date, japa_done, quiz_done, pathshala_done, dharmveer_done').eq('user_id', user.id).gte('date', thirtyAgo).lte('date', today),
      supabase.from('mandali_posts').select('id', { count: 'exact', head: true }).eq('author_id', user.id),
      supabase.from('kul_tasks').select('id', { count: 'exact', head: true }).eq('assigned_to', user.id).eq('completed', true),
      supabase.from('karma_ledger').select('reason, amount').eq('user_id', user.id).gte('created_at', thirtyAgo).lte('created_at', today + 'T23:59:59'),
      supabase.from('recommendations').select('id', { count: 'exact', head: true }).eq('user_id', user.id).like('type', 'vrat_obs:%'),
      supabase.from('quiz_responses').select('date, is_correct').eq('user_id', user.id).gte('date', thirtyAgo).lte('date', today),
    ]);

    const sadhana28Typed = (sadhana28 || []) as SadhanaRow[];
    const nityaLogTyped = (nityaLog || []) as NityaLogRow[];
    const karmaRowsTyped = (karmaRows || []) as KarmaLedgerRow[];
    const quizRows30dTyped = (quizRows30d || []) as QuizResponseRow[];
    const malaCurTyped = (malaCur || []) as MalaSessionRow[];

    const sadhanaMap: Record<string, boolean> = {};
    sadhana28Typed.forEach((r) => { sadhanaMap[r.date] = Boolean(r.japa_done); });
    const nityaDates = new Set(nityaLogTyped.map((r) => r.log_date));

    const heatmap = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 29 + i);
      const dt = d.toISOString().slice(0, 10);
      return { date: dt, japa: sadhanaMap[dt] || false, nitya: nityaDates.has(dt) };
    });

    const pillarData = {
      japa: sadhana28Typed.filter((r) => r.japa_done).length,
      nitya: nityaDates.size,
      quiz: sadhana28Typed.filter((r) => r.quiz_done).length,
      pathshala: sadhana28Typed.filter((r) => r.pathshala_done).length,
      dharmveer: sadhana28Typed.filter((r) => r.dharmveer_done).length,
    };

    const karmaByReason: Record<string, number> = {};
    karmaRowsTyped.forEach((r) => {
      if (r.reason) {
        karmaByReason[r.reason] = (karmaByReason[r.reason] || 0) + (r.amount || 0);
      }
    });
    const karma30dTotal = Object.values(karmaByReason).reduce((s, v) => s + v, 0);

    const malaSessions = malaCurTyped;
    const japa30dSessions = malaSessions.length;
    const japa30dRounds = malaSessions.reduce((s, r) => s + malaSessionRounds(r), 0);
    const japa30dMins = Math.round(malaSessions.reduce((s, r) => s + malaSessionDurationSeconds(r), 0) / 60);

    const quizAnswers = quizRows30dTyped;
    const quiz30dTotal = quizAnswers.length;
    const quiz30dCorrect = quizAnswers.filter((r) => r.is_correct).length;

    setData({
      profile,
      heatmap,
      pillarData,
      karma30dTotal,
      japa30dSessions,
      japa30dRounds,
      japa30dMins,
      quiz30dTotal,
      quiz30dCorrect,
      mandaliPosts: mandaliPosts || 0,
      kulTasksCount: kulTasksCount || 0,
      vratTotal: vratTotal || 0,
    });
  }, [router]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  if (loading || !data) {
    return (
      <Screen style={{ flex: 1, backgroundColor: isDark ? COLORS.darkBg : COLORS.creamBg, paddingHorizontal: 0, paddingBottom: 0 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.brandGold} />
        </View>
      </Screen>
    );
  }

  const { heatmap, pillarData, karma30dTotal, japa30dSessions, japa30dRounds, japa30dMins, quiz30dTotal, quiz30dCorrect, mandaliPosts, kulTasksCount, vratTotal } = data;

  function NavCard({ icon, title, value, href }: { icon: React.ComponentProps<typeof Feather>['name']; title: string; value?: string | number; href: Href }) {
    return (
      <Pressable
        onPress={() => router.push(href)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: cardBg,
          borderColor: border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? 'rgba(197, 160, 89, 0.1)' : 'rgba(197, 160, 89, 0.08)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Feather name={icon} size={18} color="#C5A059" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: h1 }}>{title}</Text>
        </View>
        {value !== undefined && (
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: h1, marginRight: 8 }}>{value}</Text>
        )}
        <Feather name="chevron-right" size={16} color={muted} />
      </Pressable>
    );
  }

  function StatBox({ label, value }: { label: string; value: string | number }) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: border }}>
        <Text style={{ fontSize: 18, fontFamily: FONTS.serifBold, color: h1, marginBottom: 2 }}>{value}</Text>
        <Text style={{ fontSize: 11, fontFamily: FONTS.sans, color: muted }}>{label}</Text>
      </View>
    );
  }

  return (
    <Screen 
      style={{ flex: 1, backgroundColor: isDark ? COLORS.darkBg : COLORS.creamBg, paddingHorizontal: 0, paddingBottom: 0 }}
      header={{ title: 'My Progress', onBack: () => router.back() }}
    >

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        
        {/* Sparkline */}
        <View style={{ backgroundColor: cardBg, borderColor: border, borderWidth: 1, borderRadius: 24, padding: 16, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 16, fontFamily: FONTS.sansSemiBold, color: h1 }}>Japa Consistency</Text>
              <Text style={{ fontSize: 12, fontFamily: FONTS.sans, color: muted }}>Last 28 days</Text>
            </View>
          </View>
          <SparklineGraph days={heatmap} isDark={isDark} />
        </View>

        {/* Links to Sub-routes */}
        <View style={{ gap: 12, marginBottom: 24 }}>
          {/* .expo/types/router.d.ts is generated by the Expo Router dev-server
              file watcher and is stale for these newly-added routes until
              `expo start` regenerates it (gitignored build artifact — same
              situation as dharm-veer/[id] before its dynamic-route typegen
              ran). Cast at the call site rather than hand-editing the
              generated file, matching the precedent in app/(tabs)/index.tsx. */}
          <NavCard icon="award" title="Achievements & Shields" href={'/my-progress/shields' as Href} />
          <NavCard icon="book" title="Karma Ledger" value={karma30dTotal ? `+${karma30dTotal} pt` : '0 pt'} href={'/my-progress/ledger' as Href} />
          <NavCard icon="smile" title="Mood Insights" href={'/my-progress/mood' as Href} />
        </View>

        {/* 30-Day Scorecard */}
        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 4 }}>30-Day Snapshot</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <StatBox label="Japa Sessions" value={japa30dSessions} />
          <StatBox label="Rounds Chanted" value={japa30dRounds} />
          <StatBox label="Japa Mins" value={japa30dMins} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <StatBox label="Nitya Days" value={pillarData.nitya} />
          <StatBox label="Pathshala" value={pillarData.pathshala} />
          <StatBox label="Dharmveer" value={pillarData.dharmveer} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatBox label="Quizzes (Score)" value={`${quiz30dCorrect}/${quiz30dTotal}`} />
          <StatBox label="Mandali Posts" value={mandaliPosts} />
          <StatBox label="Vrats Observed" value={vratTotal} />
        </View>

      </ScrollView>
    </Screen>
  );
}
