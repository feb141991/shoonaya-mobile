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
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { ConfettiOverlay } from '@/components/ui/ConfettiOverlay';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { GUIDED_PLANS, type GuidedPlan, type GuidedPathStatus } from '@/lib/guided-paths';

export default function NityaPlansScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = isDark
    ? { bg: COLORS.darkBg, card: COLORS.cardBgDark, text: COLORS.creamBg, dim: COLORS.textDimDark, border: COLORS.borderDark, accent: COLORS.brandGold }
    : { bg: COLORS.creamBg, card: COLORS.cardBgLight, text: COLORS.ink, dim: COLORS.textDimLight, border: COLORS.homeBorderSoftLight, accent: COLORS.brandGold };

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
          <ActivityIndicator color={COLORS.brandGold} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ConfettiOverlay show={showConfetti} onComplete={() => setShowConfetti(false)} density="soft" />
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }} showsVerticalScrollIndicator={false}>
        {/* Back button */}
        <PressableSurface haptic="selection" onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 0 }}>
          <Feather name="chevron-left" size={16} color={theme.dim} />
          <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
        </PressableSurface>

        <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 30 }}>Sadhana Patha</Text>
        <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14, marginTop: -8 }}>
          Embark on structured guided practices to deepen your daily rhythm.
        </Text>

        {/* Filters */}
        <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
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
                  backgroundColor: active ? COLORS.brandGold : theme.card,
                  borderWidth: 1,
                  borderColor: active ? COLORS.brandGold : theme.border,
                }}
              >
                <Text style={{ color: active ? COLORS.ink : theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
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

            return (
              <Card
                key={plan.id}
                style={{
                  backgroundColor: theme.card,
                  borderColor: status === 'active' ? plan.accentColor : theme.border,
                  borderWidth: status === 'active' ? 1.5 : 1,
                  gap: 12,
                }}
              >
                <PressableSurface
                  onPress={() => setSelectedPlan(plan)}
                  haptic="selection"
                  style={{ gap: 10 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: `${plan.accentColor}18`, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 24 }}>{plan.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 18 }}>{plan.title}</Text>
                        {status === 'active' && (
                          <View style={{ backgroundColor: `${plan.accentColor}15`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                            <Text style={{ color: plan.accentColor, fontFamily: FONTS.sansSemiBold, fontSize: 9 }}>ACTIVE</Text>
                          </View>
                        )}
                        {status === 'completed' && (
                          <View style={{ backgroundColor: COLORS.successBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                            <Text style={{ color: COLORS.success, fontFamily: FONTS.sansSemiBold, fontSize: 9 }}>DONE ✓</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12 }}>
                        {plan.duration}-Day Plan · {plan.difficulty}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 13, lineHeight: 18 }}>
                    {plan.tagline}
                  </Text>

                  {status === 'active' && (
                    <View style={{ gap: 4, marginTop: 4 }}>
                      <View style={{ height: 4, backgroundColor: `${plan.accentColor}18`, borderRadius: 2, overflow: 'hidden' }}>
                        <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: plan.accentColor }} />
                      </View>
                      <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 10, textAlign: 'right' }}>
                        Day {currentDay - 1} of {plan.duration} days done
                      </Text>
                    </View>
                  )}
                </PressableSurface>
              </Card>
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 16 }}>{plan.title}</Text>
                <PressableSurface haptic="selection" onPress={() => { setSelectedPlan(null); setViewingDayIndex(null); }} hitSlop={10} style={{ padding: 4, minHeight: 0 }}>
                  <Feather name="x" size={24} color={theme.text} />
                </PressableSurface>
              </View>

              {viewingDayIndex !== null && plan.days[viewingDayIndex] ? (() => {
                const day = plan.days[viewingDayIndex];
                return (
                  <View style={{ flex: 1, padding: 20, justifyContent: 'space-between' }}>
                    <ScrollView contentContainerStyle={{ gap: 16 }}>
                      <PressableSurface onPress={() => setViewingDayIndex(null)} haptic="selection" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
                        <Feather name="chevron-left" size={16} color={theme.dim} />
                        <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back to overview</Text>
                      </PressableSurface>

                      <View style={{ backgroundColor: `${plan.accentColor}18`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignSelf: 'flex-start' }}>
                        <Text style={{ color: plan.accentColor, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>
                          Day {day.day} of {plan.duration}
                        </Text>
                      </View>

                      <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 24 }}>
                        {day.title}
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Feather name="clock" size={14} color={theme.dim} />
                        <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13 }}>
                          {day.duration} minutes
                        </Text>
                      </View>

                      <Card style={{ backgroundColor: `${plan.accentColor}0a`, borderColor: `${plan.accentColor}25` }}>
                        <Text style={{ color: plan.accentColor, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                          Today&apos;s Focus: {day.focus}
                        </Text>
                        <Text style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 22 }}>
                          {day.practice}
                        </Text>
                      </Card>
                    </ScrollView>

                    {isActive && day.day === currentDay && (
                      <PressableSurface
                        onPress={() => handleMarkDayComplete(plan, currentDay)}
                        disabled={actionLoading}
                        style={{
                          backgroundColor: plan.accentColor,
                          paddingVertical: 16,
                          borderRadius: 24,
                          alignItems: 'center',
                          opacity: actionLoading ? 0.7 : 1,
                        }}
                      >
                        {actionLoading ? <ActivityIndicator color={COLORS.ink} /> : <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Mark Day {day.day} Complete</Text>}
                      </PressableSurface>
                    )}
                  </View>
                );
              })() : (
                <View style={{ flex: 1 }}>
                  <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
                    {/* Hero details */}
                    <View style={{ alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: `${plan.accentColor}18`, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 32 }}>{plan.emoji}</Text>
                      </View>
                      <Text style={{ color: plan.accentColor, fontFamily: FONTS.sansSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {plan.duration}-Day Plan · {plan.difficulty}
                      </Text>
                      <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 24, textAlign: 'center' }}>
                        {plan.title}
                      </Text>
                      <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                        {plan.description}
                      </Text>
                    </View>

                    {/* Day list */}
                    <View style={{ gap: 10 }}>
                      <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 18 }}>Daily Practices</Text>
                      {plan.days.map((day, idx) => {
                        const isDone = isActive && day.day < currentDay;
                        const isToday = isActive && day.day === currentDay;

                        return (
                          <PressableSurface
                            key={day.day}
                            disabled={!isActive}
                            haptic="selection"
                            onPress={() => setViewingDayIndex(idx)}
                            style={{
                              backgroundColor: isToday ? `${plan.accentColor}10` : theme.card,
                              borderColor: isToday ? plan.accentColor : theme.border,
                              borderWidth: 1,
                              borderRadius: 16,
                              padding: 14,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 12,
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
                              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>{day.title}</Text>
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
                  <View style={{ borderTopWidth: 1, borderTopColor: theme.border, padding: 16, gap: 10, backgroundColor: theme.card }}>
                    {!isActive && !isCompleted && (
                      <PressableSurface
                        onPress={() => handleStartPlan(plan)}
                        disabled={actionLoading}
                        style={{
                          backgroundColor: plan.accentColor,
                          paddingVertical: 16,
                          borderRadius: 24,
                          alignItems: 'center',
                          opacity: actionLoading ? 0.7 : 1,
                        }}
                      >
                        {actionLoading ? <ActivityIndicator color={COLORS.ink} /> : <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Begin Journey</Text>}
                      </PressableSurface>
                    )}

                    {isActive && (
                      <View style={{ gap: 8 }}>
                        <PressableSurface
                          onPress={() => setViewingDayIndex(currentDay - 1)}
                          style={{
                            backgroundColor: plan.accentColor,
                            paddingVertical: 16,
                            borderRadius: 24,
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Continue Day {currentDay}</Text>
                        </PressableSurface>

                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <PressableSurface
                            onPress={() => handleRestartPlan(plan)}
                            disabled={actionLoading}
                            style={{ flex: 1, backgroundColor: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight, paddingVertical: 12, borderRadius: 16, alignItems: 'center' }}
                          >
                            <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>🔄 Restart</Text>
                          </PressableSurface>
                          <PressableSurface
                            onPress={() => handleAbandonPlan(plan)}
                            disabled={actionLoading}
                            style={{ flex: 1, backgroundColor: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight, paddingVertical: 12, borderRadius: 16, alignItems: 'center' }}
                          >
                            <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>⏸ Pause</Text>
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
