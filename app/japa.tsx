import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Share,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, Defs, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { Screen } from '@/components/ui/Screen';
import { ConfettiOverlay } from '@/components/ui/ConfettiOverlay';
import { apiFetch } from '@/lib/api';
import { API_BASE, COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { getMalaSkin, MALA_SKINS } from '@/lib/mala-skins';
import { supabase } from '@/lib/supabase';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { getJapaMantrasForTradition, getJapaPracticeType, type JapaMantra } from '@/lib/traditions';

type ProfileRow = {
  active_symbol_id: string | null;
  tradition: string | null;
};

type MalaSessionRow = {
  id: string;
  mantra: string | null;
  count: number | null;
  completed_at: string | null;
};

type ToastState = {
  visible: boolean;
  message: string;
};

const HISTORY_LIMIT = 12;
const SVG_SIZE = 320;
const CENTER = SVG_SIZE / 2;
const RADIUS = 120;
const MANTRA_AUDIO_KEY = 'shoonaya.japa.mantraAudio';
const JAPA_MALA_KEY = 'shoonaya.japa.selectedMala';
const JAPA_SCENE_KEY = 'shoonaya.japa.scene';
const JAPA_CUSTOM_MANTRA_KEY = 'shoonaya.japa.customMantra';
const JAPA_TARGET_ROUNDS_KEY = 'shoonaya.japa.targetRounds';

const BG_SCENES = [
  {
    id: 'midnight',
    name: 'Midnight',
    icon: 'moon',
    colors: [COLORS.darkBg, COLORS.cardBgDark, COLORS.homeHeroDark] as const,
    lightColors: [COLORS.creamBg, COLORS.homeRaisedLight, COLORS.homeHeroLight] as const,
  },
  {
    id: 'himalayan',
    name: 'Himalayan Dawn',
    icon: 'sunrise',
    colors: [COLORS.darkBg, COLORS.brandEarthLight, COLORS.cardBgDark] as const,
    lightColors: [COLORS.homeHeroLight, COLORS.creamBg, COLORS.homeRaisedLight] as const,
  },
  {
    id: 'temple',
    name: 'Temple Lamp',
    icon: 'flame',
    colors: [COLORS.homeHeroDark, COLORS.brandPrimaryStrongLight, COLORS.darkBg] as const,
    lightColors: [COLORS.homeRaisedLight, COLORS.brandSoftLight, COLORS.creamBg] as const,
  },
  {
    id: 'river',
    name: 'River Ghat',
    icon: 'droplet',
    colors: [COLORS.darkBg, COLORS.navy, COLORS.cardBgDark] as const,
    lightColors: [COLORS.brandAccentLight, COLORS.navyBg, COLORS.creamBg] as const,
  },
] as const;

type JapaSceneId = typeof BG_SCENES[number]['id'];
type CompletionStats = {
  rounds: number;
  beads: number;
  durationSecs: number;
  mantraName: string;
};

function getSacredSymbol(tradition: string | null) {
  if (tradition === 'sikh') return 'ੴ';
  if (tradition === 'buddhist') return '☸';
  if (tradition === 'jain') return '☮';
  return 'ॐ';
}

function getCompletionTitle(tradition: string | null) {
  if (tradition === 'sikh') return 'Simran Complete';
  if (tradition === 'buddhist') return 'Meditation Complete';
  if (tradition === 'jain') return 'Japa Complete';
  return 'माला पूर्ण हुई';
}

function getSpiritualTimeWindow() {
  const hour = new Date().getHours();
  if (hour >= 3 && hour < 6) return 'brahma_muhurta';
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'midday';
  if (hour >= 16 && hour < 20) return 'sandhya';
  return 'night';
}

function formatDuration(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
}

export default function JapaScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const theme = themeColor(isDark);

  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [mantraIndex, setMantraIndex] = useState(0);
  const [activeSymbolId, setActiveSymbolId] = useState<string | null>(null);
  const [tradition, setTradition] = useState<string | null>('hindu');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<MalaSessionRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '' });
  const [completionVisible, setCompletionVisible] = useState(false);
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [mantraAudioEnabled, setMantraAudioEnabled] = useState(false);
  const [mantraAudioLoading, setMantraAudioLoading] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customMantraOpen, setCustomMantraOpen] = useState(false);
  const [selectedMalaId, setSelectedMalaId] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<JapaSceneId>('midnight');
  const [customMantraText, setCustomMantraText] = useState('');
  const [completionInsight, setCompletionInsight] = useState<string | null>(null);
  const [completionInsightLoading, setCompletionInsightLoading] = useState(false);
  const [completionStats, setCompletionStats] = useState<CompletionStats | null>(null);

  const [targetRounds, setTargetRounds] = useState(1);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [durationSecs, setDurationSecs] = useState(0);


  const malaSkin = useMemo(() => getMalaSkin(selectedMalaId ?? activeSymbolId), [activeSymbolId, selectedMalaId]);
  const mantras = useMemo(() => getJapaMantrasForTradition(tradition), [tradition]);
  const customMantra = useMemo<JapaMantra | null>(() => {
    const trimmed = customMantraText.trim();
    if (trimmed.length < 2) return null;
    return {
      key: 'custom',
      label: trimmed.length > 42 ? `${trimmed.slice(0, 39)}...` : trimmed,
      devanagari: trimmed,
      meaning: 'Your personal mantra for this practice.',
      tradition: 'all',
    };
  }, [customMantraText]);
  const mantraOptions = useMemo(() => customMantra ? [...mantras, customMantra] : mantras, [customMantra, mantras]);
  const mantra = mantraOptions[mantraIndex] ?? mantraOptions[0];
  const practiceType = getJapaPracticeType(tradition);
  const scene = BG_SCENES.find((item) => item.id === selectedSceneId) ?? BG_SCENES[0];

  const audioPlayer = useAudioPlayer();
  const mantraAudioActive = useRef(false);

  // Load saved mantra audio preference
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(MANTRA_AUDIO_KEY),
      AsyncStorage.getItem(JAPA_MALA_KEY),
      AsyncStorage.getItem(JAPA_SCENE_KEY),
      AsyncStorage.getItem(JAPA_CUSTOM_MANTRA_KEY),
      AsyncStorage.getItem(JAPA_TARGET_ROUNDS_KEY),
    ])
      .then(([audio, malaId, sceneId, customText, rounds]) => {
        if (audio === 'true') setMantraAudioEnabled(true);
        if (malaId && MALA_SKINS[malaId]) setSelectedMalaId(malaId);
        if (sceneId && BG_SCENES.some((item) => item.id === sceneId)) setSelectedSceneId(sceneId as JapaSceneId);
        if (customText) setCustomMantraText(customText);
        const parsedRounds = rounds ? Number(rounds) : 1;
        if ([1, 3, 5, 11, 21].includes(parsedRounds)) setTargetRounds(parsedRounds);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (mantraIndex >= mantraOptions.length) setMantraIndex(0);
  }, [mantraIndex, mantraOptions.length]);

  const loadContext = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const [profileResult, historyResult] = await Promise.all([
      supabase.from('profiles').select('active_symbol_id, tradition').eq('id', user.id).single(),
      supabase
        .from('mala_sessions')
        .select('id, mantra, count, completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(HISTORY_LIMIT),
    ]);

    const profile = profileResult.data as ProfileRow | null;
    setActiveSymbolId(profile?.active_symbol_id ?? null);
    setTradition(profile?.tradition ?? 'hindu');
    setMantraIndex(0);
    setHistory((historyResult.data as MalaSessionRow[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(() => setToast({ visible: false, message: '' }), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!completionVisible || !completionStats) return;
    setCompletionInsight(null);
    setCompletionInsightLoading(true);

    apiFetch('/api/japa/completion-insight', {
      method: 'POST',
      body: JSON.stringify({
        tradition,
        mantraName: completionStats.mantraName,
        rounds: completionStats.rounds,
        totalBeads: completionStats.beads,
        durationMinutes: Math.max(1, Math.round(completionStats.durationSecs / 60)),
        timeOfDay: getSpiritualTimeWindow(),
      }),
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { insight?: string } | null) => {
        if (data?.insight) setCompletionInsight(data.insight);
      })
      .catch(() => {})
      .finally(() => setCompletionInsightLoading(false));
  }, [completionStats, completionVisible, tradition]);

  // ── Mantra background audio ───────────────────────────────────────
  const startMantraAudio = useCallback(async () => {
    if (mantraAudioLoading || mantraAudioActive.current) return;
    setMantraAudioLoading(true);
    try {
      const response = await apiFetch('/api/tts/generate', {
        method: 'POST',
        body: JSON.stringify({ text: mantra.label }),
      });
      if (!response.ok) throw new Error('tts-failed');
      const data = (await response.json()) as { url?: string; audioUrl?: string };
      const audioUrl = data.url ?? data.audioUrl;
      if (!audioUrl) throw new Error('tts-no-url');
      await audioPlayer.loadAndPlay(audioUrl, true); // loop = true
      mantraAudioActive.current = true;
    } catch {
      // Graceful offline fallback — audio unavailable, continue counting silently
    } finally {
      setMantraAudioLoading(false);
    }
  }, [audioPlayer, mantra.label, mantraAudioLoading]);

  const stopMantraAudio = useCallback(async () => {
    mantraAudioActive.current = false;
    await audioPlayer.stop();
  }, [audioPlayer]);

  // Toggle mantra audio preference
  const toggleMantraAudio = useCallback(async () => {
    const next = !mantraAudioEnabled;
    setMantraAudioEnabled(next);
    void AsyncStorage.setItem(MANTRA_AUDIO_KEY, String(next));

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (next && count > 0 && count < 108) {
      await startMantraAudio();
    } else if (!next) {
      await stopMantraAudio();
    }
  }, [count, mantraAudioEnabled, startMantraAudio, stopMantraAudio]);

  // Start/stop audio when mantra changes and audio is enabled
  useEffect(() => {
    if (mantraAudioEnabled && mantraAudioActive.current) {
      mantraAudioActive.current = false;
      void audioPlayer.stop().then(() => { void startMantraAudio(); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mantraIndex]);

  const completeRound = useCallback(async () => {
    setSaving(true);
    const nextRounds = completedRounds + 1;
    const elapsed = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
    const goalComplete = nextRounds >= targetRounds;
    setCompletedRounds(nextRounds);
    setCount(0);

    if (elapsed > 0) {
      setDurationSecs(elapsed);
    }

    setToast({
      visible: true,
      message: goalComplete ? `${targetRounds} mala complete` : `Mala ${nextRounds} of ${targetRounds} complete`,
    });

    // Stop mantra loop on round complete
    await stopMantraAudio();

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    // /api/japa/complete is now a real route (previously missing — this
    // call always 404'd and silently fell through to a direct, native-only
    // mala_sessions insert that bypassed daily_sadhana/karma/streak; see the
    // route's own file header for the full mutation contract it now owns).
    // No fallback insert here anymore: a failure should surface, not
    // silently write a partial, inconsistent record straight to the table.
    try {
      const response = await apiFetch('/api/japa/complete', {
        method: 'POST',
        body: JSON.stringify({
          mantra: mantra.label,
          count: 108,
          rounds: 1,
          tradition,
          practiceType,
          activeSymbolId,
        }),
      });

      if (!response.ok) {
        throw new Error('japa-complete-failed');
      }

      if (goalComplete) {
        const stats = {
          rounds: nextRounds,
          beads: nextRounds * 108,
          durationSecs: elapsed,
          mantraName: mantra.label,
        };
        setCompletionStats(stats);
        setCompletionVisible(true);
        setConfettiVisible(true);
      }
    } catch {
      Alert.alert('Could not save japa session', 'Check your connection and try again.');
    }

    setSaving(false);
    await loadContext();
  }, [activeSymbolId, completedRounds, loadContext, mantra.label, practiceType, sessionStartTime, stopMantraAudio, targetRounds, tradition]);

  const increment = useCallback(async () => {
    if (saving) return;
    
    if (count === 0 && completedRounds === 0 && sessionStartTime === null) {
      setSessionStartTime(Date.now());
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setCount((current) => {
      const next = current >= 108 ? 108 : current + 1;

      // Start audio on first bead if enabled
      if (next === 1 && mantraAudioEnabled && !mantraAudioActive.current) {
        void startMantraAudio();
      }

      return next;
    });
  }, [mantraAudioEnabled, saving, startMantraAudio]);

  useEffect(() => {
    if (count === 108 && !saving) {
      void completeRound();
    }
  }, [completeRound, count, saving]);

  const beadElements = useMemo(() => {
    const activeIndex = count >= 108 ? 107 : count;
    return Array.from({ length: 108 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 108 - Math.PI / 2;
      const x = CENTER + Math.cos(angle) * RADIUS;
      const y = CENTER + Math.sin(angle) * RADIUS;
      const isActive = index === activeIndex;
      const isSumeru = index === 0;

      const r = isSumeru ? 10.5 : 7.5;
      const gradientId = `grad-${isActive ? 'active' : 'inactive'}`;

      return (
        <Circle
          key={`bead-${index}`}
          cx={x}
          cy={y}
          r={r}
          fill={`url(#${gradientId})`}
          stroke={isActive ? COLORS.brandGold : malaSkin.beadBorder}
          strokeWidth={isSumeru ? 1.5 : 0.5}
        />
      );
    });
  }, [count, malaSkin.beadBorder, malaSkin.beadColor]);

  return (
    <Screen style={{ backgroundColor: bg, paddingHorizontal: 0, paddingVertical: 0 }}>
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 18, paddingBottom: 36, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={() => router.back()} hitSlop={16}>
              <Feather name="arrow-left" size={24} color={text} />
            </Pressable>
            <View>
              <Text style={{ ...TYPE.screenTitle, color: text }}>Japa Mala</Text>
              <Text style={{ ...TYPE.caption, color: dim }}>{practiceType.replaceAll('_', ' ')} · {malaSkin.label}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/kosh')}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: border,
              backgroundColor: cardBg,
              minHeight: MIN_TOUCH_TARGET,
              paddingHorizontal: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: text }}>Kosh</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.brandGold} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={{ alignItems: 'center', marginBottom: 2, marginTop: 2, gap: 4 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: theme.brand }}>
                {targetRounds} round{targetRounds > 1 ? 's' : ''} sankalpa
              </Text>
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 34, color: theme.brand, textAlign: 'center' }}>
                {mantra.devanagari}
              </Text>
              <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 13, color: text, marginTop: 4 }}>
                {mantra.label}
              </Text>
              <Text style={{ ...TYPE.caption, color: dim, textAlign: 'center', maxWidth: 300 }}>
                {mantra.meaning}
              </Text>
            </View>
            <Pressable
              onPress={() => { void increment(); }}
              style={{
                borderRadius: 30,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={isDark ? scene.colors : scene.lightColors}
                start={{ x: 0.12, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={{
                  borderRadius: 30,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                  padding: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 358,
                  boxShadow: isDark ? SHADOWS.lg.dark : SHADOWS.lg.light,
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    top: 14,
                    left: 16,
                    right: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Feather name={scene.icon as keyof typeof Feather.glyphMap} size={13} color={COLORS.onMediaWhite} />
                    <Text style={{ ...TYPE.chip, color: COLORS.onMediaWhite }}>{scene.name}</Text>
                  </View>
                  <Text style={{ ...TYPE.chip, color: COLORS.onMediaWhite }}>{completedRounds}/{targetRounds} malas</Text>
                </View>
                <Svg width={SVG_SIZE} height={SVG_SIZE}>
                  <Defs>
                    <RadialGradient id="grad-inactive" cx="30%" cy="30%" r="70%">
                      <Stop offset="0%" stopColor={malaSkin.beadColor} stopOpacity="1" />
                      <Stop offset="100%" stopColor={malaSkin.beadBorder} stopOpacity="1" />
                    </RadialGradient>
                    <RadialGradient id="grad-active" cx="30%" cy="30%" r="70%">
                      <Stop offset="0%" stopColor={COLORS.onMediaWhite} stopOpacity="1" />
                      <Stop offset="30%" stopColor={theme.brand} stopOpacity="1" />
                      <Stop offset="100%" stopColor={COLORS.brandEarthLight} stopOpacity="1" />
                    </RadialGradient>
                  </Defs>
                  <Line
                    x1={CENTER}
                    y1={CENTER}
                    x2={CENTER}
                    y2={CENTER - RADIUS}
                    stroke={malaSkin.threadColor}
                    strokeWidth={2}
                  />
                  {beadElements}
                </Svg>
                <View
                  style={{
                    position: 'absolute',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 80,
                    paddingHorizontal: 22,
                    paddingVertical: 18,
                    backgroundColor: isDark ? COLORS.homeShlokaGlassDark : COLORS.premiumGlassLight,
                    borderWidth: 1,
                    borderColor: isDark ? COLORS.homeShlokaGlassBorderDark : COLORS.premiumBorderLight,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.serifBold, fontSize: 34, color: text }}>
                    {count} / 108
                  </Text>
                  <Text style={{ ...TYPE.caption, color: dim }}>
                    tap the mala
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>

            <View
              style={{
                borderRadius: 24,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: cardBg,
                padding: 16,
                gap: 14,
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.brandGold }}>
                PRACTICE SETUP
              </Text>

              {/* Target Rounds */}
              <View style={{ gap: 10, marginBottom: 4 }}>
                <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: dim }}>TARGET ROUNDS</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[1, 3, 5, 11, 21].map(n => (
                    <Pressable
                      key={n}
                      onPress={() => {
                        setTargetRounds(n);
                        void AsyncStorage.setItem(JAPA_TARGET_ROUNDS_KEY, String(n));
                      }}
                      style={{
                        flex: 1,
                        minHeight: MIN_TOUCH_TARGET,
                        paddingVertical: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: targetRounds === n ? theme.brand : border,
                        backgroundColor: targetRounds === n ? (isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight) : cardBg
                      }}
                    >
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: targetRounds === n ? theme.brand : text }}>{n}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[
                  { label: 'Mala', value: malaSkin.label, icon: 'circle', action: () => setCustomizeOpen(true) },
                  { label: 'Scene', value: scene.name, icon: scene.icon, action: () => setCustomizeOpen(true) },
                ].map((item) => (
                  <Pressable
                    key={item.label}
                    onPress={item.action}
                    style={{
                      flex: 1,
                      minHeight: 64,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: theme.premiumBorder,
                      backgroundColor: isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight,
                      padding: 12,
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name={item.icon as keyof typeof Feather.glyphMap} size={15} color={theme.brand} />
                      <Text style={{ ...TYPE.chip, color: theme.brand }}>{item.label}</Text>
                    </View>
                    <Text style={{ ...TYPE.label, color: text }} numberOfLines={1}>{item.value}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Mantra audio toggle */}
              <Pressable
                onPress={() => { void toggleMantraAudio(); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: mantraAudioEnabled ? COLORS.brandGold : border,
                  backgroundColor: mantraAudioEnabled ? cardBg : 'transparent',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {mantraAudioLoading ? (
                    <ActivityIndicator color={COLORS.brandGold} size="small" />
                  ) : (
                    <Feather
                      name={mantraAudioEnabled ? 'volume-2' : 'volume-x'}
                      size={16}
                      color={mantraAudioEnabled ? COLORS.brandGold : dim}
                    />
                  )}
                  <Text
                    style={{
                      fontFamily: FONTS.sansMedium,
                      fontSize: 13,
                      color: mantraAudioEnabled ? COLORS.brandGold : dim,
                    }}
                  >
                    Background mantra audio
                  </Text>
                </View>
                <View
                  style={{
                    width: 40,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: mantraAudioEnabled ? COLORS.brandGold : border,
                    alignItems: mantraAudioEnabled ? 'flex-end' : 'flex-start',
                    justifyContent: 'center',
                    paddingHorizontal: 2,
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: mantraAudioEnabled ? COLORS.ink : COLORS.creamBg,
                    }}
                  />
                </View>
              </Pressable>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {mantraOptions.map((item, index) => (
                  <Pressable
                    key={item.key}
                    onPress={() => {
                      try { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                      setMantraIndex(index);
                    }}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      minHeight: MIN_TOUCH_TARGET,
                      justifyContent: 'center',
                      borderColor: index === mantraIndex ? theme.brand : border,
                      backgroundColor: index === mantraIndex ? cardBg : 'transparent',
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: FONTS.sansMedium,
                        fontSize: 12,
                        color: index === mantraIndex ? theme.brand : dim,
                      }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setCustomMantraOpen(true)}
                  style={{
                    minHeight: MIN_TOUCH_TARGET,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: theme.premiumBorder,
                    backgroundColor: isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight,
                    paddingHorizontal: 12,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: theme.brand }}>
                    Personal mantra
                  </Text>
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  onPress={() => {
                    setCount(0);
                    setCompletedRounds(0);
                    setDurationSecs(0);
                    setSessionStartTime(null);
                    setCompletionStats(null);
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: border,
                    minHeight: MIN_TOUCH_TARGET,
                    paddingVertical: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: text }}>Reset</Text>
                </Pressable>

                <Pressable
                  onPress={() => setHistoryOpen(true)}
                  style={{
                    flex: 1,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: border,
                    minHeight: MIN_TOUCH_TARGET,
                    paddingVertical: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: text }}>Session history</Text>
                </Pressable>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <Modal transparent visible={historyOpen} animationType="slide" onRequestClose={() => setHistoryOpen(false)}>
        <View style={{ flex: 1, backgroundColor: COLORS.bottomSheetScrim, justifyContent: 'flex-end' }}>
          <View
            style={{
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: border,
              padding: 22,
              gap: 14,
              maxHeight: '68%',
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 52, height: 4, borderRadius: 999, backgroundColor: border }} />
            </View>
            <Text style={{ fontFamily: FONTS.serifBold, fontSize: 24, color: text }}>Recent sessions</Text>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              {history.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 32, gap: 10 }}>
                  <Text style={{ fontSize: 32 }}>📿</Text>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: text }}>
                    No sessions yet
                  </Text>
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: dim, textAlign: 'center' }}>
                    Complete your first mala and your practice history will appear here.
                  </Text>
                </View>
              ) : (
                history.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: border,
                      backgroundColor: cardBg,
                      padding: 14,
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: text }}>
                      {item.mantra ?? 'Mantra'}
                    </Text>
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim }}>
                      {item.count ?? 0} beads · {item.completed_at ? new Date(item.completed_at).toLocaleString('en-GB') : 'Unknown'}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
            <Pressable
              onPress={() => setHistoryOpen(false)}
              style={{
                borderRadius: 18,
                backgroundColor: COLORS.brandGold,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: bg }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={customizeOpen} animationType="slide" onRequestClose={() => setCustomizeOpen(false)}>
        <View style={{ flex: 1, backgroundColor: COLORS.bottomSheetScrim, justifyContent: 'flex-end' }}>
          <View
            style={{
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: border,
              padding: 22,
              gap: 18,
              maxHeight: '78%',
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 52, height: 4, borderRadius: 999, backgroundColor: border }} />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ ...TYPE.screenTitle, color: text }}>Practice atmosphere</Text>
              <Text style={{ ...TYPE.caption, color: dim }}>Choose the mala and setting that help you settle.</Text>
            </View>
            <ScrollView contentContainerStyle={{ gap: 18 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 10 }}>
                <Text style={{ ...TYPE.section, color: theme.brand }}>Mala</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {Object.entries(MALA_SKINS).map(([id, skin]) => {
                    const selected = (selectedMalaId ?? 'default') === id;
                    return (
                      <Pressable
                        key={id}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => {
                          setSelectedMalaId(id);
                          void AsyncStorage.setItem(JAPA_MALA_KEY, id);
                        }}
                        style={{
                          width: '47%',
                          minHeight: 78,
                          borderRadius: 18,
                          borderWidth: 1,
                          borderColor: selected ? theme.brand : border,
                          backgroundColor: selected ? theme.brandSoft : (isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight),
                          padding: 12,
                          gap: 8,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 9,
                              backgroundColor: skin.beadColor,
                              borderWidth: 1,
                              borderColor: skin.beadBorder,
                            }}
                          />
                          <Text style={{ ...TYPE.label, color: text }}>{skin.label}</Text>
                        </View>
                        <Text style={{ ...TYPE.caption, color: dim }}>Tap through each bead with this texture.</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: 10 }}>
                <Text style={{ ...TYPE.section, color: theme.brand }}>Scene</Text>
                <View style={{ gap: 10 }}>
                  {BG_SCENES.map((item) => {
                    const selected = selectedSceneId === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => {
                          setSelectedSceneId(item.id);
                          void AsyncStorage.setItem(JAPA_SCENE_KEY, item.id);
                        }}
                        style={{
                          borderRadius: 18,
                          borderWidth: 1,
                          borderColor: selected ? theme.brand : border,
                          overflow: 'hidden',
                        }}
                      >
                        <LinearGradient
                          colors={isDark ? item.colors : item.lightColors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{ minHeight: 64, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Feather name={item.icon as keyof typeof Feather.glyphMap} size={17} color={COLORS.onMediaWhite} />
                            <Text style={{ ...TYPE.label, color: COLORS.onMediaWhite }}>{item.name}</Text>
                          </View>
                          {selected ? <Feather name="check-circle" size={18} color={COLORS.onMediaWhite} /> : null}
                        </LinearGradient>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
            <Pressable
              onPress={() => setCustomizeOpen(false)}
              style={{
                borderRadius: 18,
                backgroundColor: theme.brand,
                minHeight: MIN_TOUCH_TARGET,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: bg }}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={customMantraOpen} animationType="fade" onRequestClose={() => setCustomMantraOpen(false)}>
        <View style={{ flex: 1, backgroundColor: COLORS.celebrationScrim, justifyContent: 'center', padding: 22 }}>
          <View
            style={{
              borderRadius: 28,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: border,
              padding: 22,
              gap: 16,
            }}
          >
            <View style={{ gap: 4 }}>
              <Text style={{ ...TYPE.screenTitle, color: text }}>Personal mantra</Text>
              <Text style={{ ...TYPE.caption, color: dim }}>Use this for a guru-given mantra or a short name you repeat privately.</Text>
            </View>
            <TextInput
              value={customMantraText}
              onChangeText={setCustomMantraText}
              placeholder="Enter mantra"
              placeholderTextColor={dim}
              autoCapitalize="none"
              style={{
                minHeight: 54,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight,
                paddingHorizontal: 14,
                color: text,
                fontFamily: FONTS.sansMedium,
                fontSize: 15,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setCustomMantraOpen(false)}
                style={{
                  flex: 1,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: border,
                  minHeight: MIN_TOUCH_TARGET,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ ...TYPE.label, color: text }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const trimmed = customMantraText.trim();
                  void AsyncStorage.setItem(JAPA_CUSTOM_MANTRA_KEY, trimmed);
                  if (trimmed.length >= 2) {
                    setMantraIndex(mantraOptions.length - 1);
                  }
                  setCustomMantraOpen(false);
                }}
                style={{
                  flex: 1,
                  borderRadius: 18,
                  backgroundColor: theme.brand,
                  minHeight: MIN_TOUCH_TARGET,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ ...TYPE.label, color: bg }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {toast.visible ? (
        <View
          style={{
            position: 'absolute',
            bottom: 24,
            left: 20,
            right: 20,
            borderRadius: 16,
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: COLORS.brandGold,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: text }}>{toast.message}</Text>
        </View>
      ) : null}

      {completionVisible && completionStats ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: COLORS.celebrationScrim,
          }}
        >
          <ConfettiOverlay show={confettiVisible} onComplete={() => setConfettiVisible(false)} />
          <View
            style={{
              width: '85%',
              borderRadius: 28,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: theme.brand,
              paddingHorizontal: 28,
              paddingVertical: 32,
              alignItems: 'center',
              gap: 16,
              maxWidth: 420,
            }}
          >
            <Text style={{ fontFamily: FONTS.serifBold, fontSize: 58, color: theme.brand }}>
              {getSacredSymbol(tradition)}
            </Text>
            <Text style={{ ...TYPE.title, color: text, textAlign: 'center' }}>
              {getCompletionTitle(tradition)}
            </Text>
            <Text style={{ ...TYPE.caption, color: dim, textAlign: 'center' }}>
              {completionStats.beads.toLocaleString('en-IN')} beads of {completionStats.mantraName}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
              <View style={{ flex: 1, backgroundColor: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight, borderRadius: 16, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: dim, textTransform: 'uppercase' }}>Rounds</Text>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: text, marginTop: 4 }}>{completionStats.rounds}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight, borderRadius: 16, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: dim, textTransform: 'uppercase' }}>Beads</Text>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: text, marginTop: 4 }}>{completionStats.beads}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight, borderRadius: 16, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: dim, textTransform: 'uppercase' }}>Duration</Text>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: text, marginTop: 4 }}>
                  {formatDuration(completionStats.durationSecs)}
                </Text>
              </View>
            </View>

            <View
              style={{
                alignSelf: 'stretch',
                borderRadius: 18,
                borderWidth: 1,
                borderColor: isDark ? COLORS.homeBorderSoftDark : COLORS.homeBorderSoftLight,
                backgroundColor: isDark ? COLORS.homeShlokaGlassDark : COLORS.homeShlokaSurfaceLight,
                padding: 14,
                gap: 8,
              }}
            >
              <Text style={{ ...TYPE.section, color: theme.brand }}>Dharma Mitra</Text>
              {completionInsightLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color={theme.brand} size="small" />
                  <Text style={{ ...TYPE.caption, color: dim }}>Receiving insight...</Text>
                </View>
              ) : (
                <Text style={{ ...TYPE.caption, color: text }}>
                  {completionInsight ??
                    `${completionStats.rounds} mala${completionStats.rounds > 1 ? 's' : ''} completed. Let the vibration of ${completionStats.mantraName} stay in your breath as you return to the day.`}
                </Text>
              )}
            </View>

            <Pressable
              onPress={() => {
                setCompletionVisible(false);
                setConfettiVisible(false);
                setCompletionInsight(null);
                setCompletedRounds(0);
                setCount(0);
                setDurationSecs(0);
                setSessionStartTime(Date.now());
              }}
              style={{
                marginTop: 12,
                width: '100%',
                borderRadius: 16,
                backgroundColor: theme.brand,
                minHeight: MIN_TOUCH_TARGET,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: bg }}>Another mala</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
              <Pressable
                onPress={() => {
                  setCompletionVisible(false);
                  setConfettiVisible(false);
                  setCompletionInsight(null);
                }}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: border,
                  minHeight: MIN_TOUCH_TARGET,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ ...TYPE.label, color: text }}>Done</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void Share.share({
                    message: `I completed ${completionStats.rounds} mala${completionStats.rounds > 1 ? 's' : ''} (${completionStats.beads.toLocaleString('en-IN')} beads) with Shoonaya.`,
                  }).catch(() => {});
                }}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                  backgroundColor: isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight,
                  minHeight: MIN_TOUCH_TARGET,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ ...TYPE.label, color: theme.brand }}>Share</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
