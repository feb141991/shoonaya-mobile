import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS } from '@/lib/constants';

// Native Sankalpa — Home's Sankalpa card was previously display-only
// (Alert.alert "coming soon" on tap, see app/(tabs)/index.tsx). This screen
// is the first real native surface: view the active vow, check in for
// today, mark it complete, or start a new one when none is active.
//
// Wired directly to the /api/sankalpa* routes (not /api/native/home-summary)
// per this task's required reading — those are the actual create/check-in/
// complete contracts; home-summary only ever read the active row for
// display. All three routes were cookie-only (createServerSupabaseClient +
// requireUserNotBanned) and could not authenticate a native Bearer token
// until this same change also switched them to getApiUser + assertNotBanned
// (see the web repo commit touching src/app/api/sankalpa/**).
//
// day/progress are computed client-side from start_date/target_days using
// the exact same formula as /api/native/home-summary's buildDayNumber() —
// ported, not reinvented, so Home and this screen never disagree. "Today"
// is computed as a UTC date string (`toISOString().slice(0,10)`) to match
// how the checkin route itself stores `checked_date` and how GET /api/sankalpa
// computes `todayStr` — using a local-timezone date here would risk a
// mismatch with what the API considers "today".

const TARGET_DAY_OPTIONS = [11, 21, 40, 108] as const;
const TEXT_MIN = 10;
const TEXT_MAX = 200;

type SankalpaStatus = 'active' | 'completed' | 'abandoned';

type SankalpaRow = {
  id: string;
  text: string;
  related_practice: string | null;
  target_days: number | null;
  start_date: string;
  end_date: string;
  status: SankalpaStatus;
};

function todayUtcString(): string {
  return new Date().toISOString().slice(0, 10);
}

