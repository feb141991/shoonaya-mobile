import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS } from '@/lib/constants';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { spiritualDate } from '@/lib/spiritualDate';

// Native Nitya Karma — the first native destination for Home's "Nitya Karma"
// practice row (previously silently fell back to /panchang, see
// mapHrefToRoute in app/(tabs)/index.tsx). Minimal, contract-backed screen:
// morning sequence only, matching /api/native/nitya-karma's own scope note
// (web's midday/evening/night sections are off by default too). No local
// business logic — step content, tradition labels, and streak all come from
// the API; this screen only renders and marks steps done.

type NityaStep = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  description: string;
  minutes: number;
  done: boolean;
};

type NitySummary = {
  greeting: string;
  allDoneMessage: string;
  steps: NityaStep[];
  completedCount: number;
  total: number;
  allDone: boolean;
  streak: { current: number; longest: number };
};

const EMPTY_STATE: NitySummary = {
  greeting: 'Suprabhat 🌅',
  allDoneMessage: 'Your morning sadhana is complete.',
  steps: [],
  completedCount: 0,
  total: 0,
  allDone: false,
  streak: { current: 0, longest: 0 },
};

export default function NityaKarmaScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const [state, setState] = useState<NitySummary>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busyStepId, setBusyStepId] = useState<string | null>(null);
  const [localKey, setLocalKey] = useState<string | null>(null);

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

  const loadNitya = useCallback(async () => {
    setLoadError(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', user.id)
      .maybeSingle();

    const today = spiritualDate(profile?.timezone ?? 'UTC');
    const storageKey = `nitya_done_${user.id}_${today}`;
    setLocalKey(storageKey);

    const rawLocal = await AsyncStorage.getItem(storageKey);
    const localDoneIds = new Set<string>(rawLocal ? JSON.parse(rawLocal) : []);

    const response = await apiFetch('/api/native/nitya-karma');

    if (response.status === 401) {
      router.replace('/(auth)/login');
      return;
    }

    if (!response.ok) {
      throw new Error('Could not load Nitya Karma');
    }

    const payload = (await response.json()) as NitySummary;
    const mergedSteps = payload.steps.map(step => ({
      ...step,
      done: step.done || localDoneIds.has(step.id),
    }));
    const completedCount = mergedSteps.filter(s => s.done).length;

    setState({
      ...EMPTY_STATE,
      ...payload,
      steps: mergedSteps,
      completedCount,
      allDone: completedCount === mergedSteps.length
    });
  }, [router]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        await loadNitya();
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [loadNitya]);

  const markStep = useCallback(
    async (step: NityaStep) => {
      if (step.done || busyStepId) return;

      setBusyStepId(step.id);
      try {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}

      // Optimistic update — mirrors NityaKarmaClient.tsx's own instant-mark
      // behaviour rather than waiting on the round trip.
      setState((prev) => {
        const steps = prev.steps.map((s) => (s.id === step.id ? { ...s, done: true } : s));
        const completedCount = steps.filter((s) => s.done).length;
        return { ...prev, steps, completedCount, allDone: completedCount === steps.length };
      });

      if (localKey) {
        try {
          const rawLocal = await AsyncStorage.getItem(localKey);
          const existing = new Set<string>(rawLocal ? JSON.parse(rawLocal) : []);
          existing.add(step.id);
          await AsyncStorage.setItem(localKey, JSON.stringify([...existing]));
        } catch {}
      }

      try {
        const response = await apiFetch('/api/native/nitya-karma', {
          method: 'POST',
          body: JSON.stringify({ step_id: step.id }),
        });

        if (!response.ok) {
          throw new Error('mark failed');
        }

        try {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      } catch {
        // Revert the optimistic update on failure.
        setState((prev) => {
          const steps = prev.steps.map((s) => (s.id === step.id ? { ...s, done: false } : s));
          const completedCount = steps.filter((s) => s.done).length;
          return { ...prev, steps, completedCount, allDone: false };
        });
      } finally {
        setBusyStepId(null);
      }
    },
    [busyStepId, localKey]
  );

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.brandGold} />
        </View>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Feather name="chevron-left" size={16} color={theme.dim} />
          <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
        </Pressable>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="sunrise"
            title="Could not load Nitya Karma"
            subtitle="Check your connection and try again."
            ctaLabel="Retry"
            onCta={() => {
              setLoading(true);
              loadNitya()
                .catch(() => setLoadError(true))
                .finally(() => setLoading(false));
            }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="chevron-left" size={16} color={theme.dim} />
          <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
        </Pressable>

        <View>
          <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 30 }}>Nitya Karma</Text>
          <Text style={{ marginTop: 4, color: theme.dim, fontFamily: FONTS.sans, fontSize: 14 }}>
            {state.greeting}
          </Text>
        </View>

        {state.streak.current > 0 ? (
          <Card style={{ backgroundColor: theme.card, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Feather name="award" size={20} color={COLORS.brandGold} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>
                {state.streak.current}-day streak
              </Text>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, marginTop: 2 }}>
                Longest: {state.streak.longest} days
              </Text>
            </View>
          </Card>
        ) : null}

        {state.allDone && state.total > 0 ? (
          <Card
            style={{
              backgroundColor: COLORS.successBg,
              borderColor: COLORS.successBorder,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Feather name="check-circle" size={20} color={COLORS.success} />
            <Text style={{ flex: 1, color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 13, lineHeight: 19 }}>
              {state.allDoneMessage}
            </Text>
          </Card>
        ) : (
          <Card style={{ backgroundColor: theme.card, borderColor: theme.border }}>
            <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>
              {state.completedCount} of {state.total} complete
            </Text>
            <View
              style={{
                marginTop: 10,
                height: 6,
                borderRadius: 3,
                backgroundColor: isDark ? 'rgba(197,160,89,0.16)' : 'rgba(197,160,89,0.14)',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${state.total > 0 ? (state.completedCount / state.total) * 100 : 0}%`,
                  height: '100%',
                  backgroundColor: COLORS.brandGold,
                  borderRadius: 3,
                }}
              />
            </View>
          </Card>
        )}

        <View style={{ gap: 10 }}>
          {state.steps.map((step) => {
            const isBusy = busyStepId === step.id;
            return (
              <Pressable
                key={step.id}
                accessibilityRole="button"
                accessibilityLabel={`${step.label}, ${step.done ? 'done' : 'mark as done'}`}
                disabled={step.done || isBusy}
                onPress={() => markStep(step)}
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: step.done ? COLORS.successBorder : theme.border,
                  backgroundColor: step.done ? COLORS.successBg : theme.card,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 64,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isDark ? 'rgba(255,248,225,0.06)' : 'rgba(255,255,255,0.6)',
                  }}
                >
                  <Feather name={step.icon} size={18} color={step.done ? COLORS.success : COLORS.brandGold} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
                    {step.label}
                  </Text>
                  <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, marginTop: 2 }}>
                    {step.description}
                    {step.minutes > 0 ? ` · ${step.minutes} min` : ''}
                  </Text>

                  {/* Action row: Copy & Share Note */}
                  <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                    <Pressable
                      onPress={() => {
                        Clipboard.setStringAsync(`${step.label}\n${step.description}`)
                          .catch(() => {});
                      }}
                      hitSlop={8}
                    >
                      <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 11, textDecorationLine: 'underline' }}>
                        Copy note
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        Share.share({ message: `${step.label}\n${step.description}` })
                          .catch(() => {});
                      }}
                      hitSlop={8}
                    >
                      <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 11, textDecorationLine: 'underline' }}>
                        Share note
                      </Text>
                    </Pressable>
                  </View>

                  {/* Deep links */}
                  {step.id === 'japa_done' && !step.done && (
                    <Pressable
                      onPress={() => router.push('/japa')}
                      style={{ marginTop: 8 }}
                      hitSlop={8}
                    >
                      <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                        Open Japa Counter →
                      </Text>
                    </Pressable>
                  )}
                  {step.id === 'shloka_done' && !step.done && (
                    <Pressable
                      onPress={() => router.push('/pathshala')}
                      style={{ marginTop: 8 }}
                      hitSlop={8}
                    >
                      <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                        Open Pathshala →
                      </Text>
                    </Pressable>
                  )}
                </View>

                {isBusy ? (
                  <ActivityIndicator size="small" color={COLORS.brandGold} />
                ) : step.done ? (
                  <Feather name="check-circle" size={22} color={COLORS.success} />
                ) : (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 1.5,
                      borderColor: theme.dim,
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
