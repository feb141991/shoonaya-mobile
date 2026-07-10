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
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

// Reuses GET /api/native/progress (also used by ../my-progress.tsx) rather
// than a dedicated route — this screen only needs 2 of the fields it
// already returns (latest streak_count, all-time session count), so a
// third endpoint isn't justified. Note: previously this screen's own
// direct query had no date window (`order('date',{ascending:false}).limit(1)`
// over all history); the shared route windows daily_sadhana to the last
// 182 days like my-progress.tsx does. A real "current streak" always has
// a row inside a 182-day window, so this only changes behavior for an
// account with a stale, effectively-dead streak value older than 6
// months — an edge case, and it now matches my-progress.tsx's own
// windowing instead of silently disagreeing with it.
type ProgressApiResponse = {
  sadhana182d: { date: string; streak_count: number | null }[];
  totalJapaSessions: number;
};

const STREAK_SHIELDS = [
  { threshold: 7,   name: 'Saptāha',     emoji: '🔥', desc: '7-day streak',    detail: 'Seven days of unbroken sādhana — a full week of niyama.' },
  { threshold: 21,  name: 'Niyama',      emoji: '🕯️', desc: '21-day streak',   detail: 'Twenty-one days — the ancient threshold where habit becomes nature.' },
  { threshold: 40,  name: 'Chālisā',    emoji: '🌟', desc: '40-day streak',   detail: 'Forty days of tapas. The number sacred across all traditions.' },
  { threshold: 54,  name: 'Ardha Mālā', emoji: '📿', desc: '54-day streak',   detail: 'Half a mālā. Your practice is deep and rooted.' },
  { threshold: 108, name: 'Pūrṇa Mālā', emoji: '🙏', desc: '108-day streak',  detail: '108 days — pūrṇa, complete. A full mālā of devotion.' },
];
const SESSION_SHIELDS = [
  { threshold: 1,   name: 'Prārambha', emoji: '🌱', desc: '1st session',      detail: 'The first step on a thousand-mile journey. Your karma begins.' },
  { threshold: 10,  name: 'Dasama',    emoji: '🌿', desc: '10 sessions',      detail: 'A solid foundation built. Ten focused sessions of devotion.' },
  { threshold: 25,  name: 'Prajñā',    emoji: '✨', desc: '25 sessions',      detail: 'Quarter-century of sessions. Wisdom starts to illuminate the mind.' },
  { threshold: 54,  name: 'Ardham',    emoji: '🌕', desc: '54 sessions',      detail: 'The halfway point of a complete cycle.' },
  { threshold: 108, name: 'Pūrṇatva',  emoji: '🌅', desc: '108 sessions',     detail: 'A sacred cycle complete. 108 separate moments of divine connection.' },
  { threshold: 500, name: 'Tapasvī',   emoji: '🏔️', desc: '500 sessions',     detail: 'Deep ascetic practice. A milestone of immense spiritual gravity.' },
];

