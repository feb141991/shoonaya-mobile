import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  ScrollView,
  Text,
  UIManager,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { FONTS, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import {
  malaSessionBeads,
  malaSessionCreatedAt,
  malaSessionDate,
  malaSessionDurationSeconds,
  malaSessionMalaId,
  malaSessionMantra,
  malaSessionRounds,
  malaSessionSpiritualWindow,
  type MalaSessionRow,
} from '@/lib/mala-sessions';
import { getMalaSkin } from '@/lib/mala-skins';

// Ported from PWA's src/app/(main)/japa/insights/InsightsClient.tsx (the
// page /japa/insights actually redirects to, src/app/(main)/bhakti/mala/
// insights/page.tsx). PWA fetches once (up to 1 year back) and derives every
// section client-side from that single `mala_sessions` result set filtered
// by a time-range pill — same approach here, using the already-shared
// lib/mala-sessions.ts accessor helpers so both apps agree on how legacy
// vs. new session columns are read.
//
// PWA's calendar month-view toggle and the "Best Time of Day"/"Practice
// preference"/"Mala style" break-out cards are intentionally trimmed for
// this first native pass — the Overview, Practice Consistency (with its
// day-of-week bar chart), Practice Dashboard, and Session History sections
// below cover the load-bearing numbers a user actually checks. No charting
// library is needed here or in PWA — the day-of-week chart is just
// proportionally-sized bars.

const RANGE_OPTIONS = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
  { key: '90d', label: '90 Days', days: 90 },
  { key: '1y', label: '1 Year', days: 365 },
] as const;

type RangeKey = typeof RANGE_OPTIONS[number]['key'];

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function formatDuration(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
}

function relativeDay(dateStr: string) {
  const then = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.setHours(0, 0, 0, 0) - new Date(then).setHours(0, 0, 0, 0)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function consistencyLabel(pct: number) {
  if (pct >= 90) return 'Excellent';
  if (pct >= 70) return 'Great';
  if (pct >= 50) return 'Good';
  if (pct >= 25) return 'Building';
  return 'Getting Started';
}

// Excellent/Great read as "on track" (brand gold), Good/Building read as
// "in progress" (a softer amber-neutral), Getting Started stays dim rather
// than alarming — a first-week user isn't behind on anything yet.
function consistencyTone(pct: number, theme: ReturnType<typeof themeColor>) {
  if (pct >= 70) return theme.brand;
  if (pct >= 25) return theme.text;
  return theme.dim;
}

function streakRiskLabel(daysSinceLast: number) {
  if (daysSinceLast <= 1) return { label: 'Low', tone: 'ok' as const };
  if (daysSinceLast <= 3) return { label: 'Medium', tone: 'warn' as const };
  return { label: 'High', tone: 'alert' as const };
}

// Grows a horizontal fill bar from 0 to `pct` on mount and whenever `pct`
// changes (e.g. switching time-range pills) — the old version rendered the
// target width directly with no motion at all.
function AnimatedBar({ pct, color, trackColor, height = 8 }: { pct: number; color: string; trackColor: string; height?: number }) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: Math.max(0, Math.min(100, pct)),
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width can't use the native driver
    }).start();
  }, [pct, width]);

  const animatedWidth = width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: trackColor, overflow: 'hidden' }}>
      <Animated.View style={{ width: animatedWidth, height: '100%', backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

// One day-of-week column — grows to its target height with a per-index
// stagger so the chart reads left-to-right instead of popping in at once.
function AnimatedColumn({ targetHeight, color, index, maxHeight = 56 }: { targetHeight: number; color: string; index: number; maxHeight?: number }) {
  const height = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(height, {
      toValue: targetHeight,
      duration: 520,
      delay: index * 45,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // height can't use the native driver
    }).start();
  }, [height, index, targetHeight]);

  return (
    <Animated.View
      style={{
        width: 14,
        height: height.interpolate({ inputRange: [0, maxHeight], outputRange: [3, maxHeight] }),
        borderRadius: 5,
        backgroundColor: color,
      }}
    />
  );
}

