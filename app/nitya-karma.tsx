import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { spiritualDate } from '@/lib/spiritualDate';
import { getAshramaMeta, getAshramaDuties, type LifeStage, type GenderContext } from '@/lib/ashrama';

type Phase = 'night' | 'brahma' | 'sunrise' | 'morning' | 'afternoon' | 'evening' | 'dusk';

type PhaseConfig = {
  grad: [string, string, string];
  accentColor: string;
  textColor: string;
  label: string;
  emoji: string;
};

const PHASES: Record<Phase, PhaseConfig> = {
  night: {
    grad: ['#080614', '#110d28', '#0b0820'],
    accentColor: '#a394e0',
    textColor: '#e8e0ff',
    label: 'Night Sadhana',
    emoji: '🌙',
  },
  brahma: {
    grad: ['#190830', '#3a1058', '#200828'],
    accentColor: '#d4a8f0',
    textColor: '#f5eeff',
    label: 'Brahma Muhurta',
    emoji: '✨',
  },
  sunrise: {
    grad: ['#3b1005', '#c85010', '#f09820'],
    accentColor: '#fcd068',
    textColor: '#fff8e8',
    label: 'Sacred Sunrise',
    emoji: '🌅',
  },
  morning: {
    grad: ['#7a2e08', '#d46810', '#f0b020'],
    accentColor: '#fce070',
    textColor: '#fff8e0',
    label: 'Morning Sadhana',
    emoji: '🌞',
  },
  afternoon: {
    grad: ['#7a3800', '#c87408', '#e8a418'],
    accentColor: '#fdd060',
    textColor: '#fff5d0',
    label: 'Afternoon Practice',
    emoji: '☀️',
  },
  evening: {
    grad: ['#5c0f0f', '#a42010', '#c84018'],
    accentColor: '#fca060',
    textColor: '#ffe8d8',
    label: 'Evening Sandhya',
    emoji: '🌇',
  },
  dusk: {
    grad: ['#130620', '#28103a', '#0f0818'],
    accentColor: '#c0a0e8',
    textColor: '#f0e8ff',
    label: 'Dusk Contemplation',
    emoji: '🌆',
  },
};

function getPhase(hour: number): Phase {
  if (hour >= 4 && hour < 6) return 'brahma';
  if (hour >= 6 && hour < 8) return 'sunrise';
  if (hour >= 8 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 16) return 'afternoon';
  if (hour >= 16 && hour < 19) return 'evening';
  if (hour >= 19 && hour < 21) return 'dusk';
  return 'night';
}

