import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { ConfettiOverlay } from '@/components/ui/ConfettiOverlay';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { ShoonayaShareCard } from '@/components/share/ShoonayaShareCard';
import { shareCapturedShoonayaCard } from '@/lib/share-card';
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
  tradition: string;
  userName: string;
};

const EMPTY_STATE: NitySummary = {
  greeting: 'Suprabhat 🌅',
  allDoneMessage: 'Your morning sadhana is complete.',
  steps: [],
  completedCount: 0,
  total: 0,
  allDone: false,
  streak: { current: 0, longest: 0 },
  tradition: 'hindu',
  userName: 'Seeker',
};

export default function NityaKarmaScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const [state, setState] = useState<NitySummary>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busyStepId, setBusyStepId] = useState<string | null>(null);
  const [localKey, setLocalKey] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

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
      .select('timezone, tradition, full_name, username')
      .eq('id', user.id)
      .maybeSingle();

    const tradition = profile?.tradition ?? 'hindu';
    const userName = profile?.full_name || profile?.username || 'Seeker';

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
      allDone: completedCount === mergedSteps.length,
      tradition,
      userName,
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
      const willComplete = state.steps.filter((s) => s.done || s.id === step.id).length === state.steps.length;

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
        if (willComplete) {
          setShowConfetti(true);
        }
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
    [busyStepId, localKey, state.steps]
  );

  const [shareLoading, setShareLoading] = useState(false);
  const nityaShareCardRef = useRef<View>(null);

  const getTraditionTitle = (tradition: string) => {
    switch (tradition.toLowerCase()) {
      case 'hindu':
      case 'sanatan':
      case 'sanatana':
        return 'Days of Sadhana';
      case 'sikh':
        return 'Days of Simran';
      case 'jain':
        return 'Days of Ahimsa';
      case 'buddhist':
      case 'buddha':
        return 'Days of Practice';
      default:
        return 'Days of Practice';
    }
  };

  const shareCompletionCard = async () => {
    if (shareLoading) return;
    setShareLoading(true);
    try {
      const firstName = state.userName.trim().split(' ')[0] || 'Seeker';
      const pointsText = `${state.completedCount} of ${state.total} steps`;
      const streakText = state.streak.current > 0 ? ` · ${state.streak.current}-day streak` : '';
      const fallbackMessage = `${firstName} completed morning sadhana on Shoonaya! Completed ${pointsText}${streakText}. Join me 🙏`;

      await shareCapturedShoonayaCard(nityaShareCardRef, {
        fileName: 'shoonaya-nitya-card.png',
        dialogTitle: 'Share Nitya completion',
        fallbackMessage,
      });
    } finally {
      setShareLoading(false);
    }
  };

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
        <PressableSurface haptic="selection" onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, minHeight: 0 }}>
          <Feather name="chevron-left" size={16} color={theme.dim} />
          <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
        </PressableSurface>
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
      <ConfettiOverlay show={showConfetti} onComplete={() => setShowConfetti(false)} density="full" />
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }} showsVerticalScrollIndicator={false}>
        <PressableSurface haptic="selection" onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 0 }}>
          <Feather name="chevron-left" size={16} color={theme.dim} />
          <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
        </PressableSurface>

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
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Feather name="check-circle" size={20} color={COLORS.success} />
              <Text style={{ flex: 1, color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 13, lineHeight: 19 }}>
                {state.allDoneMessage}
              </Text>
            </View>
            <PressableSurface
              accessibilityRole="button"
              accessibilityLabel="Share your completion card"
              onPress={() => { void shareCompletionCard(); }}
              disabled={shareLoading}
              style={{
                borderRadius: 16,
                backgroundColor: COLORS.brandGold,
                minHeight: 44,
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 4,
                opacity: shareLoading ? 0.7 : 1,
              }}
            >
              <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>
                {shareLoading ? 'Creating card...' : 'Share completion card'}
              </Text>
            </PressableSurface>
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
                backgroundColor: isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight,
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
              <PressableSurface
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
                    backgroundColor: isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight,
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
                    <PressableSurface
                      haptic="selection"
                      onPress={() => {
                        Clipboard.setStringAsync(`${step.label}\n${step.description}`)
                          .catch(() => {});
                      }}
                      hitSlop={8}
                      style={{ minHeight: 0 }}
                    >
                      <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 11, textDecorationLine: 'underline' }}>
                        Copy note
                      </Text>
                    </PressableSurface>
                    <PressableSurface
                      haptic="selection"
                      onPress={() => {
                        Share.share({ message: `${step.label}\n${step.description}` })
                          .catch(() => {});
                      }}
                      hitSlop={8}
                      style={{ minHeight: 0 }}
                    >
                      <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 11, textDecorationLine: 'underline' }}>
                        Share note
                      </Text>
                    </PressableSurface>
                  </View>

                  {/* Deep links */}
                  {step.id === 'japa_done' && !step.done && (
                    <PressableSurface
                      haptic="selection"
                      onPress={() => router.push('/japa')}
                      style={{ marginTop: 8, minHeight: 0 }}
                      hitSlop={8}
                    >
                      <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                        Open Japa Counter →
                      </Text>
                    </PressableSurface>
                  )}
                  {step.id === 'shloka_done' && !step.done && (
                    <PressableSurface
                      haptic="selection"
                      onPress={() => router.push('/pathshala')}
                      style={{ marginTop: 8, minHeight: 0 }}
                      hitSlop={8}
                    >
                      <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                        Open Pathshala →
                      </Text>
                    </PressableSurface>
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
              </PressableSurface>
            );
          })}
        </View>
      </ScrollView>

      {state.allDone && state.total > 0 ? (
        <View
          pointerEvents="none"
          collapsable={false}
          style={{
            position: 'absolute',
            left: -420,
            top: 0,
            opacity: 0.01,
          }}
        >
          <ShoonayaShareCard
            ref={nityaShareCardRef}
            data={{
              tradition: state.tradition,
              headlineValue: state.streak.current > 0 ? state.streak.current : state.completedCount,
              title: getTraditionTitle(state.tradition),
              subtitle: 'Morning Complete',
              caption: (() => {
                const firstName = state.userName.trim().split(' ')[0] || 'Seeker';
                const streakText = state.streak.current > 0 ? ` · ${state.streak.current}-day streak` : '';
                return `${firstName} completed morning sadhana on Shoonaya! Completed ${state.completedCount} of ${state.total} steps${streakText}.`;
              })(),
              userName: state.userName.trim().split(' ')[0] || 'Seeker',
              date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
              footer: 'Shared from Shoonaya',
            }}
          />
        </View>
      ) : null}
    </Screen>
  );
}