export default function JapaInsightsScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sessions, setSessions] = useState<MalaSessionRow[]>([]);
  const [range, setRange] = useState<RangeKey>('30d');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoadError(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 365);

    const { data, error } = await supabase
      .from('mala_sessions')
      .select(
        'id, user_id, mantra, chant_source, count, target_count, duration_seconds, notes, share_scope, completed_at, created_at, date, rounds, bead_count, mantra_id, duration_secs, mala_id, background_scene, tradition, practice_type, intention, completion_type, target_rounds, completed_rounds, completed_beads, mood_before, mood_after, ambient_id, spiritual_time_window, spiritual_date, timezone, haptics_enabled, source_route, panchang_context'
      )
      .eq('user_id', user.id)
      .gte('created_at', fromDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      setLoadError(true);
      return;
    }

    setSessions((data as MalaSessionRow[] | null) ?? []);
  }, [router]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const filtered = useMemo(() => {
    const opt = RANGE_OPTIONS.find((item) => item.key === range) ?? RANGE_OPTIONS[2];
    const cutoff = Date.now() - opt.days * 86_400_000;
    return sessions.filter((row) => new Date(malaSessionCreatedAt(row)).getTime() >= cutoff);
  }, [range, sessions]);

  const stats = useMemo(() => {
    const totalBeads = filtered.reduce((sum, row) => sum + malaSessionBeads(row), 0);
    const totalDuration = filtered.reduce((sum, row) => sum + malaSessionDurationSeconds(row), 0);
    const totalSessions = filtered.length;
    const avgDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;

    const mantraFreq = new Map<string, number>();
    const windowFreq = new Map<string, number>();
    const malaFreq = new Map<string, number>();
    const uniqueDays = new Set<string>();
    const hourBuckets = new Array(24).fill(0) as number[];
    const dayOfWeekBeads = new Array(7).fill(0) as number[];

    for (const row of filtered) {
      const mantra = malaSessionMantra(row);
      if (mantra) mantraFreq.set(mantra, (mantraFreq.get(mantra) ?? 0) + 1);

      const win = malaSessionSpiritualWindow(row);
      if (win) windowFreq.set(win, (windowFreq.get(win) ?? 0) + 1);

      const malaId = malaSessionMalaId(row);
      malaFreq.set(malaId ?? 'default', (malaFreq.get(malaId ?? 'default') ?? 0) + 1);

      const dateKey = malaSessionDate(row);
      if (dateKey) uniqueDays.add(dateKey);

      const created = malaSessionCreatedAt(row);
      if (created) {
        const d = new Date(created);
        hourBuckets[d.getHours()] += 1;
        dayOfWeekBeads[d.getDay()] += malaSessionBeads(row);
      }
    }

    const topMantra = [...mantraFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const topMalaId = [...malaFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const opt = RANGE_OPTIONS.find((item) => item.key === range) ?? RANGE_OPTIONS[2];
    const windowDays = Math.min(opt.days, 365);
    const consistencyPct = windowDays > 0 ? Math.round((uniqueDays.size / windowDays) * 100) : 0;

    // Completion rate: sessions that reached at least one full round (108
    // beads) vs. sessions ended early — a simple, honest proxy for "did the
    // sit finish what it set out to do" without needing a stored goal field
    // on every legacy row.
    const completedCount = filtered.filter((row) => malaSessionRounds(row) > 0).length;
    const completionRate = totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0;

    let bestHourStart = -1;
    let bestHourCount = -1;
    for (let h = 0; h < 23; h += 1) {
      const twoHourSum = hourBuckets[h] + hourBuckets[h + 1];
      if (twoHourSum > bestHourCount) {
        bestHourCount = twoHourSum;
        bestHourStart = h;
      }
    }

    const daysSinceLast = sessions.length > 0
      ? Math.floor((Date.now() - new Date(malaSessionCreatedAt(sessions[0])).getTime()) / 86_400_000)
      : Infinity;

    return {
      totalBeads,
      totalDuration,
      totalSessions,
      avgDuration,
      topMantra,
      topMalaId,
      uniqueDays: uniqueDays.size,
      windowDays,
      consistencyPct: Math.min(100, consistencyPct),
      dayOfWeekBeads,
      completionRate,
      bestHourStart: bestHourCount > 0 ? bestHourStart : null,
      daysSinceLast,
      mantraFreq: [...mantraFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
      windowFreq: [...windowFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
    };
  }, [filtered, range, sessions]);

  const isEmpty = filtered.length === 0;
  const maxDayBeads = Math.max(1, ...stats.dayOfWeekBeads);
  const risk = streakRiskLabel(Number.isFinite(stats.daysSinceLast) ? stats.daysSinceLast : 99);

  if (loading) {
    return (
      <Screen style={{ flex: 1, backgroundColor: theme.bg, paddingHorizontal: 0, paddingBottom: 0 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.brand} />
        </View>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen
        style={{ flex: 1, backgroundColor: theme.bg, paddingHorizontal: 0, paddingBottom: 0 }}
        header={{ title: 'Japa Insights', onBack: () => router.back() }}
      >
        <EmptyState
          icon="alert-circle"
          title="Couldn't load your insights"
          subtitle="Check your connection and try again."
          ctaLabel="Retry"
          onCta={() => { setLoading(true); loadData().finally(() => setLoading(false)); }}
        />
      </Screen>
    );
  }

  return (
    <Screen
      style={{ flex: 1, backgroundColor: theme.bg, paddingHorizontal: 0, paddingBottom: 0 }}
      header={{ title: 'Japa Insights', onBack: () => router.back() }}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 16 }}>
        {/* Time-range pills */}
        <View
          style={{
            flexDirection: 'row',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.premiumBorder,
            backgroundColor: theme.card,
            padding: 4,
            gap: 4,
          }}
        >
          {RANGE_OPTIONS.map((opt) => {
            const selected = range === opt.key;
            return (
              <PressableSurface
                key={opt.key}
                haptic="selection"
                accessibilityState={{ selected }}
                onPress={() => setRange(opt.key)}
                style={{
                  flex: 1,
                  minHeight: 36,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? theme.brand : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontFamily: FONTS.sansSemiBold,
                    fontSize: 11.5,
                    color: selected ? theme.bg : theme.dim,
                  }}
                >
                  {opt.label}
                </Text>
              </PressableSurface>
            );
          })}
        </View>

        {isEmpty ? (
          <EmptyState
            icon="circle"
            title="No sessions yet"
            subtitle="Complete a mala in this window and your practice insights will appear here."
            ctaLabel="Begin Practice"
            onCta={() => router.push('/japa' as Href)}
          />
        ) : (
          <>
            {/* Overview */}
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                backgroundColor: theme.card,
                padding: 16,
                gap: 14,
              }}
            >
              <Text style={{ ...TYPE.section, color: theme.brand }}>Overview</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { label: 'Total beads', value: stats.totalBeads.toLocaleString('en-IN'), icon: 'circle' as const },
                  { label: 'Total time', value: formatDuration(stats.totalDuration), icon: 'clock' as const },
                  { label: 'Sessions', value: String(stats.totalSessions), icon: 'layers' as const },
                  { label: 'Avg / session', value: formatDuration(stats.avgDuration), icon: 'trending-up' as const },
                ].map((tile) => (
                  <View
                    key={tile.label}
                    style={{
                      width: '47%',
                      borderRadius: 14,
                      backgroundColor: theme.brandSoft,
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      gap: 6,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name={tile.icon} size={12} color={theme.brand} />
                      <Text style={{ ...TYPE.caption, color: theme.dim, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 9.5 }}>
                        {tile.label}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: theme.text }}>{tile.value}</Text>
                  </View>
                ))}
              </View>
              {stats.topMantra ? (
                <View style={{ borderTopWidth: 1, borderTopColor: theme.premiumBorder, paddingTop: 12, gap: 2 }}>
                  <Text style={{ ...TYPE.caption, color: theme.dim }}>Most used mantra</Text>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: theme.text }}>{stats.topMantra}</Text>
                </View>
              ) : null}
            </View>

            {/* Practice Consistency */}
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                backgroundColor: theme.card,
                padding: 16,
                gap: 12,
              }}
            >
              <Text style={{ ...TYPE.section, color: theme.brand }}>Practice consistency</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={{ fontFamily: FONTS.serifBold, fontSize: 30, color: theme.text }}>{stats.consistencyPct}%</Text>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: consistencyTone(stats.consistencyPct, theme) }}>
                  {consistencyLabel(stats.consistencyPct)}
                </Text>
              </View>
              <AnimatedBar pct={stats.consistencyPct} color={theme.brand} trackColor={theme.premiumBorder} />
              <Text style={{ ...TYPE.caption, color: theme.dim }}>
                Practiced on {stats.uniqueDays} of {stats.windowDays} day{stats.windowDays === 1 ? '' : 's'}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 72, marginTop: 4 }}>
                {stats.dayOfWeekBeads.map((val, index) => (
                  <View key={index} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
                    <AnimatedColumn
                      index={index}
                      targetHeight={Math.max(3, (val / maxDayBeads) * 56)}
                      color={val > 0 ? theme.brand : theme.premiumBorder}
                    />
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, color: theme.dim }}>{DAY_LETTERS[index]}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Best time of day */}
            {stats.bestHourStart !== null ? (
              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                  backgroundColor: theme.card,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="sunrise" size={18} color={theme.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...TYPE.caption, color: theme.dim }}>Best time of day</Text>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: theme.text }}>
                    {formatHourRange(stats.bestHourStart)}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Practice dashboard */}
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                backgroundColor: theme.card,
                padding: 16,
                gap: 12,
              }}
            >
              <Text style={{ ...TYPE.section, color: theme.brand }}>Practice dashboard</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, borderRadius: 14, backgroundColor: theme.brandSoft, padding: 12, gap: 6 }}>
                  <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 9.5, textTransform: 'uppercase' }}>Completion rate</Text>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: theme.text }}>{stats.completionRate}%</Text>
                  <AnimatedBar pct={stats.completionRate} color={theme.brand} trackColor={theme.card} height={4} />
                </View>
                <View style={{ flex: 1, borderRadius: 14, backgroundColor: theme.brandSoft, padding: 12, gap: 3 }}>
                  <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 9.5, textTransform: 'uppercase' }}>Streak risk</Text>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: theme.text }}>{risk.label}</Text>
                </View>
              </View>
              <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.premiumBorder, padding: 12, gap: 3 }}>
                <Text style={{ ...TYPE.caption, color: theme.brand, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  Recommended next practice
                </Text>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 12.5, lineHeight: 19, color: theme.text }}>
                  {risk.tone === 'alert'
                    ? `It's been ${stats.daysSinceLast} days since your last mala — even one short round today keeps the thread unbroken.`
                    : risk.tone === 'warn'
                      ? 'A short mala today keeps your streak comfortably alive.'
                      : stats.bestHourStart !== null
                        ? `You tend to focus best around ${formatHourRange(stats.bestHourStart)} — a good window for your next sit.`
                        : 'Your practice rhythm looks steady — keep the momentum going.'}
                </Text>
              </View>
            </View>

            {/* Preferences */}
            {stats.mantraFreq.length > 0 || stats.windowFreq.length > 0 ? (
              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                  backgroundColor: theme.card,
                  padding: 16,
                  gap: 12,
                }}
              >
                <Text style={{ ...TYPE.section, color: theme.brand }}>Practice preference</Text>
                {stats.mantraFreq.map(([label, freq]) => (
                  <View key={label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 13, color: theme.text }} numberOfLines={1}>
                      {label}
                    </Text>
                    <Text style={{ ...TYPE.caption, color: theme.dim }}>{freq} session{freq === 1 ? '' : 's'}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {stats.topMalaId ? (
              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                  backgroundColor: theme.card,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: getMalaSkin(stats.topMalaId).beadColor,
                    borderWidth: 1,
                    borderColor: getMalaSkin(stats.topMalaId).beadBorder,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...TYPE.caption, color: theme.dim }}>Most-used mala</Text>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: theme.text }}>
                    {getMalaSkin(stats.topMalaId).label}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Session history */}
            <View style={{ gap: 10 }}>
              <Text style={{ ...TYPE.section, color: theme.brand }}>Recent sessions</Text>
              {filtered.slice(0, 7).map((row) => {
                const id = row.id ?? malaSessionCreatedAt(row);
                return (
                  <SessionRow
                    key={id}
                    row={row}
                    expanded={expandedId === id}
                    theme={theme}
                    isDark={isDark}
                    onToggle={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setExpandedId((current) => (current === id ? null : id));
                    }}
                  />
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function formatHourRange(hourStart: number) {
  const fmt = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12} ${period}`;
  };
  return `${fmt(hourStart)} – ${fmt((hourStart + 2) % 24)}`;
}

// One recent-session row — the chevron rotates (rather than just swapping
// icon glyph) and the row itself gets a light scale-in on press, so
// expanding a session reads as a deliberate animated reveal. The actual
// height change is handled by the caller's LayoutAnimation.configureNext()
// right before the state flip, which smoothly animates the row growing/
// shrinking without any manual height math here.
function SessionRow({
  row,
  expanded,
  theme,
  isDark,
  onToggle,
}: {
  row: MalaSessionRow;
  expanded: boolean;
  theme: ReturnType<typeof themeColor>;
  isDark: boolean;
  onToggle: () => void;
}) {
  const rotate = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotate, {
      toValue: expanded ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [expanded, rotate]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  const beads = malaSessionBeads(row);
  const rounds = malaSessionRounds(row);
  const duration = malaSessionDurationSeconds(row);
  const mantra = malaSessionMantra(row) ?? 'Mantra';
  const created = malaSessionCreatedAt(row);

  return (
    <PressableSurface
      haptic="selection"
      onPress={onToggle}
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: expanded ? theme.brand : theme.premiumBorder,
        backgroundColor: theme.card,
        padding: 14,
        gap: expanded ? 8 : 0,
        boxShadow: expanded ? (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light) : undefined,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16 }}>📿</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13.5, color: theme.text }} numberOfLines={1}>
            {mantra}
          </Text>
          <Text style={{ ...TYPE.caption, color: theme.dim }}>
            {beads.toLocaleString('en-IN')} beads · {created ? relativeDay(created) : ''}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Feather name="chevron-down" size={16} color={expanded ? theme.brand : theme.dim} />
        </Animated.View>
      </View>
      {expanded ? (
        <View style={{ borderTopWidth: 1, borderTopColor: theme.premiumBorder, paddingTop: 8, gap: 4 }}>
          <Text style={{ ...TYPE.caption, color: theme.dim }}>Rounds: {rounds}</Text>
          <Text style={{ ...TYPE.caption, color: theme.dim }}>Duration: {formatDuration(duration)}</Text>
        </View>
      ) : null}
    </PressableSurface>
  );
}