export default function NityaKarmaHubScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const theme = useMemo(
    () => ({
      bg: isDark ? COLORS.darkBg : COLORS.creamBg,
      card: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
      border: isDark ? COLORS.borderDark : COLORS.borderLight,
      text: isDark ? COLORS.creamBg : COLORS.ink,
      dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
    }),
    [isDark]
  );

  // Dynamic Phase based on time
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const phase = useMemo(() => getPhase(currentHour), [currentHour]);
  const phaseConf = PHASES[phase];

  // Dincharya stats
  const [dincharyaStats, setDincharyaStats] = useState({
    completed: 0,
    total: 0,
    greeting: 'Suprabhat 🌅',
    streak: 0,
  });

  // Ashrama stats
  const [ashramaStats, setAshramaStats] = useState({
    stage: null as string | null,
    tradition: 'hindu',
    genderCtx: null as GenderContext | null,
    dutiesCount: 0,
    completedDuties: 0,
  });

  const [loading, setLoading] = useState(true);

  // Periodically check/update the hour to keep sky dynamic
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadHubData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      // 1. Fetch Dincharya from backend API
      const nityaResp = await apiFetch('/api/native/nitya-karma');
      let completedCount = 0;
      let totalSteps = 0;
      let greetingText = 'Suprabhat 🌅';
      let currentStreak = 0;

      if (nityaResp.ok) {
        const payload = await nityaResp.json();
        totalSteps = payload.total ?? 0;
        greetingText = payload.greeting ?? 'Suprabhat 🌅';
        currentStreak = payload.streak?.current ?? 0;

        // Merge with local storage done ticks to get correct count
        const today = spiritualDate(payload.timezone ?? 'UTC');
        const storageKey = `nitya_done_${user.id}_${today}`;
        const rawLocal = await AsyncStorage.getItem(storageKey);
        const localDoneIds = new Set<string>(rawLocal ? JSON.parse(rawLocal) : []);
        const mergedSteps = payload.steps?.map((step: any) => ({
          ...step,
          done: step.done || localDoneIds.has(step.id),
        })) ?? [];
        completedCount = mergedSteps.filter((s: any) => s.done).length;
      }

      setDincharyaStats({
        completed: completedCount,
        total: totalSteps,
        greeting: greetingText,
        streak: currentStreak,
      });

      // 2. Fetch Profile to get Ashrama
      const { data: profile } = await supabase
        .from('profiles')
        .select('life_stage, gender_context, tradition, timezone')
        .eq('id', user.id)
        .maybeSingle();

      const tradition = profile?.tradition ?? 'hindu';
      const lifeStage = profile?.life_stage as LifeStage | null;
      const genderCtx = profile?.gender_context ?? null;

      let dutiesCount = 0;
      let completedDuties = 0;

      if (lifeStage) {
        const duties = getAshramaDuties(tradition, lifeStage, genderCtx);
        dutiesCount = duties.length;

        const today = spiritualDate(profile?.timezone ?? 'UTC');
        const ashramaKey = `ashrama_checks_${user.id}_${today}`;
        const rawChecks = await AsyncStorage.getItem(ashramaKey);
        const checkedIds = new Set<string>(rawChecks ? JSON.parse(rawChecks) : []);
        completedDuties = duties.filter(d => checkedIds.has(d.id)).length;
      }

      setAshramaStats({
        stage: lifeStage,
        tradition,
        genderCtx,
        dutiesCount,
        completedDuties,
      });

    } catch (err) {
      console.warn('Failed to load Hub data:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      loadHubData();
    }, [loadHubData])
  );

  const progressPct = dincharyaStats.total > 0 ? (dincharyaStats.completed / dincharyaStats.total) * 100 : 0;
  const ashramaMeta = ashramaStats.stage
    ? getAshramaMeta(ashramaStats.tradition, ashramaStats.stage as LifeStage, ashramaStats.genderCtx)
    : null;

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Dynamic Atmospheric Sky Header */}
        <LinearGradient
          colors={phaseConf.grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            paddingTop: 36,
            paddingBottom: 28,
            paddingHorizontal: 20,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            gap: 16,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'flex-start',
            }}
          >
            <Feather name="chevron-left" size={20} color={phaseConf.textColor} />
          </Pressable>

          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 24 }}>{phaseConf.emoji}</Text>
              <Text
                style={{
                  color: phaseConf.accentColor,
                  fontFamily: FONTS.sansSemiBold,
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: 1.5,
                }}
              >
                {phaseConf.label}
              </Text>
            </View>
            <Text style={{ color: phaseConf.textColor, fontFamily: FONTS.serifBold, fontSize: 32, lineHeight: 38 }}>
              {dincharyaStats.greeting}
            </Text>
            {dincharyaStats.streak > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Feather name="award" size={14} color={phaseConf.accentColor} />
                <Text style={{ color: phaseConf.textColor, fontFamily: FONTS.sansSemiBold, fontSize: 13, opacity: 0.9 }}>
                  {dincharyaStats.streak}-day streak
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, paddingTop: 24, gap: 16 }}>
          {loading ? (
            <ActivityIndicator color={COLORS.brandGold} style={{ marginTop: 40 }} />
          ) : (
            <View style={{ gap: 14 }}>
              {/* Card 1: Dincharya checklist */}
              <Card style={{ backgroundColor: theme.card, borderColor: theme.border, padding: 0, overflow: 'hidden' }}>
                <Pressable
                  onPress={() => router.push('/nitya-dincharya')}
                  style={{ padding: 18, gap: 12 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(197,160,89,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 22 }}>🌅</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 18 }}>Dincharya</Text>
                        <View style={{ backgroundColor: 'rgba(34,197,94,0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                          <Text style={{ color: 'rgb(34,197,94)', fontFamily: FONTS.sansSemiBold, fontSize: 9 }}>FREE</Text>
                        </View>
                      </View>
                      <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, marginTop: 2 }}>
                        Daily morning sequence of 7 steps
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={theme.dim} />
                  </View>

                  <View style={{ gap: 4 }}>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: isDark ? 'rgba(197,160,89,0.12)' : 'rgba(197,160,89,0.08)', overflow: 'hidden' }}>
                      <View style={{ width: `${progressPct}%`, height: '100%', backgroundColor: COLORS.brandGold }} />
                    </View>
                    <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 10, textAlign: 'right' }}>
                      {dincharyaStats.completed} of {dincharyaStats.total} completed
                    </Text>
                  </View>
                </Pressable>
              </Card>

              {/* Card 2: Sadhana Patha */}
              <Card style={{ backgroundColor: theme.card, borderColor: theme.border, padding: 0, overflow: 'hidden' }}>
                <Pressable
                  onPress={() => router.push('/nitya-plans')}
                  style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(197,160,89,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>📿</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 18 }}>Sadhana Patha</Text>
                    <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, marginTop: 2 }}>
                      7 & 21-day guided paths and structured practices
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.dim} />
                </Pressable>
              </Card>

              {/* Card 3: Ashrama Dharma */}
              <Card style={{ backgroundColor: theme.card, borderColor: theme.border, padding: 0, overflow: 'hidden' }}>
                <Pressable
                  onPress={() => router.push('/nitya-ashrama')}
                  style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: ashramaMeta ? `${ashramaMeta.accent}15` : 'rgba(197,160,89,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>🧘</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 18 }}>Ashrama Dharma</Text>
                      {!ashramaStats.stage && (
                        <View style={{ backgroundColor: 'rgba(197,160,89,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                          <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 9 }}>Set up</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, marginTop: 2 }}>
                      {ashramaMeta
                        ? `${ashramaMeta.label} duties · ${ashramaStats.completedDuties}/${ashramaStats.dutiesCount} reflected today`
                        : 'Life-stage duties personalised to your Ashrama'}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.dim} />
                </Pressable>
              </Card>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
