import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS, TYPE, themeColor } from '@/lib/constants';
import {
  malaSessionBeads,
  malaSessionDate,
  malaSessionDurationSeconds,
  malaSessionMantra,
  malaSessionRounds,
  type MalaSessionRow,
} from '@/lib/mala-sessions';
import { supabase } from '@/lib/supabase';

// ── Bhakti Phase 8 — native equivalent of the PWA's
// src/app/(main)/bhakti/insights/BhaktiInsightsClient.tsx ("Devotion
// Insights"). Reads the same `mala_sessions` table the existing native
// /japa-insights screen already reads (same accessor helpers from
// lib/mala-sessions.ts), but frames it devotionally — Shloka Streak/Seva
// Score hero, mantra frequency, day-of-week chart, and a tappable month
// calendar — rather than duplicating japa-insights.tsx's practice-
// mechanics framing (completion rate, streak risk, best time of day).

type FilterKey = '1d' | '7d' | '30d' | '90d';
const FILTERS: { key: FilterKey; label: string; days: number }[] = [
  { key: '1d', label: 'Today', days: 1 },
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
  { key: '90d', label: '90 Days', days: 90 },
];
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const ROSE = COLORS.deityRose;
const AMBER = COLORS.brandGold;

function fmtTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function BhaktiInsightsScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(() => themeColor(isDark), [isDark]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sessions, setSessions] = useState<MalaSessionRow[]>([]);
  const [shlokaStreak, setShlokaStreak] = useState(0);
  const [sevaScore, setSevaScore] = useState(0);
  const [filter, setFilter] = useState<FilterKey>('30d');
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  const [cal, setCal] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selDay, setSelDay] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/(auth)/login'); return; }

      const ninetyAgo = new Date();
      ninetyAgo.setDate(ninetyAgo.getDate() - 89);

      const [{ data: rows, error }, { data: profile }] = await Promise.all([
        supabase
          .from('mala_sessions')
          .select('id, user_id, mantra, chant_source, count, target_count, duration_seconds, notes, share_scope, completed_at, created_at, date, rounds, bead_count, mantra_id, duration_secs, mala_id, background_scene, tradition, practice_type, intention, completion_type, target_rounds, completed_rounds, completed_beads, mood_before, mood_after, ambient_id, spiritual_time_window, spiritual_date, timezone, haptics_enabled, source_route, panchang_context')
          .eq('user_id', user.id)
          .gte('created_at', ninetyAgo.toISOString())
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('shloka_streak, seva_score').eq('id', user.id).single(),
      ]);

      if (error) { setLoadError(true); return; }
      setSessions((rows as MalaSessionRow[] | null) ?? []);
      setShlokaStreak(profile?.shloka_streak ?? 0);
      setSevaScore(profile?.seva_score ?? 0);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  const days = FILTERS.find((f) => f.key === filter)!.days;
  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - days + 1);
    return d.toISOString().slice(0, 10);
  }, [days]);

  const filtered = useMemo(
    () => sessions.filter((s) => (malaSessionDate(s) || '') >= cutoff),
    [sessions, cutoff]
  );

  const stats = useMemo(() => {
    const byDate: Record<string, MalaSessionRow[]> = {};
    filtered.forEach((s) => {
      const key = malaSessionDate(s);
      if (!key) return;
      (byDate[key] ??= []).push(s);
    });

    const totalSessions = filtered.length;
    const totalRounds = filtered.reduce((a, s) => a + malaSessionRounds(s), 0);
    const totalBeads = filtered.reduce((a, s) => a + malaSessionBeads(s), 0);
    const totalSecs = filtered.reduce((a, s) => a + malaSessionDurationSeconds(s), 0);

    const dow = new Array(7).fill(0) as number[];
    filtered.forEach((s) => {
      const key = malaSessionDate(s);
      if (!key) return;
      dow[new Date(`${key}T12:00:00`).getDay()] += 1;
    });

    const mantraFreq = new Map<string, number>();
    filtered.forEach((s) => {
      const m = malaSessionMantra(s);
      if (m) mantraFreq.set(m, (mantraFreq.get(m) ?? 0) + 1);
    });
    const mantras = [...mantraFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxMantra = mantras[0]?.[1] ?? 1;

    return { activeDays: Object.keys(byDate).length, totalSessions, totalRounds, totalBeads, totalSecs, dow, mantras, maxMantra };
  }, [filtered]);

  const dateMap = useMemo(() => {
    const m: Record<string, MalaSessionRow[]> = {};
    sessions.forEach((s) => {
      const key = malaSessionDate(s);
      if (!key) return;
      (m[key] ??= []).push(s);
    });
    return m;
  }, [sessions]);

  const calCells = useMemo(() => {
    const first = new Date(cal.year, cal.month, 1);
    const last = new Date(cal.year, cal.month + 1, 0);
    const arr: (string | null)[] = new Array(first.getDay()).fill(null);
    for (let d = 1; d <= last.getDate(); d += 1) {
      arr.push(`${cal.year}-${String(cal.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [cal]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const calLabel = new Date(cal.year, cal.month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const maxDow = Math.max(...stats.dow, 1);

  async function handleShare() {
    try {
      await Share.share({
        message: `🪷 Bhakti Practice — ${stats.activeDays} active days, ${stats.totalRounds} rounds, ${stats.totalBeads.toLocaleString()} beads · 🔥 ${shlokaStreak}-day shloka streak · ⭐ ${sevaScore} Seva points`,
      });
    } catch {
      // user cancelled or share unavailable — non-fatal
    }
  }

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <BackButton style={{ marginBottom: 4 }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={ROSE} />
        </View>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <BackButton style={{ marginBottom: 4 }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 }}>
          <Text style={{ ...TYPE.body, color: theme.dim, textAlign: 'center' }}>Could not load your insights.</Text>
          <Button label="Retry" onPress={() => void load()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.bg, paddingHorizontal: 0, paddingVertical: 0 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <BackButton showLabel={false} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ ...TYPE.micro, letterSpacing: 1.6, textTransform: 'uppercase', color: `${ROSE}99` }}>Bhakti</Text>
            <Text style={{ ...TYPE.cardHeading, fontSize: 17, color: theme.text }}>Devotion Insights</Text>
          </View>
          <PressableSurface haptic="selection" onPress={() => void handleShare()} accessibilityLabel="Share insights" style={{ borderRadius: 999 }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
              <Feather name="share-2" size={15} color={ROSE} />
            </View>
          </PressableSurface>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <PressableSurface key={f.key} haptic="selection" onPress={() => setFilter(f.key)} style={{ borderRadius: 999 }}>
                <View style={{ borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: active ? ROSE : theme.card, borderWidth: 1, borderColor: active ? ROSE : theme.border }}>
                  <Text style={{ ...TYPE.caption, fontWeight: '700', color: active ? COLORS.onMediaWhite : theme.dim }}>{f.label}</Text>
                </View>
              </PressableSurface>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          {/* Devotion hero */}
          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: `${ROSE}30`, backgroundColor: `${ROSE}0c`, padding: 18, flexDirection: 'row', justifyContent: 'space-around' }}>
            {[
              { label: 'Shloka Streak', value: shlokaStreak, icon: '🔥' },
              { label: 'Seva Score', value: sevaScore, icon: '⭐' },
              { label: 'Active Days', value: stats.activeDays, icon: '🪷' },
            ].map((item) => (
              <View key={item.label} style={{ alignItems: 'center', gap: 2 }}>
                <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                <Text style={{ fontFamily: FONTS.serifBold, fontSize: 22, color: theme.text }}>{item.value}</Text>
                <Text style={{ ...TYPE.micro, color: theme.dim, textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'center' }}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* Stat grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {[
              { key: 'sessions', label: 'Sessions', value: String(stats.totalSessions), icon: '🕉️', detail: `${stats.totalSessions} bhakti sessions in this period. Each sitting is an offering to the divine.` },
              { key: 'rounds', label: 'Rounds', value: String(stats.totalRounds), icon: '📿', detail: `${stats.totalRounds} mala rounds chanted. The mantra purifies the mind one bead at a time.` },
              { key: 'beads', label: 'Beads Chanted', value: stats.totalBeads >= 1000 ? `${(stats.totalBeads / 1000).toFixed(1)}k` : String(stats.totalBeads), icon: '🪷', detail: `${stats.totalBeads.toLocaleString()} individual mantra repetitions. Each bead is a seed of devotion.` },
              { key: 'time', label: 'Time in Bhakti', value: fmtTime(stats.totalSecs), icon: '⏱️', detail: `${fmtTime(stats.totalSecs)} of devoted practice time. Consistency deepens devotion.` },
            ].map((tile) => (
              <PressableSurface
                key={tile.key}
                haptic="selection"
                onPress={() => setOpenDetail((cur) => (cur === tile.key ? null : tile.key))}
                style={{ width: '47%', borderRadius: 16 }}
              >
                <View style={{ borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, padding: 14, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ ...TYPE.micro, color: theme.dim }}>{tile.label}</Text>
                      <Text style={{ fontFamily: FONTS.serifBold, fontSize: 22, color: theme.text, marginTop: 2 }}>{tile.value}</Text>
                    </View>
                    <Text style={{ fontSize: 18 }}>{tile.icon}</Text>
                  </View>
                  {openDetail === tile.key ? (
                    <Text style={{ ...TYPE.micro, color: theme.dim, marginTop: 6, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 6, lineHeight: 15 }}>
                      {tile.detail}
                    </Text>
                  ) : null}
                </View>
              </PressableSurface>
            ))}
          </View>

          {/* Mantra frequency */}
          {stats.mantras.length > 0 && (
            <View style={{ borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, padding: 16, gap: 12 }}>
              <Text style={{ ...TYPE.micro, letterSpacing: 1, textTransform: 'uppercase', color: `${ROSE}99` }}>Mantras Chanted</Text>
              {stats.mantras.map(([m, count]) => (
                <View key={m} style={{ gap: 5 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ ...TYPE.caption, color: theme.text, fontWeight: '600' }} numberOfLines={1}>{m.replace(/_/g, ' ')}</Text>
                    <Text style={{ ...TYPE.micro, color: theme.dim }}>{count}×</Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.border, overflow: 'hidden' }}>
                    <View style={{ width: `${(count / stats.maxMantra) * 100}%`, height: '100%', backgroundColor: ROSE, borderRadius: 3 }} />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* DOW chart */}
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, padding: 16, gap: 10 }}>
            <Text style={{ ...TYPE.micro, letterSpacing: 1, textTransform: 'uppercase', color: `${ROSE}99` }}>Practice by Day</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 72 }}>
              {stats.dow.map((v, i) => (
                <View key={i} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
                  <View style={{ width: '60%', height: Math.max(4, (v / maxDow) * 58), borderRadius: 4, backgroundColor: v > 0 ? ROSE : theme.border }} />
                  <Text style={{ ...TYPE.micro, color: theme.dim, fontWeight: '600' }}>{DAY_LETTERS[i]}</Text>
                </View>
              ))}
            </View>
            {stats.dow.some((v) => v > 0) ? (
              <Text style={{ ...TYPE.micro, color: theme.dim, textAlign: 'center' }}>
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][stats.dow.indexOf(Math.max(...stats.dow))]} is your most devoted day
              </Text>
            ) : null}
          </View>

          {/* Calendar */}
          <View style={{ gap: 10 }}>
            <Text style={{ ...TYPE.micro, letterSpacing: 1, textTransform: 'uppercase', color: `${ROSE}99`, paddingHorizontal: 2 }}>Calendar</Text>
            <View style={{ borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, padding: 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <PressableSurface haptic="selection" onPress={() => setCal((c) => { const d = new Date(c.year, c.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })} style={{ borderRadius: 16 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
                    <Feather name="chevron-left" size={16} color={ROSE} />
                  </View>
                </PressableSurface>
                <Text style={{ fontFamily: FONTS.serif, fontSize: 13, color: theme.text }}>{calLabel}</Text>
                <PressableSurface haptic="selection" onPress={() => setCal((c) => { const d = new Date(c.year, c.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })} style={{ borderRadius: 16 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
                    <Feather name="chevron-right" size={16} color={ROSE} />
                  </View>
                </PressableSurface>
              </View>

              <View style={{ flexDirection: 'row' }}>
                {DAY_LETTERS.map((d, i) => (
                  <Text key={i} style={{ ...TYPE.micro, color: theme.dim, flex: 1, textAlign: 'center' }}>{d}</Text>
                ))}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {calCells.map((iso, i) => {
                  if (!iso) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
                  const sess = dateMap[iso];
                  const isToday = iso === todayIso;
                  const isSel = iso === selDay;
                  return (
                    <View key={iso} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
                      <PressableSurface
                        haptic="selection"
                        onPress={() => setSelDay((cur) => (cur === iso ? null : iso))}
                        style={{ flex: 1, borderRadius: 999 }}
                      >
                        <View
                          style={{
                            flex: 1,
                            borderRadius: 999,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isSel ? ROSE : sess ? `${ROSE}28` : 'transparent',
                            borderWidth: isToday ? 1.5 : 0,
                            borderColor: ROSE,
                          }}
                        >
                          <Text style={{ ...TYPE.caption, fontWeight: '700', color: isSel ? COLORS.onMediaWhite : sess ? ROSE : theme.dim }}>
                            {Number(iso.slice(-2))}
                          </Text>
                        </View>
                      </PressableSurface>
                    </View>
                  );
                })}
              </View>

              {selDay ? (
                <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10 }}>
                  {dateMap[selDay] ? (
                    <Text style={{ ...TYPE.caption, color: theme.text }}>
                      {dateMap[selDay].length} session{dateMap[selDay].length !== 1 ? 's' : ''} ·{' '}
                      {dateMap[selDay].reduce((a, s) => a + malaSessionRounds(s), 0)} rounds ·{' '}
                      {dateMap[selDay].reduce((a, s) => a + malaSessionBeads(s), 0).toLocaleString()} beads 🪷
                    </Text>
                  ) : (
                    <Text style={{ ...TYPE.caption, color: theme.dim }}>
                      No bhakti session on {new Date(`${selDay}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.
                    </Text>
                  )}
                </View>
              ) : null}
            </View>
          </View>

          {/* Quote */}
          <View style={{ paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ fontFamily: FONTS.serif, fontStyle: 'italic', fontSize: 13, color: `${AMBER}99`, textAlign: 'center' }}>
              भक्तिर्भगवतो सेवा — devotion is service to the divine. You are on the path.
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
