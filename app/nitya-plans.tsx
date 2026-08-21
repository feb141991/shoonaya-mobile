import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';

import { ConfettiOverlay } from '@/components/ui/ConfettiOverlay';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { GUIDED_PLANS, type GuidedPlan, type GuidedPathStatus } from '@/lib/guided-paths';

function progressFor(plan: GuidedPlan, status: GuidedPathStatus | undefined, currentDay: number) {
  if (status === 'completed') return 1;
  if (status !== 'active') return 0;
  return Math.max(0, Math.min(1, (currentDay - 1) / plan.duration));
}

function PlanProgressDots({
  plan,
  status,
  currentDay,
}: {
  plan: GuidedPlan;
  status: GuidedPathStatus | undefined;
  currentDay: number;
}) {
  const filledDots = status === 'completed' ? plan.duration : status === 'active' ? Math.max(0, currentDay - 1) : 0;
  const dotSlots = plan.days.slice(0, 7);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {dotSlots.map((day) => {
        const filled = day.day <= filledDots;
        return (
          <View
            key={day.day}
            style={{
              width: filled ? 14 : 11,
              height: filled ? 14 : 11,
              borderRadius: 999,
              backgroundColor: filled ? (status === 'completed' ? COLORS.success : plan.accentColor) : `${plan.accentColor}28`,
              borderWidth: filled ? 0 : 1,
              borderColor: `${plan.accentColor}35`,
              boxShadow: filled && status === 'active' ? `0 0 8px ${plan.accentColor}55` : undefined,
            }}
          />
        );
      })}
      {plan.days.length > 7 ? (
        <Text style={{ color: `${plan.accentColor}80`, fontFamily: FONTS.sansSemiBold, fontSize: 10 }}>
          +{plan.days.length - 7}
        </Text>
      ) : null}
    </View>
  );
}

function PlanGlyph({ plan, size = 54 }: { plan: GuidedPlan; size?: number }) {
  return (
    <LinearGradient
      colors={[`${plan.accentColor}24`, `${plan.accentColor}10`, `${plan.accentColor}06`]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: plan.borderColor,
      }}
    >
      <Text style={{ fontSize: Math.round(size * 0.48) }}>{plan.emoji}</Text>
    </LinearGradient>
  );
}