// Ported verbatim from /api/native/home-summary/route.ts's buildDayNumber().
function buildDayNumber(startDate: string, today: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const current = new Date(`${today}T00:00:00Z`).getTime();
  return Math.max(1, Math.floor((current - start) / 86_400_000) + 1);
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export default function SankalpaScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sankalpa, setSankalpa] = useState<SankalpaRow | null>(null);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [creating, setCreating] = useState(false);
  const [text, setText] = useState('');
  const [targetDays, setTargetDays] = useState<(typeof TARGET_DAY_OPTIONS)[number]>(21);

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

  const loadCheckins = useCallback(async (sankalpaId: string) => {
    const response = await apiFetch(`/api/sankalpa/checkin?sankalpa_id=${encodeURIComponent(sankalpaId)}`);
    if (!response.ok) return;
    const payload = (await response.json()) as { checkins?: string[] };
    const today = todayUtcString();
    setCheckedInToday((payload.checkins ?? []).includes(today));
  }, []);

  const loadSankalpa = useCallback(async () => {
    setLoadError(false);
    const response = await apiFetch('/api/sankalpa');

    if (response.status === 401) {
      router.replace('/(auth)/login');
      return;
    }
    if (!response.ok) throw new Error('Could not load Sankalpa');

    const payload = (await response.json()) as { sankalpa: SankalpaRow | null };
    setSankalpa(payload.sankalpa);
    setCheckedInToday(false);

    if (payload.sankalpa) {
      await loadCheckins(payload.sankalpa.id);
    }
  }, [loadCheckins, router]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        await loadSankalpa();
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [loadSankalpa]);

  const handleCreate = useCallback(async () => {
    const trimmed = text.trim();
    if (trimmed.length < TEXT_MIN || trimmed.length > TEXT_MAX) {
      Alert.alert('Sankalpa', `Your intention must be between ${TEXT_MIN} and ${TEXT_MAX} characters.`);
      return;
    }

    setCreating(true);
    try {
      const response = await apiFetch('/api/sankalpa', {
        method: 'POST',
        body: JSON.stringify({ text: trimmed, target_days: targetDays }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Could not create Sankalpa');
      }

      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      setText('');
      await loadSankalpa();
    } catch (err) {
      Alert.alert('Sankalpa', err instanceof Error ? err.message : 'Could not create Sankalpa');
    } finally {
      setCreating(false);
    }
  }, [loadSankalpa, targetDays, text]);

  const handleCheckIn = useCallback(async () => {
    if (!sankalpa || checkedInToday || checkingIn) return;
    setCheckingIn(true);
    try {
      const response = await apiFetch('/api/sankalpa/checkin', {
        method: 'POST',
        body: JSON.stringify({ sankalpa_id: sankalpa.id }),
      });
      if (!response.ok) throw new Error('check-in-failed');

      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      setCheckedInToday(true);
      await loadCheckins(sankalpa.id);
    } catch {
      Alert.alert('Could not check in', 'Check your connection and try again.');
    } finally {
      setCheckingIn(false);
    }
  }, [checkedInToday, checkingIn, loadCheckins, sankalpa]);

  const handleComplete = useCallback(async () => {
    if (!sankalpa || completing) return;
    setCompleting(true);
    try {
      const response = await apiFetch('/api/sankalpa/complete', {
        method: 'POST',
        body: JSON.stringify({ sankalpa_id: sankalpa.id }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Could not complete Sankalpa');
      }

      const payload = (await response.json()) as { karmaAwarded?: number };
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      Alert.alert(
        'Sankalpa complete',
        payload.karmaAwarded ? `Well done. +${payload.karmaAwarded} karma.` : 'Well done.'
      );
      await loadSankalpa();
    } catch (err) {
      Alert.alert('Sankalpa', err instanceof Error ? err.message : 'Could not complete Sankalpa');
    } finally {
      setCompleting(false);
    }
  }, [completing, loadSankalpa, sankalpa]);

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
            icon="sun"
            title="Could not load Sankalpa"
            subtitle="Check your connection and try again."
            ctaLabel="Retry"
            onCta={() => {
              setLoading(true);
              loadSankalpa()
                .catch(() => setLoadError(true))
                .finally(() => setLoading(false));
            }}
          />
        </View>
      </Screen>
    );
  }

  const today = todayUtcString();
  const day = sankalpa ? buildDayNumber(sankalpa.start_date, today) : 0;
  const targetDaysValue = sankalpa?.target_days ?? 0;
  const progress = targetDaysValue > 0 ? clampProgress(day / targetDaysValue) : 0;

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="chevron-left" size={16} color={theme.dim} />
          <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
        </Pressable>

        <View>
          <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 30 }}>Sankalpa</Text>
          <Text style={{ marginTop: 4, color: theme.dim, fontFamily: FONTS.sans, fontSize: 14 }}>
            {sankalpa ? 'Your active vow' : 'Set an intention to hold for a fixed number of days'}
          </Text>
        </View>

        {sankalpa ? (
          <>
            <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <Feather name="sun" size={20} color={COLORS.brandGold} />
                <Text style={{ flex: 1, color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 16, lineHeight: 22 }}>
                  {sankalpa.text}
                </Text>
              </View>

              <View>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sansMedium, fontSize: 12 }}>
                  Day {Math.min(day, targetDaysValue || day)} of {targetDaysValue}
                </Text>
                <View
                  style={{
                    marginTop: 8,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: isDark ? 'rgba(197,160,89,0.16)' : 'rgba(197,160,89,0.14)',
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${progress * 100}%`,
                      height: '100%',
                      backgroundColor: COLORS.brandGold,
                      borderRadius: 3,
                    }}
                  />
                </View>
              </View>
            </Card>

            <Pressable
              onPress={() => { void handleCheckIn(); }}
              disabled={checkedInToday || checkingIn}
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: checkedInToday ? COLORS.successBorder : theme.border,
                backgroundColor: checkedInToday ? COLORS.successBg : theme.card,
                paddingVertical: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              {checkingIn ? (
                <ActivityIndicator color={COLORS.brandGold} />
              ) : (
                <Feather
                  name={checkedInToday ? 'check-circle' : 'circle'}
                  size={18}
                  color={checkedInToday ? COLORS.success : theme.dim}
                />
              )}
              <Text
                style={{
                  fontFamily: FONTS.sansSemiBold,
                  fontSize: 15,
                  color: checkedInToday ? COLORS.success : theme.text,
                }}
              >
                {checkedInToday ? 'Checked in today' : 'Check in for today'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => { void handleComplete(); }}
              disabled={completing}
              style={{
                borderRadius: 20,
                backgroundColor: COLORS.brandGold,
                paddingVertical: 16,
                alignItems: 'center',
                opacity: completing ? 0.7 : 1,
              }}
            >
              {completing ? (
                <ActivityIndicator color={COLORS.ink} />
              ) : (
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: COLORS.ink }}>
                  Mark complete
                </Text>
              )}
            </Pressable>
          </>
        ) : (
          <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 16 }}>
            <View>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14, marginBottom: 8 }}>
                Your intention
              </Text>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="e.g. I will complete my morning japa every day"
                placeholderTextColor={theme.dim}
                multiline
                maxLength={TEXT_MAX}
                style={{
                  minHeight: 90,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: isDark ? 'rgba(255,248,225,0.04)' : 'rgba(255,255,255,0.6)',
                  color: theme.text,
                  fontFamily: FONTS.sans,
                  fontSize: 15,
                  padding: 14,
                  textAlignVertical: 'top',
                }}
              />
              <Text style={{ marginTop: 6, color: theme.dim, fontFamily: FONTS.sans, fontSize: 11 }}>
                {text.trim().length}/{TEXT_MAX}
              </Text>
            </View>

            <View>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14, marginBottom: 10 }}>
                For how many days
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {TARGET_DAY_OPTIONS.map((days) => (
                  <Pressable
                    key={days}
                    onPress={() => {
                      try { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                      setTargetDays(days);
                    }}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1.5,
                      borderColor: days === targetDays ? COLORS.brandGold : theme.border,
                      backgroundColor: days === targetDays ? theme.card : 'transparent',
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: FONTS.sansSemiBold,
                        fontSize: 14,
                        color: days === targetDays ? COLORS.brandGold : theme.text,
                      }}
                    >
                      {days}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              onPress={() => { void handleCreate(); }}
              disabled={creating || text.trim().length < TEXT_MIN}
              style={{
                borderRadius: 20,
                backgroundColor: COLORS.brandGold,
                paddingVertical: 16,
                alignItems: 'center',
                opacity: creating || text.trim().length < TEXT_MIN ? 0.6 : 1,
              }}
            >
              {creating ? (
                <ActivityIndicator color={COLORS.ink} />
              ) : (
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: COLORS.ink }}>
                  Begin Sankalpa
                </Text>
              )}
            </Pressable>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
