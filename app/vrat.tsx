import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
const isExpoGo = Constants.appOwnership === 'expo';
const Notifications = isExpoGo ? null : (() => { try { return require('expo-notifications'); } catch { return null; } })();

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS } from '@/lib/constants';
import { VRAT_DATABASE, type VratData } from '@/lib/vrat-data';
import { supabase } from '@/lib/supabase';

type Tradition = 'all' | 'hindu' | 'sikh' | 'buddhist' | 'jain';

const TRADITION_FILTERS: Tradition[] = ['all', 'hindu', 'sikh', 'buddhist', 'jain'];

function vratMatchesTradition(vrat: VratData, tradition: Tradition) {
  if (tradition === 'all') {
    return true;
  }

  const source = `${vrat.significance} ${vrat.practice} ${vrat.mantra}`.toLowerCase();
  if (tradition === 'hindu') return true;
  if (tradition === 'sikh') return source.includes('gurbani') || source.includes('waheguru');
  if (tradition === 'buddhist') return source.includes('buddha') || source.includes('metta');
  if (tradition === 'jain') return source.includes('jain') || source.includes('tirthankara') || source.includes('paryushana');
  return false;
}

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export default function VratScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [selectedTradition, setSelectedTradition] = useState<Tradition>('all');
  const [selectedVrat, setSelectedVrat] = useState<VratData | null>(null);

  // ── Vrat observation tracker — mirrors web's VratClient.tsx (same
  // GET/POST /api/vrat/observe contract, same karma-award behavior). ────────
  const [observedToday, setObservedToday] = useState(false);
  const [observeCount, setObserveCount] = useState(0);
  const [observeLoading, setObserveLoading] = useState(false);
  const [observeStatusLoaded, setObserveStatusLoaded] = useState(false);

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

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!data.user) {
          router.replace('/(auth)/login');
          return;
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const vrats = useMemo(
    () => Object.values(VRAT_DATABASE).filter((vrat) => vratMatchesTradition(vrat, selectedTradition)),
    [selectedTradition]
  );

  useEffect(() => {
    if (!selectedVrat) {
      setObservedToday(false);
      setObserveCount(0);
      setObserveStatusLoaded(false);
      return;
    }

    let cancelled = false;
    setObserveStatusLoaded(false);

    apiFetch(`/api/vrat/observe?vrat_id=${encodeURIComponent(selectedVrat.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setObservedToday(Boolean(data.observed_today));
        setObserveCount(data.total_count ?? 0);
      })
      .catch(() => {
        // Silently ignore — tracker is non-critical, mirrors web behavior.
      })
      .finally(() => {
        if (!cancelled) setObserveStatusLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedVrat]);

  const handleObserve = async () => {
    if (!selectedVrat || observedToday || observeLoading) {
      return;
    }

    setObserveLoading(true);
    try {
      const res = await apiFetch('/api/vrat/observe', {
        method: 'POST',
        body: JSON.stringify({ vrat_id: selectedVrat.id, vrat_name: selectedVrat.name }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setObservedToday(true);
        setObserveCount((count) => count + (data.already_observed ? 0 : 1));
        if (!data.already_observed && data.karma_earned > 0) {
          Alert.alert(`🙏 Vrat observed! +${data.karma_earned} karma`);
        } else {
          Alert.alert('Vrat observed');
        }
      } else {
        Alert.alert('Could not record observation');
      }
    } catch {
      Alert.alert('Could not record observation');
    } finally {
      setObserveLoading(false);
    }
  };

  const setReminder = async (vrat: VratData) => {
    if (!Notifications) {
      Alert.alert('Reminders not available in Expo Go. Use the full app.');
      return;
    }
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Notifications are required for reminders');
      return;
    }

    const now = new Date();
    const triggerDate = new Date(now);
    triggerDate.setHours(6, 0, 0, 0);
    if (triggerDate <= now) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${vrat.emoji} ${vrat.name} reminder`,
        body: vrat.tagline,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    Alert.alert('Reminder scheduled');
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
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="chevron-left" size={16} color={theme.dim} />
          <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
        </Pressable>

        <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 30 }}>Vrat</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {TRADITION_FILTERS.map((tradition) => {
            const active = selectedTradition === tradition;
            return (
              <Pressable
                key={tradition}
                onPress={() => setSelectedTradition(tradition)}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? COLORS.brandGold : theme.border,
                  backgroundColor: active ? COLORS.brandGold : theme.card,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: active ? COLORS.ink : theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                  {tradition.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {selectedVrat ? (
          <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 28 }}>
                  {selectedVrat.emoji} {selectedVrat.name}
                </Text>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14, marginTop: 4 }}>
                  {selectedVrat.tagline}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedVrat(null)}>
                <Feather name="x" size={18} color={theme.dim} />
              </Pressable>
            </View>

            <View style={{ gap: 12 }}>
              <Text style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 24 }}>
                {selectedVrat.significance}
              </Text>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>How to observe</Text>
              <Text style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 24 }}>
                {selectedVrat.practice}
              </Text>
              {selectedVrat.breakFastTime ? (
                <>
                  <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Duration</Text>
                  <Text style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 15 }}>{selectedVrat.breakFastTime}</Text>
                </>
              ) : null}
              <Pressable
                onPress={() => {
                  void setReminder(selectedVrat);
                }}
                style={{
                  borderRadius: 18,
                  backgroundColor: COLORS.brandGold,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Set reminder</Text>
              </Pressable>

              {observedToday ? (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 8,
                    borderRadius: 18,
                    borderWidth: 1.5,
                    borderColor: COLORS.successBorder,
                    backgroundColor: COLORS.successBg,
                    paddingVertical: 14,
                  }}
                >
                  <Feather name="check-circle" size={18} color={COLORS.success} />
                  <Text style={{ color: COLORS.success, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
                    Observed today ✓{observeCount > 1 ? `  (${observeCount}× total)` : ''}
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    void handleObserve();
                  }}
                  disabled={observeLoading || !observeStatusLoaded}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.card,
                    paddingVertical: 14,
                    alignItems: 'center',
                    opacity: observeLoading || !observeStatusLoaded ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
                    🙏 Mark as Observed{observeCount > 0 ? `  (${observeCount}× before)` : ''}
                  </Text>
                </Pressable>
              )}
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, textAlign: 'center' }}>
                {observedToday ? 'Your practice is recorded' : 'Earn 25 karma for completing this vrat'}
              </Text>
            </View>
          </Card>
        ) : (
          vrats.map((vrat) => (
            <Pressable key={vrat.id} onPress={() => setSelectedVrat(vrat)}>
              <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 8 }}>
                <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 24 }}>
                  {vrat.emoji} {vrat.name}
                </Text>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14 }}>{vrat.tagline}</Text>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
