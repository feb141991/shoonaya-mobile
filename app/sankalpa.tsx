import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { ICON_WELL, iconWellColor } from '@/lib/icons';
import { SankalpaCompletionCeremony } from '@/components/home/SankalpaCompletionCeremony';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { isGuestMode, setGuestMode } from '@/lib/guestSession';

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

type CompletedSankalpaReceipt = {
  id: string;
  text: string;
  related_practice?: string | null;
  target_days: number | null;
  status: 'completed';
  completed_at?: string;
  karmaAwarded?: number | null;
  start_date?: string;
  end_date?: string;
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
  completed_at: string | null;
};

type SankalpaHistoryStats = {
  totalCompleted: number;
  totalAbandoned: number;
  completionRate: number;
  longestDurationDays: number;
};

type SuggestSource = 'ai' | 'fallback';

function todayUtcString(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00Z`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function buildDayNumber(startDate: string, today: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const current = new Date(`${today}T00:00:00Z`).getTime();
  return Math.max(1, Math.floor((current - start) / 86_400_000) + 1);
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeout));
  });
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

function SankalpaIconWell({
  theme,
  isDark,
  size = 'md',
  icon = 'sun',
}: {
  theme: Theme;
  isDark: boolean;
  size?: 'md' | 'lg';
  icon?: keyof typeof Feather.glyphMap;
}) {
  const well = size === 'lg' ? ICON_WELL.lg : ICON_WELL.md;
  const colors = iconWellColor(isDark);

  return (
    <View
      style={{
        width: well.box,
        height: well.box,
        borderRadius: well.radius,
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Feather name={icon} size={well.icon} color={theme.brand} />
    </View>
  );
}

function SectionLabel({ children, theme }: { children: string; theme: Theme }) {
  return (
    <Text style={{ ...TYPE.chip, letterSpacing: 1.3, textTransform: 'uppercase', color: theme.brand }}>
      {children}
    </Text>
  );
}

function CreateSankalpaButton({
  disabled,
  loading,
  label = 'Begin Sankalpa',
  onPress,
  theme,
  isDark,
}: {
  disabled: boolean;
  loading: boolean;
  label?: string;
  onPress: () => void;
  theme: Theme;
  isDark: boolean;
}) {
  const isInactive = disabled || loading;
  const pressScale = useRef(new Animated.Value(1)).current;

  function animatePress(toValue: number) {
    Animated.spring(pressScale, {
      toValue,
      speed: 28,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Animated.View
      style={{
        borderRadius: 22,
        backgroundColor: isInactive ? theme.brandSoft : theme.brand,
        borderWidth: 1,
        borderColor: isInactive ? theme.borderSoft : theme.brand,
        boxShadow: !isInactive ? (isDark ? SHADOWS.md.dark : SHADOWS.md.light) : undefined,
        opacity: isInactive ? 0.68 : 1,
        transform: [{ scale: pressScale }],
      }}
    >
      <Pressable
        accessibilityLabel={label}
        accessibilityState={{ disabled: isInactive, busy: loading }}
        disabled={isInactive}
        onPressIn={() => {
          if (!isInactive) animatePress(0.97);
        }}
        onPressOut={() => {
          animatePress(1);
        }}
        onPress={() => {
          if (!isInactive) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onPress();
          }
        }}
        style={{
          minHeight: 54,
          paddingHorizontal: 18,
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 10,
        }}
      >
        {loading ? (
          <ActivityIndicator color={isDark ? COLORS.darkBg : COLORS.creamBg} />
        ) : (
          <>
            <Text
              style={{
                fontFamily: FONTS.sansSemiBold,
                fontSize: 15,
                color: isInactive ? theme.dim : isDark ? COLORS.darkBg : COLORS.creamBg,
              }}
            >
              {label}
            </Text>
            <Feather name="arrow-right" size={17} color={isInactive ? theme.dim : isDark ? COLORS.darkBg : COLORS.creamBg} />
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function SankalpaScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [sankalpa, setSankalpa] = useState<SankalpaRow | null>(null);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkins, setCheckins] = useState<string[]>([]);
  const [checkingIn, setCheckingIn] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [completedReceipt, setCompletedReceipt] = useState<CompletedSankalpaReceipt | null>(null);

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

  // Read-only history detail modal state
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<SankalpaHistoryRow | CompletedSankalpaReceipt | null>(null);
  const [selectedHistoryCheckins, setSelectedHistoryCheckins] = useState<string[] | null>(null);
  const [loadingHistoryDetails, setLoadingHistoryDetails] = useState(false);

  const [reducedMotion, setReducedMotion] = useState(false);
  const historyChevron = useRef(new Animated.Value(0)).current;
  const historyContentOpacity = useRef(new Animated.Value(0)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(14)).current;
  const heroIconScale = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);

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

  useEffect(() => {
    if (loading || loadError) return;

    if (reducedMotion) {
      heroOpacity.setValue(1);
      heroTranslateY.setValue(0);
      heroIconScale.setValue(1);
      return;
    }

    heroOpacity.setValue(0);
    heroTranslateY.setValue(14);
    heroIconScale.setValue(1);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(heroOpacity, {
          toValue: 1,
          duration: 360,
          useNativeDriver: true,
        }),
        Animated.timing(heroTranslateY, {
          toValue: 0,
          duration: 360,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.spring(heroIconScale, {
          toValue: 1.06,
          speed: 12,
          bounciness: 5,
          useNativeDriver: true,
        }),
        Animated.spring(heroIconScale, {
          toValue: 1,
          speed: 14,
          bounciness: 4,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [heroIconScale, heroOpacity, heroTranslateY, loadError, loading, reducedMotion]);

  const loadCheckins = useCallback(async (sankalpaId: string) => {
    const response = await apiFetch(`/api/sankalpa/checkin?sankalpa_id=${encodeURIComponent(sankalpaId)}`);
    if (!response.ok) return;
    const payload = (await response.json()) as { checkins?: string[] };
    const list = payload.checkins ?? [];
    setCheckins(list);
    const today = todayUtcString();
    setCheckedInToday(list.includes(today));
  }, []);

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
      const latestCompleted = (payload.history ?? []).find((row) => row.status === 'completed');
      if (latestCompleted) {
        setCompletedReceipt((current) => current ?? {
          id: latestCompleted.id,
          text: latestCompleted.text,
          related_practice: latestCompleted.related_practice,
          target_days: latestCompleted.target_days,
          status: 'completed',
          completed_at: latestCompleted.completed_at ?? latestCompleted.updated_at,
          karmaAwarded: null,
          start_date: latestCompleted.start_date,
          end_date: latestCompleted.end_date,
        });
      }
    } catch {
      // Best-effort — history is supplementary; the section just shows
      // nothing new if this fails, it doesn't block the rest of the screen.
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadSankalpa = useCallback(async () => {
    setLoadError(false);

    if (await isGuestMode()) {
      setIsGuest(true);
      return;
    }

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
    } else {
      // Resolve the latest completed receipt before leaving the loading state,
      // avoiding a misleading creation-only frame on return visits.
      await loadHistory();
    }
  }, [loadCheckins, loadHistory, router]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        await withTimeout(loadSankalpa(), 18_000, 'Sankalpa load timed out');
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [loadSankalpa]);

  const loadSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const response = await apiFetch('/api/sankalpa/suggest');
      if (!response.ok) return;
      const payload = (await response.json()) as { suggestions?: string[]; source?: SuggestSource };
      setSuggestions(payload.suggestions ?? []);
      setSuggestionsSource(payload.source ?? null);
    } catch {
      // Best-effort
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !isGuest && !sankalpa && suggestions.length === 0 && !loadingSuggestions) {
      void loadSuggestions();
    }
  }, [loading, sankalpa, suggestions.length, loadingSuggestions, loadSuggestions]);

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

  const openHistoryDetail = useCallback(async (item: SankalpaHistoryRow | CompletedSankalpaReceipt) => {
    setSelectedHistoryItem(item);
    setSelectedHistoryCheckins(null);
    setLoadingHistoryDetails(true);
    try {
      const response = await apiFetch(`/api/sankalpa/checkin?sankalpa_id=${encodeURIComponent(item.id)}`);
      if (response.ok) {
        const payload = (await response.json()) as { checkins?: string[] };
        setSelectedHistoryCheckins(payload.checkins ?? []);
      } else {
        setSelectedHistoryCheckins(null);
      }
    } catch {
      setSelectedHistoryCheckins(null);
    } finally {
      setLoadingHistoryDetails(false);
    }
  }, []);

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
      setCompletedReceipt(null);
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
    const completedRecord = { ...sankalpa };
    try {
      const response = await apiFetch('/api/sankalpa/complete', {
        method: 'POST',
        body: JSON.stringify({ sankalpa_id: sankalpa.id }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Could not complete Sankalpa');
      }

      const payload = (await response.json()) as { karmaAwarded?: number; completedAt?: string };
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}

      const receipt: CompletedSankalpaReceipt = {
        id: completedRecord.id,
        text: completedRecord.text,
        related_practice: completedRecord.related_practice,
        target_days: completedRecord.target_days,
        status: 'completed',
        completed_at: payload.completedAt,
        karmaAwarded: payload.karmaAwarded ?? null,
        start_date: completedRecord.start_date,
        end_date: completedRecord.end_date,
      };
      setCompletedReceipt(receipt);

      setCeremony({
        open: true,
        title: completedRecord.text,
        durationDays: completedRecord.target_days ?? 0,
        karmaAwarded: payload.karmaAwarded ?? null,
      });

      setSankalpa(null);
      setCheckedInToday(false);
      setCheckins([]);
      await loadHistory();
    } catch (err) {
      Alert.alert('Sankalpa', err instanceof Error ? err.message : 'Could not complete Sankalpa');
    } finally {
      setCompleting(false);
    }
  }, [completing, loadHistory, sankalpa]);

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.brand} />
        </View>
      </Screen>
    );
  }

  if (isGuest) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <BackButton style={{ marginBottom: 8 }} />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="sun"
            title="Sign in to set your Sankalpa"
            subtitle="Your intention and daily check-ins are saved to your account."
            ctaLabel="Sign in"
            onCta={() => {
              void setGuestMode(false).then(() => router.replace('/(auth)/login'));
            }}
          />
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
              withTimeout(loadSankalpa(), 18_000, 'Sankalpa load timed out')
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

  function confirmComplete() {
    if (!sankalpa) return;
    Alert.alert(
      'Complete this Sankalpa?',
      `You're on day ${Math.min(day, targetDaysValue || day)} of ${targetDaysValue}. Marking it complete ends the vow now.`,
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'Complete', style: 'default', onPress: () => { void handleComplete(); } },
      ]
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ paddingBottom: 32, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <BackButton
          showLabel={false}
          iconSize={22}
          iconColor={theme.text}
          style={{
            width: 52,
            height: 52,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.premiumBorder,
            boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
          }}
        />

        <Animated.View
          style={{
            borderRadius: 28,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.premiumBorder,
            boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
            opacity: heroOpacity,
            transform: [{ translateY: heroTranslateY }],
          }}
        >
          <LinearGradient
            colors={isDark ? [COLORS.cardBgDark, COLORS.selectionWellDark] : [COLORS.cardBgLight, COLORS.brandSoftLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 22, gap: 10, minHeight: 168, justifyContent: 'center' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Animated.View style={{ transform: [{ scale: heroIconScale }] }}>
                <SankalpaIconWell theme={theme} isDark={isDark} size="lg" icon="sunrise" />
              </Animated.View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <SectionLabel theme={theme}>Sacred intention</SectionLabel>
                <Text style={{ marginTop: 5, ...TYPE.screenTitle, color: theme.text }}>Sankalpa</Text>
              </View>
            </View>
            <Text style={{ ...TYPE.body, color: theme.dim, maxWidth: 310 }}>
              {sankalpa ? 'Your active vow, held one day at a time.' : 'Set one clear vow and return to it daily.'}
            </Text>
          </LinearGradient>
        </Animated.View>

        {sankalpa ? (
          <>
            <Card
              tone="auto"
              elevated
              style={{
                backgroundColor: theme.card,
                borderColor: theme.premiumBorder,
                gap: 18,
                boxShadow: isDark ? SHADOWS.heroCard.dark : SHADOWS.heroCard.light,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                <SankalpaIconWell theme={theme} isDark={isDark} icon="target" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <SectionLabel theme={theme}>Active Sankalpa</SectionLabel>
                  <Text style={{ marginTop: 4, ...TYPE.cardHeading, color: theme.text }}>
                    {sankalpa.text}
                  </Text>
                  <Text style={{ marginTop: 5, ...TYPE.caption, color: theme.dim }}>
                    {checkedInToday ? 'Honoured today' : 'Hold this intention with one clear action today.'}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: checkedInToday ? COLORS.successBorder : theme.borderSoft,
                  backgroundColor: checkedInToday ? COLORS.successBg : isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <ProgressRing
                  progress={progress}
                  done={progress >= 1}
                  color={checkedInToday ? COLORS.success : theme.brand}
                  track={isDark ? COLORS.homeRingTrackDark : COLORS.homeRingTrackLight}
                  size={64}
                  strokeWidth={4}
                />
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text style={{ ...TYPE.chip, color: checkedInToday ? COLORS.success : theme.brand }}>
                    {Math.round(progress * 100)}% held
                  </Text>
                  <Text style={{ ...TYPE.label, color: theme.text }}>
                    Day {Math.min(day, targetDaysValue || day)} of {targetDaysValue}
                  </Text>
                  <Text style={{ ...TYPE.caption, color: theme.dim }} numberOfLines={1}>
                    {checkins.length} check-ins recorded
                  </Text>
                </View>
              </View>

              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: checkedInToday ? COLORS.successBorder : theme.borderSoft,
                  backgroundColor: checkedInToday ? COLORS.successBg : theme.card,
                }}
              >
                <PressableSurface
                  accessibilityLabel={checkedInToday ? 'Sankalpa honoured today' : 'Honour today’s Sankalpa'}
                  accessibilityState={{ disabled: checkedInToday || checkingIn, busy: checkingIn }}
                  haptic="impact"
                  onPress={() => { void handleCheckIn(); }}
                  disabled={checkedInToday || checkingIn}
                  style={{
                    minHeight: MIN_TOUCH_TARGET,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
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
                      color={checkedInToday ? COLORS.success : theme.brand}
                    />
                  )}
                  <Text
                    style={{
                      fontFamily: FONTS.sansSemiBold,
                      fontSize: 15,
                      color: checkedInToday ? COLORS.success : theme.text,
                    }}
                  >
                    {checkedInToday ? 'Honoured today' : 'Honour today'}
                  </Text>
                </PressableSurface>
              </View>
            </Card>

            <Button label="Mark complete" loading={completing} onPress={confirmComplete} />
          </>
        ) : (
          <>
            {/* 1. Latest completed Sankalpa receipt (when available) */}
            {completedReceipt ? (
              <Card
                tone="auto"
                elevated
                style={{
                  backgroundColor: theme.card,
                  borderColor: COLORS.successBorder,
                  gap: 16,
                  boxShadow: isDark ? SHADOWS.heroCard.dark : SHADOWS.heroCard.light,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: COLORS.successBg,
                        borderWidth: 1,
                        borderColor: COLORS.successBorder,
                      }}
                    >
                      <Feather name="check-circle" size={18} color={COLORS.success} />
                    </View>
                    <View>
                      <Text style={{ ...TYPE.chip, letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.success }}>
                        Completed Sankalpa
                      </Text>
                      <Text style={{ ...TYPE.cardHeading, color: theme.text, marginTop: 2 }}>
                        Vow Fulfilled
                      </Text>
                    </View>
                  </View>
                  {completedReceipt.karmaAwarded ? (
                    <View
                      style={{
                        borderRadius: 999,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        backgroundColor: `${theme.brand}22`,
                        borderWidth: 1,
                        borderColor: `${theme.brand}4d`,
                      }}
                    >
                      <Text style={{ ...TYPE.chip, color: theme.brand, textTransform: 'none' }}>
                        +{completedReceipt.karmaAwarded} Karma
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View
                  style={{
                    borderRadius: 18,
                    padding: 14,
                    backgroundColor: isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight,
                    borderWidth: 1,
                    borderColor: theme.borderSoft,
                    gap: 6,
                  }}
                >
                  <Text style={{ ...TYPE.body, fontFamily: FONTS.serif, fontStyle: 'italic', fontSize: 15, color: theme.text }}>
                    &ldquo;{completedReceipt.text}&rdquo;
                  </Text>
                  <Text style={{ ...TYPE.caption, color: theme.dim }}>
                    {completedReceipt.target_days ? `${completedReceipt.target_days} days committed · ` : ''}Fulfilled on {formatDate(completedReceipt.completed_at || completedReceipt.end_date)}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="View journey"
                      variant="secondary"
                      onPress={() => {
                        void openHistoryDetail(completedReceipt);
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Begin another"
                      onPress={() => {
                        textInputRef.current?.focus();
                        scrollViewRef.current?.scrollTo({ y: 350, animated: true });
                      }}
                    />
                  </View>
                </View>
              </Card>
            ) : null}

            {/* 2. Begin a vow creation card */}
            <Card tone="auto" elevated style={{ backgroundColor: theme.card, borderColor: theme.premiumBorder, gap: 18, boxShadow: isDark ? SHADOWS.heroCard.dark : SHADOWS.heroCard.light }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <SankalpaIconWell theme={theme} isDark={isDark} icon="edit-3" />
                <View style={{ flex: 1 }}>
                  <SectionLabel theme={theme}>{completedReceipt ? 'Begin another Sankalpa' : 'Begin a vow'}</SectionLabel>
                  <Text style={{ marginTop: 3, ...TYPE.cardHeading, color: theme.text }}>
                    {completedReceipt ? 'Set your next intention' : 'Choose your intention'}
                  </Text>
                </View>
              </View>

              {loadingSuggestions ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color={theme.brand} />
                  <Text style={{ ...TYPE.micro, color: theme.dim }}>Finding suggestions for you…</Text>
                </View>
              ) : suggestions.length > 0 ? (
                <View>
                  <Text style={{ ...TYPE.label, color: theme.dim, marginBottom: 10 }}>
                    {suggestionsSource === 'ai' ? 'Pick a suggested vow' : 'Pick a suggested vow'}
                  </Text>
                  <View style={{ gap: 8 }}>
                    {suggestions.map((suggestion, i) => (
                      <View
                        key={`${i}-${suggestion.slice(0, 12)}`}
                        style={{
                          borderRadius: 18,
                          borderWidth: 1,
                          borderColor: theme.borderSoft,
                          backgroundColor: isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight,
                        }}
                      >
                        <Pressable
                          accessibilityLabel={`Use suggestion: ${suggestion}`}
                          onPress={() => {
                            void Haptics.selectionAsync().catch(() => {});
                            setText(suggestion);
                          }}
                          style={{ paddingHorizontal: 12, paddingVertical: 9, minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 9 }}
                        >
                          <Feather name="plus" size={13} color={theme.brand} />
                          <Text
                            numberOfLines={2}
                            style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 12.5, lineHeight: 17, color: theme.text }}
                          >
                            {suggestion}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <View>
                <Text style={{ ...TYPE.label, color: theme.text, marginBottom: 8 }}>
                  Or write your own
                </Text>
                <TextInput
                  ref={textInputRef}
                  value={text}
                  onChangeText={setText}
                  placeholder="e.g. I will complete my morning japa every day"
                  placeholderTextColor={theme.dim}
                  multiline
                  maxLength={TEXT_MAX}
                  style={{
                    minHeight: 104,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: theme.premiumBorder,
                    backgroundColor: isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight,
                    color: theme.text,
                    fontFamily: FONTS.sans,
                    fontSize: 15,
                    padding: 14,
                    textAlignVertical: 'top',
                  }}
                />
                <Text style={{ ...TYPE.micro, marginTop: 6, color: theme.dim, textAlign: 'right' }}>
                  {text.trim().length}/{TEXT_MAX}
                </Text>
              </View>

              <View>
                <Text style={{ ...TYPE.label, color: theme.text, marginBottom: 10 }}>
                  For how many days
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {TARGET_DAY_OPTIONS.map((days) => (
                    <View
                      key={days}
                      style={{
                        flex: 1,
                        borderRadius: 999,
                        borderWidth: 1.5,
                        borderColor: days === targetDays ? theme.brand : theme.borderSoft,
                        backgroundColor:
                          days === targetDays
                            ? theme.brandSoft
                            : isDark
                              ? COLORS.selectionWellDark
                              : COLORS.selectionWellLight,
                      }}
                    >
                      <Pressable
                        accessibilityLabel={`${days} day Sankalpa`}
                        accessibilityState={{ selected: days === targetDays }}
                        onPress={() => {
                          void Haptics.selectionAsync().catch(() => {});
                          setTargetDays(days);
                        }}
                        style={{
                          minHeight: MIN_TOUCH_TARGET,
                          paddingHorizontal: 8,
                          paddingVertical: 10,
                          justifyContent: 'center',
                          alignItems: 'center',
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
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>

              <CreateSankalpaButton
                theme={theme}
                isDark={isDark}
                loading={creating}
                label={completedReceipt ? 'Begin another Sankalpa' : 'Begin Sankalpa'}
                disabled={text.trim().length < TEXT_MIN}
                onPress={() => { void handleCreate(); }}
              />
            </Card>
          </>
        )}

        {/* 3. History card */}
        <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.premiumBorder, gap: 0, padding: 0, overflow: 'hidden' }}>
          <PressableSurface
            accessibilityRole="button"
            accessibilityLabel={historyExpanded ? 'Collapse previous Sankalpas' : 'Expand previous Sankalpas'}
            accessibilityState={{ expanded: historyExpanded }}
            haptic="selection"
            onPress={toggleHistory}
            style={{ minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <SankalpaIconWell theme={theme} isDark={isDark} icon="clock" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <SectionLabel theme={theme}>History</SectionLabel>
                <Text style={{ marginTop: 2, ...TYPE.label, color: theme.text }} numberOfLines={1}>Previous Sankalpas</Text>
              </View>
            </View>
            <Animated.View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight,
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
                  <View style={{ gap: 8 }}>
                    {history.map((row) => (
                      <Pressable
                        key={row.id}
                        accessibilityRole="button"
                        accessibilityLabel={`View journey for: ${row.text}`}
                        onPress={() => {
                          void openHistoryDetail(row);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          borderRadius: 18,
                          backgroundColor: isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight,
                          borderWidth: 1,
                          borderColor: theme.borderSoft,
                        }}
                      >
                        <Feather
                          name={row.status === 'completed' ? 'check-circle' : 'x-circle'}
                          size={18}
                          color={row.status === 'completed' ? COLORS.success : theme.dim}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text numberOfLines={1} style={{ ...TYPE.label, color: theme.text }}>
                            {row.text}
                          </Text>
                          <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 2 }}>
                            {row.target_days ?? '—'} days · {row.status === 'completed' ? 'Completed' : 'Abandoned'}
                          </Text>
                        </View>
                        <Feather name="chevron-right" size={14} color={theme.dim} />
                      </Pressable>
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

      {/* Ceremony Overlay */}
      <SankalpaCompletionCeremony
        visible={ceremony.open}
        onClose={() => {
          setCeremony((prev) => ({ ...prev, open: false }));
          setHistoryExpanded(true);
          historyChevron.setValue(1);
          historyContentOpacity.setValue(1);
        }}
        sankalpaTitle={ceremony.title}
        durationDays={ceremony.durationDays}
        karmaAwarded={ceremony.karmaAwarded}
      />

      {/* Read-Only History Detail Modal */}
      <Modal
        transparent
        visible={Boolean(selectedHistoryItem)}
        animationType="fade"
        onRequestClose={() => setSelectedHistoryItem(null)}
      >
        <View style={{ flex: 1, backgroundColor: COLORS.bottomSheetScrim, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close detail"
            onPress={() => setSelectedHistoryItem(null)}
            style={{ position: 'absolute', inset: 0 }}
          />
          <View
            style={{
              width: '100%',
              maxWidth: 420,
              borderRadius: 28,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              padding: 24,
              gap: 16,
              boxShadow: isDark ? SHADOWS.lg.dark : SHADOWS.lg.light,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <SankalpaIconWell theme={theme} isDark={isDark} size="md" icon={selectedHistoryItem?.status === 'completed' ? 'check-circle' : 'clock'} />
                <View>
                  <SectionLabel theme={theme}>Sankalpa Journey</SectionLabel>
                  <Text style={{ ...TYPE.cardHeading, color: theme.text, marginTop: 2 }}>
                    {selectedHistoryItem?.status === 'completed' ? 'Fulfilled Vow' : 'Past Vow'}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={10}
                onPress={() => setSelectedHistoryItem(null)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight,
                }}
              >
                <Feather name="x" size={18} color={theme.dim} />
              </Pressable>
            </View>

            <View
              style={{
                borderRadius: 18,
                padding: 16,
                backgroundColor: isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight,
                borderWidth: 1,
                borderColor: theme.borderSoft,
                gap: 8,
              }}
            >
              <Text style={{ ...TYPE.body, fontFamily: FONTS.serif, fontSize: 16, fontStyle: 'italic', color: theme.text }}>
                &ldquo;{selectedHistoryItem?.text}&rdquo;
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatPill
                label="Target"
                value={`${selectedHistoryItem?.target_days ?? '—'}d`}
                theme={theme}
              />
              <StatPill
                label="Status"
                value={selectedHistoryItem?.status === 'completed' ? 'Completed' : 'Ended'}
                theme={theme}
              />
              <StatPill
                label="Check-ins"
                value={
                  loadingHistoryDetails
                    ? '...'
                    : selectedHistoryCheckins !== null
                    ? String(selectedHistoryCheckins.length)
                    : '—'
                }
                theme={theme}
              />
            </View>

            <View style={{ gap: 8, marginTop: 4 }}>
              {selectedHistoryItem?.start_date ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ ...TYPE.caption, color: theme.dim }}>Started</Text>
                  <Text style={{ ...TYPE.label, color: theme.text }}>{formatDate(selectedHistoryItem.start_date)}</Text>
                </View>
              ) : null}
              {selectedHistoryItem?.completed_at || selectedHistoryItem?.end_date ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ ...TYPE.caption, color: theme.dim }}>
                    {selectedHistoryItem?.status === 'completed' ? 'Completed' : 'Ended'}
                  </Text>
                  <Text style={{ ...TYPE.label, color: theme.text }}>
                    {formatDate(selectedHistoryItem?.completed_at || selectedHistoryItem?.end_date)}
                  </Text>
                </View>
              ) : null}
            </View>

            <Button
              label="Close"
              variant="secondary"
              onPress={() => setSelectedHistoryItem(null)}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