export default function ShieldsScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const router = useRouter();

  const h1 = isDark ? '#f5dfa0' : '#1a0a02';
  const muted = isDark ? 'rgba(245,210,130,0.45)' : 'rgba(100,55,10,0.50)';
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState<'streak' | 'sessions'>('streak');
  const [streak, setStreak] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);

  const loadData = useCallback(async () => {
    setLoadError(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

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
    const sadhanaRows = payload.sadhana182d || [];
    const latestStreakCount = sadhanaRows.sort((a, b) => b.date.localeCompare(a.date))[0]?.streak_count ?? 0;

    setStreak(latestStreakCount);
    setTotalSessions(payload.totalJapaSessions || 0);
  }, [router]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  if (loading) {
    return (
      <Screen style={{ flex: 1, backgroundColor: isDark ? COLORS.darkBg : COLORS.creamBg, paddingHorizontal: 0, paddingBottom: 0 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.brandGold} />
        </View>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen
        style={{ flex: 1, backgroundColor: isDark ? COLORS.darkBg : COLORS.creamBg, paddingHorizontal: 0, paddingBottom: 0 }}
        header={{ title: 'Shields & Milestones', onBack: () => router.back() }}
      >
        <EmptyState
          icon="alert-circle"
          title="Couldn't load your shields"
          subtitle="Check your connection and try again."
          ctaLabel="Retry"
          onCta={() => { setLoading(true); loadData().finally(() => setLoading(false)); }}
        />
      </Screen>
    );
  }

  const shields = activeTab === 'streak' ? STREAK_SHIELDS : SESSION_SHIELDS;
  const value = activeTab === 'streak' ? streak : totalSessions;

  const earnedCount = shields.filter(s => value >= s.threshold).length;
  const nextShield = shields.find(s => s.threshold > value);
  const progress = nextShield ? Math.round((value / nextShield.threshold) * 100) : 100;

  return (
    <Screen 
      style={{ flex: 1, backgroundColor: isDark ? COLORS.darkBg : COLORS.creamBg, paddingHorizontal: 0, paddingBottom: 0 }}
      header={{ title: 'Shields & Milestones', onBack: () => router.back() }}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        
        {/* Tabs */}
        <View style={{ flexDirection: 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 24, padding: 4, marginBottom: 24 }}>
          {(['streak', 'sessions'] as const).map(tf => (
            <Pressable
              key={tf}
              onPress={() => setActiveTab(tf)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: activeTab === tf ? (isDark ? 'rgba(197,160,89,0.15)' : 'rgba(197,160,89,0.12)') : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: activeTab === tf ? h1 : muted, textTransform: 'capitalize' }}>
                {tf} ({tf === 'streak' ? streak : totalSessions})
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Next Shield Progress */}
        {nextShield && (
          <View style={{ backgroundColor: cardBg, borderColor: border, borderWidth: 1, borderRadius: 24, padding: 16, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: muted, marginBottom: 2 }}>Next milestone</Text>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: h1 }}>
                  {nextShield.emoji} {nextShield.name}
                  <Text style={{ color: muted, fontFamily: FONTS.sans }}> • {nextShield.desc}</Text>
                </Text>
              </View>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: '#C5A059' }}>{value} / {nextShield.threshold}</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${progress}%`, backgroundColor: '#C5A059', borderRadius: 4 }} />
            </View>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: muted, marginTop: 8 }}>
              {nextShield.threshold - value} more {activeTab === 'streak' ? 'days' : 'sessions'} to unlock
            </Text>
          </View>
        )}

        {/* Shields List */}
        <View style={{ backgroundColor: cardBg, borderColor: border, borderWidth: 1, borderRadius: 24, padding: 20 }}>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: '#C5A059', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
            {earnedCount}/{shields.length} Earned
          </Text>

          <View style={{ gap: 16 }}>
            {shields.map((shield, idx) => {
              const earned = value >= shield.threshold;
              
              return (
                <View key={shield.threshold}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      width: 56, height: 56, borderRadius: 16,
                      backgroundColor: earned ? (isDark ? 'rgba(197, 160, 89,0.20)' : 'rgba(197, 160, 89,0.14)') : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
                      borderColor: earned ? 'rgba(197, 160, 89,0.45)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
                      borderWidth: 1.5,
                      alignItems: 'center', justifyContent: 'center',
                      marginRight: 16,
                      opacity: earned ? 1 : 0.4,
                    }}>
                      <Text style={{ fontSize: 24 }}>{shield.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: earned ? h1 : muted }}>{shield.name}</Text>
                        <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: muted }}>{shield.desc}</Text>
                      </View>
                      <Text style={{ fontFamily: FONTS.serif, fontSize: 12, color: muted, marginTop: 4 }}>
                        {shield.detail}
                      </Text>
                      {earned && (
                        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: '#C5A059', marginTop: 4 }}>Unlocked ✦</Text>
                      )}
                    </View>
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: muted }}>
                      {earned ? shield.threshold : `${value}/${shield.threshold}`}
                    </Text>
                  </View>
                  
                  {idx < shields.length - 1 && (
                    <View style={{ height: 1, backgroundColor: border, marginTop: 16 }} />
                  )}
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>
    </Screen>
  );
}
