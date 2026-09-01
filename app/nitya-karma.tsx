import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { IconTile } from '@/components/ui/IconTile';
import { Screen } from '@/components/ui/Screen';
import { useFallbackBackHandler } from '@/components/ui/BackButton';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { spiritualDate } from '@/lib/spiritualDate';
import { isGuestMode } from '@/lib/guestSession';
import { getAshramaDuties, getAshramaMeta, type GenderContext, type LifeStage } from '@/lib/ashrama';

type Phase = 'night' | 'brahma' | 'sunrise' | 'morning' | 'afternoon' | 'evening' | 'dusk';

type PhaseConfig = {
  label: string;
  headline: string;
  detail: string;
  glyph: keyof typeof Feather.glyphMap;
};

type NativeNityaStepSummary = {
  id: string;
  done?: boolean;
};

type NativeNityaKarmaResponse = {
  total?: number;
  greeting?: string;
  timezone?: string;
  streak?: { current?: number };
  steps?: NativeNityaStepSummary[];
};

const PHASES: Record<Phase, PhaseConfig> = {
  night: {
    label: 'Night Sadhana',
    headline: 'Close the day with steadiness',
    detail: 'Let the next morning begin from a calmer night.',
    glyph: 'moon',
  },
  brahma: {
    label: 'Brahma Muhurta',
    headline: 'The quiet hour is open',
    detail: 'A soft start for japa, bathing, and scripture.',
    glyph: 'star',
  },
  sunrise: {
    label: 'Sacred Sunrise',
    headline: 'Begin before the day scatters',
    detail: 'Move through your sequence while the mind is fresh.',
    glyph: 'sunrise',
  },
  morning: {
    label: 'Morning Sadhana',
    headline: 'Shape the day from practice',
    detail: 'Complete the core rhythm before the outer work begins.',
    glyph: 'sun',
  },
  afternoon: {
    label: 'Afternoon Practice',
    headline: 'Return to the thread',
    detail: 'Even one completed step keeps the rhythm alive.',
    glyph: 'compass',
  },
  evening: {
    label: 'Evening Sandhya',
    headline: 'Gather the day back inward',
    detail: 'A gentle review before dusk turns into night.',
    glyph: 'sunset',
  },
  dusk: {
    label: 'Dusk Contemplation',
    headline: 'Let the mind settle',
    detail: 'Close what is unfinished and prepare for rest.',
    glyph: 'moon',
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

function AmbientBackdrop({ isDark, brand }: { isDark: boolean; brand: string }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      <LinearGradient
        colors={
          isDark
            ? [COLORS.heroBgDark, COLORS.darkBg, COLORS.homeHeroDark]
            : [COLORS.brandAccentLight, COLORS.creamBg, COLORS.homeHeroLight]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 760">
        <Defs>
          <RadialGradient id="nityaTop" cx="50%" cy="18%" r="52%">
            <Stop offset="0%" stopColor={brand} stopOpacity={isDark ? '0.24' : '0.18'} />
            <Stop offset="100%" stopColor={brand} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="nityaLower" cx="82%" cy="82%" r="48%">
            <Stop offset="0%" stopColor={isDark ? COLORS.creamBg : COLORS.brandEarthLight} stopOpacity={isDark ? '0.08' : '0.10'} />
            <Stop offset="100%" stopColor={isDark ? COLORS.creamBg : COLORS.brandEarthLight} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="180" cy="140" r="220" fill="url(#nityaTop)" />
        <Circle cx="302" cy="626" r="170" fill="url(#nityaLower)" />
        <Circle cx="180" cy="244" r="112" stroke={brand} strokeOpacity="0.08" strokeWidth="1.2" fill="none" />
        <Circle cx="180" cy="244" r="76" stroke={brand} strokeOpacity="0.06" strokeWidth="1" fill="none" />
        <Path d="M40 352 C92 322 132 340 180 354 C232 340 272 322 320 352" stroke={brand} strokeOpacity="0.10" strokeWidth="2.2" fill="none" />
      </Svg>
    </View>
  );
}

function ProgressRing({ value, total, brand, track }: { value: number; total: number; brand: string; track: string }) {
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  return (
    <View style={{ width: 72, height: 72, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={72} height={72} viewBox="0 0 72 72" style={{ position: 'absolute' }}>
        <Circle cx="36" cy="36" r={radius} stroke={track} strokeWidth="6" fill="none" />
        <Circle
          cx="36"
          cy="36"
          r={radius}
          stroke={brand}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - pct)}
          rotation="-90"
          originX="36"
          originY="36"
        />
      </Svg>
      <Text style={{ ...TYPE.metric, color: brand }}>{total > 0 ? Math.round(pct * 100) : 0}</Text>
    </View>
  );
}

export default function NityaKarmaHubScreen() {
  const router = useRouter();
  const handleBack = useFallbackBackHandler('/(tabs)', true);
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const phase = useMemo(() => getPhase(currentHour), [currentHour]);
  const phaseConf = PHASES[phase];

  const [dincharyaStats, setDincharyaStats] = useState({
    completed: 0,
    total: 0,
    greeting: 'Suprabhat',
    streak: 0,
  });

  const [ashramaStats, setAshramaStats] = useState({
    stage: null as string | null,
    tradition: 'hindu',
    genderCtx: null as GenderContext | null,
    dutiesCount: 0,
    completedDuties: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadHubData = useCallback(async () => {
    setLoading(true);
    try {
      const guest = await isGuestMode();
      if (guest) {
        setDincharyaStats({
          completed: 0,
          total: 5,
          greeting: 'Suprabhat',
          streak: 0,
        });
        setAshramaStats({
          stage: 'student',
          tradition: 'hindu',
          genderCtx: 'general',
          dutiesCount: 0,
          completedDuties: 0,
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      const nityaResp = await apiFetch('/api/native/nitya-karma');
      let completedCount = 0;
      let totalSteps = 0;
      let greetingText = 'Suprabhat';
      let currentStreak = 0;

      if (nityaResp.ok) {
        const payload = (await nityaResp.json()) as NativeNityaKarmaResponse;
        totalSteps = payload.total ?? 0;
        greetingText = payload.greeting ?? 'Suprabhat';
        currentStreak = payload.streak?.current ?? 0;

        const today = spiritualDate(payload.timezone ?? 'UTC');
        const storageKey = `nitya_done_${user.id}_${today}`;
        const rawLocal = await AsyncStorage.getItem(storageKey);
        const localDoneIds = new Set<string>(rawLocal ? JSON.parse(rawLocal) : []);
        const mergedSteps = payload.steps?.map((step) => ({
          ...step,
          done: step.done || localDoneIds.has(step.id),
        })) ?? [];
        completedCount = mergedSteps.filter((step) => step.done).length;
      }

      setDincharyaStats({
        completed: completedCount,
        total: totalSteps,
        greeting: greetingText,
        streak: currentStreak,
      });

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
        completedDuties = duties.filter((duty) => checkedIds.has(duty.id)).length;
      }

      setAshramaStats({
        stage: lifeStage,
        tradition,
        genderCtx,
        dutiesCount,
        completedDuties,
      });
    } catch (err) {
      console.warn('Failed to load Nitya hub data:', err);
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
  const progressLabel = dincharyaStats.total > 0
    ? `${dincharyaStats.completed} of ${dincharyaStats.total} completed`
    : 'Start your morning sequence';

  return (
    <Screen style={{ backgroundColor: theme.bg, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
      <AmbientBackdrop isDark={isDark} brand={theme.brand} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 34 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: 4, gap: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <PressableSurface
              haptic="selection"
              accessibilityLabel="Go back"
              onPress={handleBack}
              style={{
                width: MIN_TOUCH_TARGET,
                height: MIN_TOUCH_TARGET,
                borderRadius: 22,
                backgroundColor: theme.glass,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="chevron-left" size={19} color={theme.text} />
            </PressableSurface>

            {dincharyaStats.streak > 0 ? (
              <View
                style={{
                  minHeight: MIN_TOUCH_TARGET,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 7,
                  backgroundColor: theme.glass,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                }}
              >
                <Feather name="award" size={15} color={theme.brand} />
                <Text style={{ ...TYPE.label, color: theme.text }}>{dincharyaStats.streak}-day streak</Text>
              </View>
            ) : null}
          </View>

          <View style={{ gap: 14, paddingTop: 10, paddingBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.brandSoft,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                }}
              >
                <Feather name={phaseConf.glyph} size={22} color={theme.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...TYPE.section, color: theme.brand }}>{phaseConf.label}</Text>
                <Text style={{ ...TYPE.homeHeroGreeting, color: theme.text, marginTop: 3 }}>{dincharyaStats.greeting}</Text>
              </View>
            </View>

            <Text style={{ ...TYPE.display, color: theme.text }}>
              {phaseConf.headline}
            </Text>
            <Text style={{ ...TYPE.homeHeroMeaning, color: theme.dim, maxWidth: 310 }}>
              {phaseConf.detail}
            </Text>
          </View>

          {loading ? (
            <View
              style={{
                minHeight: 180,
                borderRadius: 28,
                backgroundColor: theme.glass,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ActivityIndicator color={theme.brand} />
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              <PressableSurface
                haptic="selection"
                accessibilityLabel={`Open Dincharya. ${progressLabel}`}
                onPress={() => router.push('/nitya-dincharya')}
                style={{
                  borderRadius: 28,
                  padding: 18,
                  gap: 16,
                  backgroundColor: theme.glass,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                  boxShadow: isDark ? SHADOWS.heroCard.dark : SHADOWS.heroCard.light,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <IconTile name="nitya" fallbackGlyph="sunrise" size="lg" color={theme.brand} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...TYPE.cardHeading, color: theme.text }}>Dincharya</Text>
                    <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 3 }}>
                      Daily morning sequence of seven steps
                    </Text>
                  </View>
                  <ProgressRing
                    value={dincharyaStats.completed}
                    total={dincharyaStats.total}
                    brand={theme.brand}
                    track={isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight}
                  />
                </View>

                <View style={{ gap: 7 }}>
                  <View
                    style={{
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        width: `${progressPct}%`,
                        height: '100%',
                        borderRadius: 999,
                        backgroundColor: theme.brand,
                      }}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ ...TYPE.label, color: theme.text }}>{progressLabel}</Text>
                    <Feather name="arrow-right" size={16} color={theme.brand} />
                  </View>
                </View>
              </PressableSurface>

              <PressableSurface
                haptic="selection"
                accessibilityLabel="Open Sadhana Patha"
                onPress={() => router.push('/nitya-plans')}
                style={{
                  minHeight: 78,
                  borderRadius: 24,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                  boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                }}
              >
                <IconTile name="japa" fallbackGlyph="disc" size="md" color={theme.brand} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...TYPE.cardHeading, color: theme.text }}>Sadhana Patha</Text>
                  <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 2 }}>
                    Seven and twenty-one day guided paths
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={theme.dim} />
              </PressableSurface>

              <PressableSurface
                haptic="selection"
                accessibilityLabel="Open Ashrama Dharma"
                onPress={() => router.push('/nitya-ashrama')}
                style={{
                  minHeight: 78,
                  borderRadius: 24,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                  boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 18, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="compass" size={21} color={theme.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ ...TYPE.cardHeading, color: theme.text }}>Ashrama Dharma</Text>
                    {!ashramaStats.stage ? (
                      <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: theme.brandSoft }}>
                        <Text style={{ ...TYPE.chip, color: theme.brand }}>Set up</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 2 }}>
                    {ashramaMeta
                      ? `${ashramaMeta.label} duties - ${ashramaStats.completedDuties}/${ashramaStats.dutiesCount} reflected today`
                      : 'Life-stage duties personalised to your Ashrama'}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={theme.dim} />
              </PressableSurface>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
