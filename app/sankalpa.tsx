import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, MIN_TOUCH_TARGET, TYPE, themeColor } from '@/lib/constants';
import { SankalpaCompletionCeremony } from '@/components/home/SankalpaCompletionCeremony';

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

// Mirrors the shape returned by GET /api/sankalpa/history (web repo).
type SankalpaHistoryRow = {
  id: string;
  text: string;
  related_practice: string | null;
  target_days: number | null;
  start_date: string;
  end_date: string;
  status: 'completed' | 'abandoned';
  created_at: string;
  updated_at: string;
};

type SankalpaHistoryStats = {
  totalCompleted: number;
  totalAbandoned: number;
  completionRate: number;
  longestDurationDays: number;
};

// Mirrors GET /api/sankalpa/suggest's `source` field — 'ai' when the
// personalized model call succeeded, 'fallback' when the static curated
// bank was used instead (AI unavailable/timed out/malformed). The UI
// treats both the same functionally; only the label above the chips
// differs, so the fallback path never reads as broken.
type SuggestSource = 'ai' | 'fallback';

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

// UTC-safe "start_date + n days" — matches the UTC-date convention this
// screen already uses for todayUtcString()/buildDayNumber() so the checkin
// grid never drifts a day off from what the API considers each date to be.
function addDaysUtc(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type Theme = ReturnType<typeof themeColor>;

function StatPill({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
        paddingVertical: 10,
        paddingHorizontal: 8,
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Text style={{ fontFamily: FONTS.serifBold, fontSize: 16, color: theme.text }}>{value}</Text>
      <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: theme.dim, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

export default function SankalpaScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sankalpa, setSankalpa] = useState<SankalpaRow | null>(null);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkins, setCheckins] = useState<string[]>([]);
  const [checkingIn, setCheckingIn] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [creating, setCreating] = useState(false);
  const [text, setText] = useState('');
  const [targetDays, setTargetDays] = useState<(typeof TARGET_DAY_OPTIONS)[number]>(21);

  // Suggested-sankalpa chips (create flow only). AI-personalized when
  // possible, always backed by the static bank — see loadSuggestions().
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsSource, setSuggestionsSource] = useState<SuggestSource | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Previous-Sankalpas history — lazy-loaded on first expand so a screen
  // visit that never opens it costs zero extra requests.
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<SankalpaHistoryRow[]>([]);
  const [historyStats, setHistoryStats] = useState<SankalpaHistoryStats | null>(null);

  const [reducedMotion, setReducedMotion] = useState(false);
  const historyChevron = useRef(new Animated.Value(0)).current;
  const historyContentOpacity = useRef(new Animated.Value(0)).current;
  const gridOpacity = useRef(new Animated.Value(0)).current;
  const gridTranslate = useRef(new Animated.Value(8)).current;

  // Ceremony is purely presentational — see components/home/
  // SankalpaCompletionCeremony.tsx. karmaAwarded comes straight from the
  // /api/sankalpa/complete response (the real, server-side award); title/
  // durationDays are captured from `sankalpa` right before handleComplete's
  // own loadSankalpa() call clears it back to null.
  const [ceremony, setCeremony] = useState<{ open: boolean; title: string; durationDays: number; karmaAwarded: number | null }>({
    open: false,
    title: '',
    durationDays: 0,
    karmaAwarded: null,
  });

  const theme = useMemo(() => themeColor(isDark), [isDark]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => sub.remove();
  }, []);

  const loadCheckins = useCallback(async (sankalpaId: string) => {
    const response = await apiFetch(`/api/sankalpa/checkin?sankalpa_id=${encodeURIComponent(sankalpaId)}`);
    if (!response.ok) return;
    const payload = (await response.json()) as { checkins?: string[] };
    const list = payload.checkins ?? [];
    setCheckins(list);
    const today = todayUtcString();
    setCheckedInToday(list.includes(today));
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
    setCheckins([]);

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

  // Active-vow checkin grid entrance — fades/lifts in once per vow (keyed
  // by id so switching to a newly created Sankalpa re-triggers it), skipped
  // entirely under reduced motion.
  useEffect(() => {
    if (!sankalpa) return;
    if (reducedMotion) {
      gridOpacity.setValue(1);
      gridTranslate.setValue(0);
      return;
    }
    gridOpacity.setValue(0);
    gridTranslate.setValue(8);
    Animated.parallel([
      Animated.timing(gridOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.spring(gridTranslate, { toValue: 0, useNativeDriver: true, friction: 8, tension: 60 }),
    ]).start();
  }, [sankalpa?.id, reducedMotion, gridOpacity, gridTranslate]);

  const loadSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const response = await apiFetch('/api/sankalpa/suggest');
      if (!response.ok) return;
      const payload = (await response.json()) as { suggestions?: string[]; source?: SuggestSource };
      setSuggestions(payload.suggestions ?? []);
      setSuggestionsSource(payload.source ?? null);
    } catch {
      // Best-effort — suggestions are an enhancement; the create flow works
      // fine with an empty text field if this fails.
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  // Fetch suggestions once the active-vow check resolves to "none" — never
  // on the active-vow path, and never more than once per empty-state visit.
  useEffect(() => {
    if (!loading && !sankalpa && suggestions.length === 0 && !loadingSuggestions) {
      void loadSuggestions();
    }
  }, [loading, sankalpa, suggestions.length, loadingSuggestions, loadSuggestions]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await apiFetch('/api/sankalpa/history');
      if (!response.ok) return;
      const payload = (await response.json()) as {
        history?: SankalpaHistoryRow[];
        stats?: SankalpaHistoryStats;
      };
      setHistory(payload.history ?? []);
      setHistoryStats(payload.stats ?? null);
      setHistoryLoaded(true);
    } catch {
      // Best-effort — history is supplementary; the section just shows
      // nothing new if this fails, it doesn't block the rest of the screen.
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const toggleHistory = useCallback(() => {
    const next = !historyExpanded;
    setHistoryExpanded(next);
    Animated.timing(historyChevron, {
      toValue: next ? 1 : 0,
      duration: reducedMotion ? 0 : 200,
      useNativeDriver: true,
    }).start();

    if (next) {
      historyContentOpacity.setValue(reducedMotion ? 1 : 0);
      Animated.timing(historyContentOpacity, {
        toValue: 1,
        duration: reducedMotion ? 0 : 220,
        useNativeDriver: true,
      }).start();
      if (!historyLoaded && !historyLoading) {
        void loadHistory();
      }
    }
  }, [historyExpanded, historyChevron, historyContentOpacity, reducedMotion, historyLoaded, historyLoading, loadHistory]);

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
    // Captured before loadSankalpa() below resets `sankalpa` back to null —
    // the ceremony still needs the title/duration of the vow that was just
    // completed.
    const completedTitle = sankalpa.text;
    const completedDurationDays = sankalpa.target_days ?? 0;
    try {
      const response = await apiFetch('/api/sankalpa/complete', {
        method: 'POST',
        body: JSON.stringify({ sankalpa_id: sankalpa.id }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Could not complete Sankalpa');
      }

      // Karma is already awarded server-side by this point (the POST above
      // has completed and its response is what we read karmaAwarded from) —
      // the ceremony that follows is celebratory UI only, not a write.
      const payload = (await response.json()) as { karmaAwarded?: number };
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      setCeremony({
        open: true,
        title: completedTitle,
        durationDays: completedDurationDays,
        karmaAwarded: payload.karmaAwarded ?? null,
      });
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
          <ActivityIndicator color={theme.brand} />
        </View>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <BackButton style={{ marginBottom: 8 }} />
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
        <BackButton />

        <View>
          <Text style={{ ...TYPE.screenTitle, color: theme.text }}>Sankalpa</Text>
          <Text style={{ ...TYPE.body, marginTop: 4, color: theme.dim }}>
            {sankalpa ? 'Your active vow' : 'Set an intention to hold for a fixed number of days'}
          </Text>
        </View>

        {sankalpa ? (
          <>
            <Card tone="auto" elevated style={{ backgroundColor: theme.glass, borderColor: theme.premiumBorder, gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="sun" size={20} color={theme.brand} />
                </View>
                <Text style={{ ...TYPE.cardHeading, flex: 1, color: theme.text }}>
                  {sankalpa.text}
                </Text>
              </View>

              <View>
                <Text style={{ ...TYPE.label, color: theme.dim }}>
                  Day {Math.min(day, targetDaysValue || day)} of {targetDaysValue}
                </Text>
                <View
                  style={{
                    marginTop: 8,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: theme.brandSoft,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${progress * 100}%`,
                      height: '100%',
                      backgroundColor: theme.brand,
                      borderRadius: 3,
                    }}
                  />
                </View>

                {targetDaysValue > 0 ? (
                  <Animated.View
                    style={{
                      opacity: gridOpacity,
                      transform: [{ translateY: gridTranslate }],
                      marginTop: 14,
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 6,
                    }}
                  >
                    {Array.from({ length: targetDaysValue }).map((_, i) => {
                      const dateStr = addDaysUtc(sankalpa.start_date, i);
                      const isChecked = checkins.includes(dateStr);
                      const isToday = dateStr === today;
                      const isFuture = dateStr > today;
                      const isMissed = !isFuture && !isChecked && !isToday;

                      return (
                        <View
                          key={dateStr}
                          accessibilityLabel={
                            isChecked ? `Day ${i + 1}, honored` : isToday ? `Day ${i + 1}, today` : isMissed ? `Day ${i + 1}, missed` : `Day ${i + 1}, upcoming`
                          }
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: isChecked
                              ? theme.brand
                              : isMissed
                                ? theme.border
                                : 'transparent',
                            borderWidth: isToday && !isChecked ? 1.5 : isFuture ? 1 : 0,
                            borderColor: isToday ? theme.brand : theme.border,
                          }}
                        />
                      );
                    })}
                  </Animated.View>
                ) : null}
              </View>
            </Card>

            <PressableSurface
              accessibilityLabel={checkedInToday ? 'Checked in today' : 'Check in for today'}
              accessibilityState={{ disabled: checkedInToday || checkingIn, busy: checkingIn }}
              haptic="impact"
              onPress={() => { void handleCheckIn(); }}
              disabled={checkedInToday || checkingIn}
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: checkedInToday ? COLORS.successBorder : theme.border,
                backgroundColor: checkedInToday ? COLORS.successBg : theme.card,
                minHeight: MIN_TOUCH_TARGET,
                paddingVertical: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              {checkingIn ? (
                <ActivityIndicator color={theme.brand} />
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
            </PressableSurface>

            <Button
              label="Mark complete"
              loading={completing}
              onPress={() => { void handleComplete(); }}
            />
          </>
        ) : (
          <Card tone="auto" elevated style={{ backgroundColor: theme.glass, borderColor: theme.premiumBorder, gap: 16 }}>
            {loadingSuggestions ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color={theme.brand} />
                <Text style={{ ...TYPE.micro, color: theme.dim }}>Finding suggestions for you…</Text>
              </View>
            ) : suggestions.length > 0 ? (
              <View>
                <Text style={{ ...TYPE.label, color: theme.text, marginBottom: 10 }}>
                  {suggestionsSource === 'ai' ? 'Suggested for you' : 'Need a starting point?'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {suggestions.map((suggestion, i) => (
                    <PressableSurface
                      key={`${i}-${suggestion.slice(0, 12)}`}
                      accessibilityLabel={`Use suggestion: ${suggestion}`}
                      haptic="selection"
                      onPress={() => setText(suggestion)}
                      style={{
                        maxWidth: '100%',
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: theme.border,
                        backgroundColor: theme.card,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                      }}
                    >
                      <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: theme.text }}>
                        {suggestion}
                      </Text>
                    </PressableSurface>
                  ))}
                </View>
              </View>
            ) : null}

            <View>
              <Text style={{ ...TYPE.label, color: theme.text, marginBottom: 8 }}>
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
                  backgroundColor: isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight,
                  color: theme.text,
                  fontFamily: FONTS.sans,
                  fontSize: 15,
                  padding: 14,
                  textAlignVertical: 'top',
                }}
              />
              <Text style={{ ...TYPE.micro, marginTop: 6, color: theme.dim }}>
                {text.trim().length}/{TEXT_MAX}
              </Text>
            </View>

            <View>
              <Text style={{ ...TYPE.label, color: theme.text, marginBottom: 10 }}>
                For how many days
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {TARGET_DAY_OPTIONS.map((days) => (
                  <PressableSurface
                    key={days}
                    accessibilityLabel={`${days} day Sankalpa`}
                    accessibilityState={{ selected: days === targetDays }}
                    haptic="selection"
                    onPress={() => {
                      setTargetDays(days);
                    }}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1.5,
                      borderColor: days === targetDays ? theme.brand : theme.border,
                      backgroundColor: days === targetDays ? theme.brandSoft : theme.card,
                      minHeight: MIN_TOUCH_TARGET,
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: FONTS.sansSemiBold,
                        fontSize: 14,
                        color: days === targetDays ? theme.brand : theme.text,
                      }}
                    >
                      {days}
                    </Text>
                  </PressableSurface>
                ))}
              </View>
            </View>

            <Button
              label="Begin Sankalpa"
              loading={creating}
              disabled={text.trim().length < TEXT_MIN}
              onPress={() => { void handleCreate(); }}
            />
          </Card>
        )}

        <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 0, padding: 0, overflow: 'hidden' }}>
          <PressableSurface
            accessibilityRole="button"
            accessibilityLabel={historyExpanded ? 'Collapse previous Sankalpas' : 'Expand previous Sankalpas'}
            accessibilityState={{ expanded: historyExpanded }}
            haptic="selection"
            onPress={toggleHistory}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather name="clock" size={16} color={theme.dim} />
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: theme.text }}>Previous Sankalpas</Text>
            </View>
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: historyChevron.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }),
                  },
                ],
              }}
            >
              <Feather name="chevron-down" size={18} color={theme.dim} />
            </Animated.View>
          </PressableSurface>

          {historyExpanded ? (
            <Animated.View style={{ opacity: historyContentOpacity, paddingHorizontal: 16, paddingBottom: 16, gap: 14 }}>
              {historyLoading ? (
                <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                  <ActivityIndicator color={theme.brand} />
                </View>
              ) : historyStats && historyStats.totalCompleted + historyStats.totalAbandoned > 0 ? (
                <>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <StatPill label="Completed" value={String(historyStats.totalCompleted)} theme={theme} />
                    <StatPill label="Completion rate" value={`${historyStats.completionRate}%`} theme={theme} />
                    <StatPill label="Longest" value={`${historyStats.longestDurationDays}d`} theme={theme} />
                  </View>
                  <View style={{ gap: 4 }}>
                    {history.map((row) => (
                      <View
                        key={row.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          paddingVertical: 8,
                          borderBottomWidth: 1,
                          borderBottomColor: theme.border,
                        }}
                      >
                        <Feather
                          name={row.status === 'completed' ? 'check-circle' : 'x-circle'}
                          size={16}
                          color={row.status === 'completed' ? COLORS.success : theme.dim}
                        />
                        <View style={{ flex: 1 }}>
                          <Text numberOfLines={1} style={{ fontFamily: FONTS.sans, fontSize: 13, color: theme.text }}>
                            {row.text}
                          </Text>
                          <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: theme.dim, marginTop: 2 }}>
                            {row.target_days ?? '—'} days · {row.status === 'completed' ? 'Completed' : 'Abandoned'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <Text style={{ ...TYPE.body, color: theme.dim }}>No previous Sankalpas yet.</Text>
              )}
            </Animated.View>
          ) : null}
        </Card>
      </ScrollView>

      <SankalpaCompletionCeremony
        visible={ceremony.open}
        onClose={() => setCeremony((prev) => ({ ...prev, open: false }))}
        sankalpaTitle={ceremony.title}
        durationDays={ceremony.durationDays}
        karmaAwarded={ceremony.karmaAwarded}
      />
    </Screen>
  );
}