export default function NityaPlansScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const shadow = isDark ? SHADOWS.md.dark : SHADOWS.md.light;

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Progress states
  const [statusMap, setStatusMap] = useState<Record<string, GuidedPathStatus>>({});
  const [dayMap, setDayMap] = useState<Record<string, number>>({});

  // Filter
  const [filter, setFilter] = useState<'all' | '7' | '21'>('all');

  // Modal Plan Detail
  const [selectedPlan, setSelectedPlan] = useState<GuidedPlan | null>(null);
  const [viewingDayIndex, setViewingDayIndex] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const fetchProgress = useCallback(async (uId: string) => {
    try {
      const { data, error } = await supabase
        .from('guided_path_progress')
        .select('path_id, status, day_reached')
        .eq('user_id', uId);

      if (error) throw error;

      const newStatusMap: Record<string, GuidedPathStatus> = {};
      const newDayMap: Record<string, number> = {};
      for (const row of data || []) {
        newStatusMap[row.path_id] = row.status as GuidedPathStatus;
        newDayMap[row.path_id] = row.day_reached ?? 1;
      }
      setStatusMap(newStatusMap);
      setDayMap(newDayMap);
    } catch (err) {
      console.warn('Failed to fetch plan progress:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        fetchProgress(user.id);
      } else {
        router.replace('/(auth)/login');
      }
    });
  }, [fetchProgress, router]);

  const filteredPlans = GUIDED_PLANS.filter((p) => {
    if (filter === 'all') return true;
    return p.duration === Number(filter);
  });

  const activePlan = GUIDED_PLANS.find((p) => statusMap[p.id] === 'active');

  const handleStartPlan = async (plan: GuidedPlan) => {
    if (!userId) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('guided_path_progress')
        .upsert({
          user_id: userId,
          path_id: plan.id,
          status: 'active',
          started_at: new Date().toISOString(),
          completed_at: null,
          day_reached: 1,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,path_id' });

      if (error) throw error;

      setStatusMap(prev => ({ ...prev, [plan.id]: 'active' }));
      setDayMap(prev => ({ ...prev, [plan.id]: 1 }));
      Alert.alert('Plan Started!', `"${plan.title}" has begun. Day 1 awaits 🙏`);
      setSelectedPlan(null);
    } catch (err) {
      Alert.alert('Error', 'Could not start plan. Try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAbandonPlan = async (plan: GuidedPlan) => {
    if (!userId) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('guided_path_progress')
        .upsert({
          user_id: userId,
          path_id: plan.id,
          status: 'dismissed',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,path_id' });

      if (error) throw error;

      setStatusMap(prev => ({ ...prev, [plan.id]: 'dismissed' }));
      setSelectedPlan(null);
      Alert.alert('Paused', `"${plan.title}" has been paused. Resume whenever you are ready.`);
    } catch (err) {
      Alert.alert('Error', 'Could not pause. Try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestartPlan = async (plan: GuidedPlan) => {
    if (!userId) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('guided_path_progress')
        .upsert({
          user_id: userId,
          path_id: plan.id,
          status: 'active',
          started_at: new Date().toISOString(),
          completed_at: null,
          day_reached: 1,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,path_id' });

      if (error) throw error;

      setStatusMap(prev => ({ ...prev, [plan.id]: 'active' }));
      setDayMap(prev => ({ ...prev, [plan.id]: 1 }));
      Alert.alert('Started Over', `"${plan.title}" reset to Day 1.`);
      setSelectedPlan(null);
    } catch (err) {
      Alert.alert('Error', 'Could not reset. Try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeavePlan = async (plan: GuidedPlan) => {
    if (!userId) return;
    Alert.alert(
      'Leave Plan',
      `Are you sure you want to leave "${plan.title}"? Your progress will be lost permanently.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const { error } = await supabase
                .from('guided_path_progress')
                .delete()
                .eq('user_id', userId)
                .eq('path_id', plan.id);

              if (error) throw error;

              setStatusMap(prev => { const n = { ...prev }; delete n[plan.id]; return n; });
              setDayMap(prev => { const n = { ...prev }; delete n[plan.id]; return n; });
              setSelectedPlan(null);
              Alert.alert('Removed', `"${plan.title}" progress was cleared.`);
            } catch (err) {
              Alert.alert('Error', 'Could not remove plan.');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleMarkDayComplete = async (plan: GuidedPlan, currentDay: number) => {
    if (!userId) return;
    setActionLoading(true);
    try {
      const newDay = currentDay + 1;
      const isLastDay = newDay > plan.duration;

      const { error } = await supabase
        .from('guided_path_progress')
        .upsert({
          user_id: userId,
          path_id: plan.id,
          status: isLastDay ? 'completed' : 'active',
          day_reached: isLastDay ? plan.duration : newDay,
          updated_at: new Date().toISOString(),
          ...(isLastDay ? { completed_at: new Date().toISOString() } : {}),
        }, { onConflict: 'user_id,path_id' });

      if (error) throw error;

      const finalDay = isLastDay ? plan.duration : newDay;
      setDayMap(prev => ({ ...prev, [plan.id]: finalDay }));
      setShowConfetti(true);
      if (isLastDay) {
        setStatusMap(prev => ({ ...prev, [plan.id]: 'completed' }));
        Alert.alert('Congratulations! 🎉', `You have successfully completed the "${plan.title}" path!`);
      } else {
        Alert.alert('Day Complete 🙏', `Great work. Day ${currentDay} is done.`);
      }
      setViewingDayIndex(null);
    } catch (err) {
      Alert.alert('Error', 'Could not update progress.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.brand} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.bg }} entrance="fade-up">
      <ConfettiOverlay show={showConfetti} onComplete={() => setShowConfetti(false)} density="soft" />
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <PressableSurface
            haptic="selection"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.glass,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
            }}
          >
            <Feather name="chevron-left" size={20} color={theme.brand} />
          </PressableSurface>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, ...TYPE.cardHeading }}>Sadhana Patha</Text>
            <Text style={{ color: theme.dim, ...TYPE.micro }}>7-day and 21-day structured practices</Text>
          </View>
        </View>

        {activePlan ? (
          <PressableSurface
            haptic="selection"
            onPress={() => setSelectedPlan(activePlan)}
            accessibilityLabel={`Continue ${activePlan.title}`}
            style={{
              borderRadius: 22,
              overflow: 'hidden',
              boxShadow: shadow,
            }}
          >
            <LinearGradient
              colors={[`${activePlan.accentColor}20`, `${activePlan.accentColor}08`, theme.card]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                padding: 18,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: `${activePlan.accentColor}33`,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <PlanGlyph plan={activePlan} size={48} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="zap" size={13} color={activePlan.accentColor} />
                  <Text style={{ color: activePlan.accentColor, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>
                    Day {dayMap[activePlan.id] ?? 1} of {activePlan.duration}
                  </Text>
                </View>
                <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>{activePlan.title}</Text>
                <View style={{ height: 5, borderRadius: 999, overflow: 'hidden', backgroundColor: `${activePlan.accentColor}20` }}>
                  <View
                    style={{
                      height: '100%',
                      width: `${Math.round(progressFor(activePlan, 'active', dayMap[activePlan.id] ?? 1) * 100)}%`,
                      backgroundColor: activePlan.accentColor,
                    }}
                  />
                </View>
              </View>
              <Feather name="arrow-right" size={17} color={activePlan.accentColor} />
            </LinearGradient>
          </PressableSurface>
        ) : (
          <LinearGradient
            colors={[theme.card, isDark ? COLORS.homeRaisedDark : COLORS.homeRaisedLight, `${theme.brand}10`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 28,
              padding: 22,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              boxShadow: isDark ? SHADOWS.lg.dark : SHADOWS.lg.light,
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -50,
                right: -42,
                width: 150,
                height: 150,
                borderRadius: 75,
                backgroundColor: theme.brandSoft,
              }}
            />
            <Text style={{ color: theme.brand, ...TYPE.section, fontSize: 11, letterSpacing: 2.2 }}>
              Structured Practice
            </Text>
            <Text style={{ color: theme.text, ...TYPE.title, marginTop: 12 }}>
              The Vedic tradition says: 21 days forms a samskara.
            </Text>
            <Text style={{ color: theme.dim, ...TYPE.body, marginTop: 10 }}>
              Choose the path that calls to you. Show up each day. Let repetition do its quiet work.
            </Text>
          </LinearGradient>
        )}

        {/* Filters */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['all', '7', '21'] as const).map((opt) => {
            const active = filter === opt;
            return (
              <PressableSurface
                key={opt}
                onPress={() => setFilter(opt)}
                haptic="selection"
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor: active ? theme.brandSoft : theme.card,
                  borderWidth: 1,
                  borderColor: active ? theme.premiumBorder : theme.borderSoft,
                }}
              >
                <Text style={{ color: active ? theme.brandStrong : theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                  {opt === 'all' ? 'All Plans' : `${opt}-Day`}
                </Text>
              </PressableSurface>
            );
          })}
        </View>

        {/* Plan Cards */}
        <View style={{ gap: 12 }}>
          {filteredPlans.map((plan) => {
            const status = statusMap[plan.id];
            const currentDay = dayMap[plan.id] ?? 1;
            const progress = plan.duration > 0 ? (currentDay - 1) / plan.duration : 0;
            const isActive = status === 'active';
            const isCompleted = status === 'completed';

            return (
              <PressableSurface
                key={plan.id}
                haptic="selection"
                onPress={() => setSelectedPlan(plan)}
                style={{
                  borderRadius: 28,
                  overflow: 'hidden',
                  boxShadow: isActive ? `0 8px 24px ${plan.accentColor}18` : shadow,
                }}
              >
                <LinearGradient
                  colors={[`${plan.accentColor}16`, theme.card]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 28,
                    borderWidth: 1,
                    borderColor: isActive ? plan.borderColor : theme.borderSoft,
                    overflow: 'hidden',
                  }}
                >
                  <View style={{ padding: 18, gap: 14 }}>
                    {(isActive || isCompleted) && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 14,
                          right: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 9,
                          paddingVertical: 5,
                          borderRadius: 999,
                          backgroundColor: isCompleted ? COLORS.successBg : `${plan.accentColor}22`,
                          borderWidth: 1,
                          borderColor: isCompleted ? COLORS.successBorder : `${plan.accentColor}44`,
                        }}
                      >
                        <Feather name={isCompleted ? 'check-circle' : 'zap'} size={11} color={isCompleted ? COLORS.success : plan.accentColor} />
                        <Text style={{ color: isCompleted ? COLORS.success : plan.accentColor, fontFamily: FONTS.sansSemiBold, fontSize: 10 }}>
                          {isCompleted ? 'Done' : `Day ${currentDay}/${plan.duration}`}
                        </Text>
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                      <PlanGlyph plan={plan} />
                      <View style={{ flex: 1, paddingRight: isActive || isCompleted ? 74 : 0 }}>
                        <Text style={{ color: plan.accentColor, fontFamily: FONTS.sansSemiBold, fontSize: 10, letterSpacing: 1.7, textTransform: 'uppercase' }}>
                          {plan.duration} Days · {plan.difficulty}
                        </Text>
                        <Text style={{ color: theme.text, ...TYPE.cardHeading, marginTop: 3 }}>{plan.title}</Text>
                        <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, lineHeight: 17, marginTop: 5 }}>
                          {plan.tagline}
                        </Text>
                      </View>
                    </View>

                    {isActive ? (
                      <View style={{ gap: 5 }}>
                        <View style={{ height: 4, backgroundColor: `${plan.accentColor}18`, borderRadius: 2, overflow: 'hidden' }}>
                          <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: plan.accentColor }} />
                        </View>
                        <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 10, textAlign: 'right' }}>
                          {currentDay - 1} of {plan.duration} days done
                        </Text>
                      </View>
                    ) : null}

                    <View
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: `${plan.accentColor}18`,
                        paddingTop: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <PlanProgressDots plan={plan} status={status} currentDay={currentDay} />
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ color: `${plan.accentColor}90`, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>
                          {isActive ? `Day ${currentDay}` : 'View plan'}
                        </Text>
                        <Feather name="chevron-right" size={14} color={`${plan.accentColor}90`} />
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </PressableSurface>
            );
          })}
        </View>
      </ScrollView>

      {/* Plan Details Modal */}
      <Modal visible={!!selectedPlan} animationType="slide" presentationStyle="pageSheet">
        {selectedPlan && (() => {
          const plan = selectedPlan;
          const status = statusMap[plan.id];
          const currentDay = dayMap[plan.id] ?? 1;
          const isActive = status === 'active';
          const isCompleted = status === 'completed';

          return (
            <View style={{ flex: 1, backgroundColor: theme.bg }}>
              {/* Sheet header */}
              <View style={{ alignItems: 'center', paddingTop: 10 }}>
                <View style={{ width: 42, height: 4, borderRadius: 999, backgroundColor: theme.borderSoft }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 }}>
                <Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>{plan.title}</Text>
                <PressableSurface
                  haptic="selection"
                  accessibilityLabel="Close plan details"
                  onPress={() => { setSelectedPlan(null); setViewingDayIndex(null); }}
                  hitSlop={10}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.glass,
                    borderWidth: 1,
                    borderColor: theme.premiumBorder,
                  }}
                >
                  <Feather name="x" size={17} color={theme.text} />
                </PressableSurface>
              </View>

              {viewingDayIndex !== null && plan.days[viewingDayIndex] ? (() => {
                const day = plan.days[viewingDayIndex];
                return (
                  <View style={{ flex: 1, justifyContent: 'space-between' }}>
                    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 18, gap: 16 }}>
                      <PressableSurface
                        onPress={() => setViewingDayIndex(null)}
                        haptic="selection"
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
                      >
                        <Feather name="chevron-left" size={16} color={theme.dim} />
                        <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back to overview</Text>
                      </PressableSurface>

                      <View style={{ backgroundColor: `${plan.accentColor}18`, borderWidth: 1, borderColor: `${plan.accentColor}33`, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Feather name="target" size={12} color={plan.accentColor} />
                        <Text style={{ color: plan.accentColor, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>
                          Day {day.day} of {plan.duration}
                        </Text>
                      </View>

                      <Text style={{ color: theme.text, ...TYPE.title }}>
                        {day.title}
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Feather name="clock" size={14} color={theme.dim} />
                        <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13 }}>
                          {day.duration} minutes
                        </Text>
                      </View>

                      <LinearGradient
                        colors={[`${plan.accentColor}12`, theme.card]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          borderRadius: 22,
                          padding: 18,
                          borderWidth: 1,
                          borderColor: `${plan.accentColor}25`,
                        }}
                      >
                        <Text style={{ color: plan.accentColor, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.6, marginBottom: 8 }}>
                          Today&apos;s Practice · {day.focus}
                        </Text>
                        <Text style={{ color: theme.text, ...TYPE.body, lineHeight: 22 }}>
                          {day.practice}
                        </Text>
                      </LinearGradient>

                      <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12.5, lineHeight: 19 }}>
                        Approach today&apos;s practice with sincerity. Even a few minutes with full attention is stronger than a long session done mechanically.
                      </Text>
                    </ScrollView>

                    {isActive && day.day === currentDay && (
                      <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18, borderTopWidth: 1, borderTopColor: theme.borderSoft, backgroundColor: theme.bg }}>
                        <PressableSurface
                          onPress={() => handleMarkDayComplete(plan, currentDay)}
                          disabled={actionLoading}
                          style={{
                            borderRadius: 18,
                            overflow: 'hidden',
                            opacity: actionLoading ? 0.7 : 1,
                            boxShadow: `0 10px 28px ${plan.accentColor}30`,
                          }}
                        >
                          <LinearGradient
                            colors={[`${plan.accentColor}ee`, `${plan.accentColor}aa`]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ minHeight: 54, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                          >
                            {actionLoading ? <ActivityIndicator color={COLORS.ink} /> : (
                              <>
                                <Feather name="check-circle" size={16} color={COLORS.ink} />
                                <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Mark Day {day.day} Complete</Text>
                              </>
                            )}
                          </LinearGradient>
                        </PressableSurface>
                      </View>
                    )}
                  </View>
                );
              })() : (
                <View style={{ flex: 1 }}>
                  <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 20 }}>
                    {/* Hero details */}
                    <LinearGradient
                      colors={[`${plan.accentColor}18`, theme.card]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        borderRadius: 28,
                        padding: 22,
                        alignItems: 'center',
                        gap: 10,
                        borderWidth: 1,
                        borderColor: plan.borderColor,
                      }}
                    >
                      <PlanGlyph plan={plan} size={68} />
                      <Text style={{ color: plan.accentColor, fontFamily: FONTS.sansSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {plan.duration}-Day Plan · {plan.difficulty}
                      </Text>
                      <Text style={{ color: theme.text, ...TYPE.title, textAlign: 'center' }}>
                        {plan.title}
                      </Text>
                      <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                        {plan.description}
                      </Text>
                      {isActive && (
                        <View style={{ alignItems: 'center', gap: 7, marginTop: 2 }}>
                          <View style={{ backgroundColor: `${plan.accentColor}1a`, borderWidth: 1, borderColor: `${plan.accentColor}44`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Feather name="zap" size={12} color={plan.accentColor} />
                            <Text style={{ color: plan.accentColor, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Day {currentDay} of {plan.duration}</Text>
                          </View>
                          <View style={{ width: 180, height: 5, borderRadius: 999, overflow: 'hidden', backgroundColor: `${plan.accentColor}20` }}>
                            <View style={{ height: '100%', width: `${Math.round(progressFor(plan, status, currentDay) * 100)}%`, backgroundColor: plan.accentColor }} />
                          </View>
                          <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 10 }}>
                            {currentDay - 1} of {plan.duration} days done
                          </Text>
                        </View>
                      )}
                      {isCompleted && (
                        <View style={{ backgroundColor: COLORS.successBg, borderWidth: 1, borderColor: COLORS.successBorder, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Feather name="check-circle" size={12} color={COLORS.success} />
                          <Text style={{ color: COLORS.success, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Completed</Text>
                        </View>
                      )}
                    </LinearGradient>

                    {/* Day list */}
                    <View style={{ gap: 10 }}>
                      <Text style={{ color: theme.dim, ...TYPE.section, fontSize: 11 }}>
                        {isActive ? 'Your journey so far' : 'What you will practise'}
                      </Text>
                      {plan.days.map((day, idx) => {
                        const isDone = isActive && day.day < currentDay;
                        const isToday = isActive && day.day === currentDay;
                        const isFuture = isActive && day.day > currentDay;

                        return (
                          <PressableSurface
                            key={day.day}
                            disabled={!isActive}
                            haptic="selection"
                            onPress={() => setViewingDayIndex(idx)}
                            style={{
                              backgroundColor: isToday ? `${plan.accentColor}12` : isDone ? COLORS.successBg : theme.card,
                              borderColor: isToday ? `${plan.accentColor}33` : isDone ? COLORS.successBorder : theme.borderSoft,
                              borderWidth: 1,
                              borderRadius: 18,
                              padding: 14,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 12,
                              opacity: isFuture ? 0.58 : 1,
                            }}
                          >
                            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDone ? COLORS.successBg : `${plan.accentColor}15`, alignItems: 'center', justifyContent: 'center' }}>
                              {isDone ? (
                                <Feather name="check" size={14} color={COLORS.success} />
                              ) : (
                                <Text style={{ color: plan.accentColor, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>{day.day}</Text>
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: isDone ? theme.dim : theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14, textDecorationLine: isDone ? 'line-through' : 'none' }}>{day.title}</Text>
                              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 11 }}>{day.focus} · {day.duration} min</Text>
                            </View>
                            {isToday && (
                              <View style={{ backgroundColor: plan.accentColor, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                                <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 8 }}>TODAY</Text>
                              </View>
                            )}
                            {isActive && <Feather name="chevron-right" size={16} color={theme.dim} />}
                          </PressableSurface>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {/* Actions footer */}
                  <View style={{ borderTopWidth: 1, borderTopColor: theme.borderSoft, padding: 16, gap: 10, backgroundColor: theme.bg }}>
                    {!isActive && !isCompleted && (
                      <PressableSurface
                        onPress={() => handleStartPlan(plan)}
                        disabled={actionLoading}
                        style={{
                          borderRadius: 18,
                          overflow: 'hidden',
                          opacity: actionLoading ? 0.7 : 1,
                          boxShadow: `0 10px 28px ${plan.accentColor}30`,
                        }}
                      >
                        <LinearGradient
                          colors={[`${plan.accentColor}ee`, `${plan.accentColor}aa`]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{ minHeight: 54, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                        >
                          {actionLoading ? <ActivityIndicator color={COLORS.ink} /> : (
                            <>
                              <Feather name="play" size={15} color={COLORS.ink} />
                              <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Begin {plan.duration}-Day Journey</Text>
                            </>
                          )}
                        </LinearGradient>
                      </PressableSurface>
                    )}

                    {isActive && (
                      <View style={{ gap: 8 }}>
                        <PressableSurface
                          onPress={() => setViewingDayIndex(currentDay - 1)}
                          style={{
                            borderRadius: 18,
                            overflow: 'hidden',
                            boxShadow: `0 8px 22px ${plan.accentColor}24`,
                          }}
                        >
                          <LinearGradient
                            colors={[`${plan.accentColor}ee`, `${plan.accentColor}aa`]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ minHeight: 54, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                          >
                            <Feather name="arrow-right" size={15} color={COLORS.ink} />
                            <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Continue Day {currentDay}</Text>
                          </LinearGradient>
                        </PressableSurface>

                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <PressableSurface
                            onPress={() => handleRestartPlan(plan)}
                            disabled={actionLoading}
                            style={{ flex: 1, backgroundColor: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight, paddingVertical: 12, borderRadius: 16, alignItems: 'center' }}
                          >
                            <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Restart</Text>
                          </PressableSurface>
                          <PressableSurface
                            onPress={() => handleAbandonPlan(plan)}
                            disabled={actionLoading}
                            style={{ flex: 1, backgroundColor: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight, paddingVertical: 12, borderRadius: 16, alignItems: 'center' }}
                          >
                            <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Pause</Text>
                          </PressableSurface>
                          <PressableSurface
                            onPress={() => handleLeavePlan(plan)}
                            disabled={actionLoading}
                            style={{ flex: 1, backgroundColor: COLORS.dangerBg, paddingVertical: 12, borderRadius: 16, alignItems: 'center' }}
                          >
                            <Text style={{ color: COLORS.danger, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>✕ Leave</Text>
                          </PressableSurface>
                        </View>
                      </View>
                    )}

                    {isCompleted && (
                      <PressableSurface
                        onPress={() => handleStartPlan(plan)}
                        disabled={actionLoading}
                        style={{
                          borderColor: plan.accentColor,
                          borderWidth: 1,
                          paddingVertical: 16,
                          borderRadius: 24,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: plan.accentColor, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Begin Again</Text>
                      </PressableSurface>
                    )}
                    <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 10, textAlign: 'center' }}>
                      {isActive ? 'Mark each day complete after your practice to advance.' : 'Your progress is saved automatically each day.'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })()}
      </Modal>
    </Screen>
  );
}
