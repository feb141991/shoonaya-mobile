import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  AppState,
  Animated,
  Easing,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { Screen } from '@/components/ui/Screen';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { JapaSyncReviewSheet } from '@/components/japa/JapaSyncReviewSheet';
import { BG_SCENES, type JapaSceneId } from '@/components/japa/JapaSceneSurfaces';
import { captureAppIdentity, useAppIdentity } from '@/lib/appIdentity';
import { readUserScoped, USER_SCOPED_NAMES, writeUserScoped } from '@/lib/userScopedStorage';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { getMalaSkin, MALA_SKINS } from '@/lib/mala-skins';
import { NAV_BAR_CLEARANCE, setBottomNavHidden } from '@/lib/nav-bar';
import { AuthGate } from '@/components/ui/AuthGate';
import { getJapaMantrasForTradition, getJapaPracticeType, type JapaMantra } from '@/lib/traditions';
import { getNityaRankProgress } from '@/lib/nitya-rank';
import { getMalaVolumeMilestone } from '@/lib/mala-milestones';
import { pickDharmaFact } from '@/lib/dharma-facts';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useJapaContext } from '@/hooks/useJapaContext';
import { useJapaSyncQueue } from '@/hooks/useJapaSyncQueue';
import { useJapaCompletionInsight, type JapaCompletionStats } from '@/hooks/useJapaCompletionInsight';
import { JapaStopPracticeSheet } from '@/components/japa/JapaStopPracticeSheet';
import { JapaPracticeScreen } from '@/components/japa/JapaPracticeScreen';
import { JapaSoundSheet } from '@/components/japa/JapaSoundSheet';
import { JapaCustomMantraSheet } from '@/components/japa/JapaCustomMantraSheet';
import {
  JapaCustomizeAmbientSoundSection,
  JapaCustomizeChantingModeSection,
  JapaCustomizeSceneSection,
  JapaCustomizeSheet,
  JapaCustomizeSoundLinkSection,
} from '@/components/japa/JapaCustomizeSheet';
import { JapaChooseMalaScreen, JapaChooseMantraScreen } from '@/components/japa/JapaSetupScreens';
import { useJapaCompletionPersistence } from '@/hooks/useJapaCompletionPersistence';
import { useJapaHandsFree } from '@/hooks/useJapaHandsFree';
import {
  DEFAULT_HANDS_FREE_PACE,
  HANDS_FREE_PACE_OPTIONS,
  JAPA_CEREMONY_AUTO_ADVANCE_KEY,
  JAPA_CHANTING_MODE_KEY,
  JAPA_HANDS_FREE_PACE_KEY,
  JAPA_MANTRA_KEY,
  JAPA_MALA_KEY,
  JAPA_SCENE_KEY,
  JAPA_SOUND_KEY,
  JAPA_TARGET_ROUNDS_KEY,
  type JapaChantingMode,
  readJapaPreferences,
  writeJapaPreference,
} from '@/lib/japaPreferences';
import { describeFailure } from '@/lib/user-facing-error';
import {
  JAPA_SOUND_OPTIONS,
  DEFAULT_JAPA_SOUND_ID,
  getJapaSoundById,
} from '@/lib/japa-audio';
import { getJapaRoundDuration } from '@/lib/japaCompletionSubmission';
import { capitalize } from '@/lib/japaPresentation';
import { BEAD_RADIUS, PENDANT_SWAY, fitPracticeRing } from '@/lib/japaBeadRing';
import { JapaCompletionCeremony } from '@/components/japa/JapaCompletionCeremony';
import { JapaLauncherScreen } from '@/components/japa/JapaLauncherScreen';

type ToastState = {
  visible: boolean;
  message: string;
};

const MAX_TARGET_ROUNDS = 108;

export default function JapaScreen() {
  const identity = useAppIdentity();
  const identityKey = identity.kind === 'authenticated' ? identity.userId : identity.kind;
  return <JapaPracticeRoute key={identityKey} appIdentity={identity} />;
}

function JapaPracticeRoute({ appIdentity }: { appIdentity: ReturnType<typeof useAppIdentity> }) {
  const router = useRouter();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const windowSize = useWindowDimensions();
  const isDark = scheme === 'dark';
  const bg = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const theme = themeColor(isDark);

  // 'launcher' = PWA's "Choose your practice" config screen; 'chooseMala' /
  // 'chooseMantra' = PWA's dedicated ChooseMalaScreen/ChooseMantraScreen
  // (opened from the in-practice setup flow, chained mala→mantra→practice
  // exactly as JapaClient.tsx does); 'practice'
  // = PWA's full-screen bead-ring counting screen. Internal state switch,
  // not a route change — matches JapaClient.tsx's own single-page model.
  const [screen, setScreen] = useState<'launcher' | 'chooseMala' | 'chooseMantra' | 'practice'>('launcher');

  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [mantraIndex, setMantraIndex] = useState(0);
  const [savedMantraKey, setSavedMantraKey] = useState<string | null>(null);
  const restoredMantraRef = useRef(false);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '' });
  const [completionVisible, setCompletionVisible] = useState(false);
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [roundCelebrateVisible, setRoundCelebrateVisible] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customMantraOpen, setCustomMantraOpen] = useState(false);
  const [soundSheetOpen, setSoundSheetOpen] = useState(false);
  const [selectedMalaId, setSelectedMalaId] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<JapaSceneId>('midnight');
  const [selectedSoundId, setSelectedSoundId] = useState<string>(DEFAULT_JAPA_SOUND_ID);
  const [chantingMode, setChantingMode] = useState<JapaChantingMode>('manual');
  const [handsFreePace, setHandsFreePace] = useState(DEFAULT_HANDS_FREE_PACE);
  const [ceremonyAutoAdvance, setCeremonyAutoAdvance] = useState(true);
  const [customMantraText, setCustomMantraText] = useState('');
  const audio = useAudioPlayer();
  const [completionStats, setCompletionStats] = useState<JapaCompletionStats | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [authGateVisible, setAuthGateVisible] = useState(false);
  const lastPersistedDurationRef = useRef(0);
  const reminderSettingsReturnRef = useRef(false);
  // Drives the pending/failed-save banner without coupling queue state to
  // the session and persistence orchestration below.
  const {
    failedItems: syncFailedItems,
    pendingCount: syncPendingCount,
    failedCount: syncFailedCount,
    unavailable: syncQueueUnavailable,
    reset: resetSyncQueue,
    refresh: refreshSyncQueue,
  } = useJapaSyncQueue();
  const {
    loading,
    activeSymbolId,
    tradition,
    streak,
    japaAlreadyDoneToday,
    lifetime,
    isGuest,
    japaReminderEnabled,
    userIdRef,
    updateLifetime,
    applyJapaContext,
    loadContext,
  } = useJapaContext({ appIdentity, resetSyncQueue, refreshSyncQueue });

  // Exit-confirm sheet — PWA's StopPracticeSheet. Triggered only by the X
  // (close) button on the practice screen, matching JapaClient.tsx exactly
  // (the only other two trigger sites in PWA — a bottom "End" pill and the
  // Settings sheet's "Change Mala & Mantra" — aren't built in this phase).
  const [showStopSheet, setShowStopSheet] = useState(false);
  const [stopSaving, setStopSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const savingRef = useRef(false);
  const saveAttemptRef = useRef<{ elapsed: number; endSession: boolean } | null>(null);

  const [targetRounds, setTargetRounds] = useState(1);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // ── Bead-ring motion — matches PWA's "current-pulse" breathing ring and
  // per-tap "flash ripple" (JapaClient.tsx).
  const [bloomIndex, setBloomIndex] = useState<number | null>(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const bloomAnim = useRef(new Animated.Value(0)).current;
  const tapAnim = useRef(new Animated.Value(0)).current;
  const swayAnim = useRef(new Animated.Value(0)).current;
  const roundAnim = useRef(new Animated.Value(0)).current;
  const ceremonyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (screen !== 'practice' || reduceMotion) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim, reduceMotion, screen]);

  const triggerBloom = useCallback((index: number) => {
    setBloomIndex(index);
    bloomAnim.setValue(0);
    Animated.timing(bloomAnim, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
      setBloomIndex(null);
    });
  }, [bloomAnim]);

  const triggerTapMotion = useCallback((beadIndex: number) => {
    if (reduceMotion) return;
    tapAnim.stopAnimation();
    tapAnim.setValue(0);
    Animated.sequence([
      Animated.timing(tapAnim, { toValue: 1, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(tapAnim, { toValue: 0, friction: 5, tension: 150, useNativeDriver: true }),
    ]).start();
    // The pendant is kicked to alternating sides by successive beads and swings
    // back. The start is absolute (not added), so a repeated call cannot double it.
    swayAnim.setValue(beadIndex % 2 === 0 ? 1 : -1);
    Animated.spring(swayAnim, { toValue: 0, ...PENDANT_SWAY.spring, useNativeDriver: true }).start();
  }, [reduceMotion, tapAnim, swayAnim]);

  const triggerRoundCelebration = useCallback(() => {
    setRoundCelebrateVisible(true);
    roundAnim.stopAnimation();
    roundAnim.setValue(0);
    if (reduceMotion) {
      setTimeout(() => setRoundCelebrateVisible(false), 1400);
      return;
    }
    Animated.sequence([
      Animated.timing(roundAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(roundAnim, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => setRoundCelebrateVisible(false));
  }, [reduceMotion, roundAnim]);

  const malaSkin = useMemo(() => getMalaSkin(selectedMalaId ?? activeSymbolId), [activeSymbolId, selectedMalaId]);
  const mantras = useMemo(() => getJapaMantrasForTradition(tradition), [tradition]);
  const customMantra = useMemo<JapaMantra | null>(() => {
    const trimmed = customMantraText.trim();
    if (trimmed.length < 2) return null;
    return {
      key: 'custom',
      label: trimmed.length > 42 ? `${trimmed.slice(0, 39)}...` : trimmed,
      devanagari: trimmed,
      // Nothing to romanize -- this is the person's own typed text, not a
      // sourced mantra. Render code must treat an empty string as "no
      // transliteration row", not show a blank line.
      transliteration: '',
      meaning: 'Your personal mantra for this practice.',
      tradition: 'all',
    };
  }, [customMantraText]);
  const mantraOptions = useMemo(() => customMantra ? [...mantras, customMantra] : mantras, [customMantra, mantras]);
  const mantra = mantraOptions[mantraIndex] ?? mantraOptions[0];
  const practiceType = getJapaPracticeType(tradition);
  const scene = BG_SCENES.find((item) => item.id === selectedSceneId) ?? BG_SCENES[0];
  const practiceTextColor = isDark ? COLORS.onMediaWhite : COLORS.ink;
  const practiceMutedColor = isDark ? `${COLORS.onMediaWhite}a6` : COLORS.textDimLight;
  const traditionLabel = capitalize(tradition);
  const rank = useMemo(() => getNityaRankProgress(tradition, streak), [tradition, streak]);
  const volume = useMemo(() => getMalaVolumeMilestone(lifetime.totalBeads), [lifetime.totalBeads]);
  const fact = useMemo(() => pickDharmaFact(tradition), [tradition]);

  // Load saved local preferences (mala/scene/sound/custom mantra/target rounds/
  // chanting mode/pace/lifetime totals) in a single native bridge call via multiGet.
  useEffect(() => {
    readJapaPreferences()
      .then(({ malaId, sceneId, rounds, mantraKey, soundId, chantingMode: savedMode, handsFreePace: savedPace, ceremonyAutoAdvance: savedAutoAdvance }) => {
        if (malaId && MALA_SKINS[malaId]) setSelectedMalaId(malaId);
        if (sceneId && BG_SCENES.some((item) => item.id === sceneId)) setSelectedSceneId(sceneId as JapaSceneId);
        if (mantraKey) setSavedMantraKey(mantraKey);
        if (soundId && JAPA_SOUND_OPTIONS.some((item) => item.id === soundId)) setSelectedSoundId(soundId);
        if (savedMode) setChantingMode(savedMode);
        if (savedPace) setHandsFreePace(savedPace);
        if (savedAutoAdvance !== undefined) setCeremonyAutoAdvance(savedAutoAdvance);
        const parsedRounds = rounds ? Number(rounds) : 1;
        if (Number.isInteger(parsedRounds) && parsedRounds >= 1 && parsedRounds <= MAX_TARGET_ROUNDS) {
          setTargetRounds(parsedRounds);
        }
      })
      .catch(() => {});
  }, []);

  const activeSound = useMemo(() => getJapaSoundById(selectedSoundId), [selectedSoundId]);

  // Each choice is applied on screen and remembered as a device preference.
  const selectMala = useCallback((id: string) => {
    setSelectedMalaId(id);
    void writeJapaPreference(JAPA_MALA_KEY, id);
  }, []);
  const selectScene = useCallback((id: string) => {
    setSelectedSceneId(id as JapaSceneId);
    void writeJapaPreference(JAPA_SCENE_KEY, id);
  }, []);
  const selectSound = useCallback((id: string) => {
    setSelectedSoundId(id);
    void writeJapaPreference(JAPA_SOUND_KEY, id);
  }, []);
  const selectChantingMode = useCallback((mode: JapaChantingMode) => {
    setChantingMode(mode);
    void writeJapaPreference(JAPA_CHANTING_MODE_KEY, mode);
  }, []);
  const selectHandsFreePace = useCallback((pace: number) => {
    setHandsFreePace(pace);
    void writeJapaPreference(JAPA_HANDS_FREE_PACE_KEY, String(pace));
  }, []);
  const toggleChantingMode = useCallback(() => {
    setChantingMode((prev) => {
      const next: JapaChantingMode = prev === 'hands_free' ? 'manual' : 'hands_free';
      void writeJapaPreference(JAPA_CHANTING_MODE_KEY, next);
      return next;
    });
  }, []);
  const cycleHandsFreePace = useCallback(() => {
    setHandsFreePace((prev) => {
      const idx = HANDS_FREE_PACE_OPTIONS.findIndex((p) => Math.abs(p.seconds - prev) < 0.2);
      const next = HANDS_FREE_PACE_OPTIONS[(idx + 1) % HANDS_FREE_PACE_OPTIONS.length].seconds;
      void writeJapaPreference(JAPA_HANDS_FREE_PACE_KEY, String(next));
      return next;
    });
  }, []);
  const selectTargetRounds = useCallback((rounds: number) => {
    setTargetRounds(rounds);
    void writeJapaPreference(JAPA_TARGET_ROUNDS_KEY, String(rounds));
  }, []);
  const selectMantra = useCallback((index: number, key: string) => {
    setMantraIndex(index);
    void writeJapaPreference(JAPA_MANTRA_KEY, key);
  }, []);
  const openCustomMantraSheet = useCallback(() => setCustomMantraOpen(true), []);
  // The custom mantra is always the last option. Without saved text yet,
  // choosing it opens the entry sheet instead.
  const selectCustomMantra = useCallback(() => {
    if (customMantra) {
      setMantraIndex(mantraOptions.length - 1);
      void writeJapaPreference(JAPA_MANTRA_KEY, 'custom');
    } else {
      setCustomMantraOpen(true);
    }
  }, [customMantra, mantraOptions.length]);

  // Ambient sound lifecycle — plays seamless loop during active practice,
  // pauses when stop sheet opens or session completes, and unloads on exit or screen blur.
  useEffect(() => {
    const soundTarget = activeSound.audioSource ?? activeSound.audioUrl;
    if (
      screen !== 'practice' ||
      showStopSheet ||
      completionVisible ||
      selectedSoundId === 'off' ||
      !soundTarget
    ) {
      void audio.stop();
      return;
    }

    void audio.loadAndPlay(soundTarget, true);

    return () => {
      void audio.stop();
    };
  }, [screen, showStopSheet, completionVisible, selectedSoundId, activeSound.audioSource, activeSound.audioUrl, audio]);

  // Hide global bottom navigation during active bead-counting practice so the
  // sacred ritual is immersive and bottom sound controls are never covered.
  useEffect(() => {
    if (screen === 'practice') {
      setBottomNavHidden(true);
    } else {
      setBottomNavHidden(false);
    }
    return () => {
      setBottomNavHidden(false);
    };
  }, [screen]);

  useEffect(() => {
    if (mantraIndex >= mantraOptions.length) setMantraIndex(0);
  }, [mantraIndex, mantraOptions.length]);

  // The custom mantra is the person's own text, so it is saved per person
  // (userScopedStorage) and reloaded whenever the identity changes.
  useEffect(() => {
    setCustomMantraText('');
    if (appIdentity.kind === 'loading') return;
    const lease = captureAppIdentity();
    void readUserScoped(appIdentity, USER_SCOPED_NAMES.japaCustomMantra).then((text) => {
      if (text && lease.isCurrent()) setCustomMantraText(text);
    });
  }, [appIdentity]);

  // Restore the last-selected mantra once, as soon as both the saved key
  // (from AsyncStorage) and a matching option (mantraOptions depends on
  // tradition, which resolves async from the profile fetch, and on
  // customMantraText, which loads from its own per-person read) are
  // available. Guarded by a ref rather than deps alone so this fires
  // exactly once and never fights a real-time tap after that — without the
  // guard, every mantraOptions recompute (e.g. typing in the custom-mantra
  // sheet) would silently snap the selection back to the saved one.
  useEffect(() => {
    if (restoredMantraRef.current || !savedMantraKey || mantraOptions.length === 0) return;
    const idx = mantraOptions.findIndex((item) => item.key === savedMantraKey);
    if (idx >= 0) {
      setMantraIndex(idx);
      restoredMantraRef.current = true;
    }
  }, [savedMantraKey, mantraOptions]);

  const [syncReviewVisible, setSyncReviewVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const focusedRef = useRef(false);
  const [isForeground, setIsForeground] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setIsForeground(state === 'active'));
    return () => subscription.remove();
  }, []);

  // Refresh the single existing Japa context only after the user explicitly
  // visited notification settings from the contextual card. This avoids an
  // extra query on ordinary Japa tab returns while allowing the card to
  // reflect the saved preference immediately on return.
  useFocusEffect(useCallback(() => {
    focusedRef.current = true;
    setIsFocused(true);
    if (screen === 'practice') {
      setBottomNavHidden(true);
    }
    if (reminderSettingsReturnRef.current) {
      reminderSettingsReturnRef.current = false;
      void loadContext({ background: true });
    }
    return () => {
      focusedRef.current = false;
      setIsFocused(false);
      setBottomNavHidden(false);
      void audio.stop();
    };
  }, [screen, loadContext, audio]));

  useEffect(() => {
    if (syncReviewVisible && syncFailedCount === 0) setSyncReviewVisible(false);
  }, [syncReviewVisible, syncFailedCount]);

  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(() => setToast({ visible: false, message: '' }), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const {
    queueCompletion,
    discardUnqueuedCompletion,
    retryingCompletionId,
    retrySyncedCompletion,
    discardSyncedCompletion,
  } = useJapaCompletionPersistence({
    userIdRef,
    applyJapaContext,
    refreshSyncQueue,
  });

  const { insight: completionInsight, loading: completionInsightLoading } = useJapaCompletionInsight(
    completionVisible,
    completionStats,
    tradition,
  );

  // Opens the completion ceremony for a finished or stopped session.
  const showCompletion = useCallback((stats: JapaCompletionStats) => {
    setCompletionStats(stats);
    setCompletionVisible(true);
    setConfettiVisible(true);
  }, []);

  const resetSession = useCallback(() => {
    countRef.current = 0;
    setCount(0);
    setCompletedRounds(0);
    setSessionStartTime(null);
    lastPersistedDurationRef.current = 0;
    saveAttemptRef.current = null;
    discardUnqueuedCompletion();
    setSaveFailed(false);
    setShowStopSheet(false);
  }, [discardUnqueuedCompletion]);

  const finishPractice = useCallback(async (endSession: boolean) => {
    const lease = captureAppIdentity();
    const finalCount = countRef.current;
    const fullRound = finalCount === 108;
    if (savingRef.current || (!endSession && !fullRound)) return;
    if (isGuest && endSession && !fullRound) {
      setAuthGateVisible(true);
      setShowStopSheet(false);
      return;
    }

    const attempt = saveAttemptRef.current ?? {
      elapsed: sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0,
      endSession,
    };
    saveAttemptRef.current = attempt;
    const nextRounds = completedRounds + Number(fullRound);
    savingRef.current = true;
    setStopSaving(true);
    try {
      if (isGuest && fullRound) {
        await updateLifetime(108);
      } else if (finalCount > 0) {
        await queueCompletion({
          mantra: mantra.label, count: finalCount, rounds: Number(fullRound),
          durationSeconds: getJapaRoundDuration(attempt.elapsed, lastPersistedDurationRef.current),
          tradition, practiceType, activeSymbolId, chantingMode,
        });
      }
    } catch (error) {
      if (lease.isCurrent()) {
        setSaveFailed(true);
        setShowStopSheet(true);
        Alert.alert('Could not save japa', describeFailure(error, 'Your beads are still here. Retry saving to this device.'));
      }
      return;
    } finally {
      savingRef.current = false;
      if (lease.isCurrent()) setStopSaving(false);
    }
    if (!lease.isCurrent()) return;
    saveAttemptRef.current = null;
    lastPersistedDurationRef.current = attempt.elapsed;
    setSaveFailed(false);
    setShowStopSheet(false);
    if (fullRound) {
      countRef.current = 0;
      setCount(0);
      setCompletedRounds(nextRounds);
      triggerRoundCelebration();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setToast({ visible: true, message: nextRounds >= targetRounds
        ? `${targetRounds} mala complete` : `Mala ${nextRounds} of ${targetRounds} complete` });
    }
    if (attempt.endSession || nextRounds >= targetRounds) {
      const beads = nextRounds * 108 + (fullRound ? 0 : finalCount);
      if (beads > 0) showCompletion({
        rounds: nextRounds, beads, durationSecs: attempt.elapsed, mantraName: mantra.label,
      });
      else setScreen('launcher');
      resetSession();
    }
  }, [activeSymbolId, chantingMode, completedRounds, isGuest, mantra.label, practiceType, queueCompletion,
    resetSession, sessionStartTime, showCompletion, targetRounds, tradition, triggerRoundCelebration, updateLifetime]);

  useEffect(() => {
    if (!completionVisible) return;
    ceremonyAnim.setValue(0);
    if (reduceMotion) {
      ceremonyAnim.setValue(1);
      return;
    }
    Animated.spring(ceremonyAnim, {
      toValue: 1,
      friction: 7,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [ceremonyAnim, completionVisible, reduceMotion]);

  const countingActive = isFocused && isForeground && screen === 'practice' && !showStopSheet
    && !customizeOpen && !soundSheetOpen && !customMantraOpen && !authGateVisible
    && !syncReviewVisible && !completionVisible && !roundCelebrateVisible && !stopSaving;
  const timerCancelRef = useRef<(() => void) | null>(null);
  const increment = useCallback(() => {
    if (!countingActive || !focusedRef.current || AppState.currentState !== 'active'
      || savingRef.current || countRef.current >= 108) return;
    timerCancelRef.current?.();
    const current = countRef.current++;
    if (sessionStartTime === null) setSessionStartTime(Date.now());
    setCount(current + 1);
    triggerBloom(current);
    triggerTapMotion(current);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [countingActive, sessionStartTime, triggerBloom, triggerTapMotion]);

  const handsFree = useJapaHandsFree({
    enabled: chantingMode === 'hands_free', active: countingActive,
    paceSeconds: handsFreePace, count, onIncrement: increment,
  });
  timerCancelRef.current = handsFree.cancelTick;

  useEffect(() => {
    if (count === 108 && !saveFailed && countingActive) void finishPractice(false);
  }, [count, countingActive, finishPractice, saveFailed]);

  // ── Launcher → practice / exit-confirm flow — mirrors JapaClient.tsx's
  // handleStartPractice / StopPracticeSheet actions exactly. ─────────────
  const handleStartPractice = useCallback(() => {
    void trackAnalyticsEvent('practice_started');
    if (sessionStartTime === null) setSessionStartTime(Date.now());
    setScreen('practice');
  }, [sessionStartTime]);

  // Setup flow — chains ChooseMala → ChooseMantra → practice, mirroring
  // JapaClient.tsx's own handleConfirmMala/handleConfirmMantra sequence.
  const confirmMalaAndChooseMantra = useCallback(() => setScreen('chooseMantra'), []);
  const backToLauncher = useCallback(() => setScreen('launcher'), []);
  const backToChooseMala = useCallback(() => setScreen('chooseMala'), []);
  const confirmMantraAndBegin = useCallback(() => {
    const isCustomSelected = mantraOptions[mantraIndex]?.key === 'custom';
    if (isCustomSelected && customMantra === null) {
      // No saved personal-mantra text yet — open the entry sheet instead of
      // confirming, matching PWA's "Add Your Mantra →" button state.
      setCustomMantraOpen(true);
      return;
    }
    handleStartPractice();
  }, [customMantra, handleStartPractice, mantraIndex, mantraOptions]);

  const hasProgress = completedRounds > 0 || count > 0;

  const handleConfettiComplete = useCallback(() => setConfettiVisible(false), []);
  const dismissCompletion = useCallback(() => {
    setCompletionVisible(false);
    setConfettiVisible(false);
    resetSession();
    handsFree.setIsPaused(false);
    setScreen('launcher');
  }, [handsFree.setIsPaused, resetSession]);

  const handleAnotherMala = useCallback(() => {
    if (isGuest) {
      setAuthGateVisible(true);
      return;
    }
    setCompletionVisible(false);
    setConfettiVisible(false);
    resetSession();
    handsFree.setIsPaused(false);
    setSessionStartTime(Date.now());
  }, [handsFree.setIsPaused, isGuest, resetSession]);

  const handleAutoAdvance = useCallback(() => {
    if (focusedRef.current && AppState.currentState === 'active') dismissCompletion();
  }, [dismissCompletion]);

  const handleDiscardAndStop = useCallback(() => {
    if (savingRef.current) return;
    resetSession();
    handsFree.setIsPaused(false);
    setScreen('launcher');
  }, [handsFree.setIsPaused, resetSession]);

  // The ring fills the space between the top buttons and the Sound pill.
  const ringLayout = fitPracticeRing({ width: windowSize.width, height: windowSize.height, insetTop: insets.top, insetBottom: insets.bottom, minTouchTarget: MIN_TOUCH_TARGET });
  const pulseRadius = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [BEAD_RADIUS.current + 2, BEAD_RADIUS.current + 10] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.58, 0] });
  const bloomRadius = bloomAnim.interpolate({ inputRange: [0, 1], outputRange: [BEAD_RADIUS.current - 1.5, BEAD_RADIUS.current + 15.5] });
  const bloomOpacity = bloomAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
  const tapScale = tapAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] });
  const swayRotate = swayAnim.interpolate({ inputRange: [-1, 1], outputRange: [`-${PENDANT_SWAY.maxDegrees}deg`, `${PENDANT_SWAY.maxDegrees}deg`] });
  const tapCountScale = tapAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const tapCountTranslate = tapAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  const tapGlowOpacity = tapAnim.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.36] });
  const roundOpacity = roundAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const roundTranslate = roundAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const ceremonyScale = ceremonyAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const ceremonyTranslate = ceremonyAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <Screen fullscreen={screen === 'practice'} style={{ backgroundColor: bg, paddingHorizontal: 0, paddingVertical: 0 }}>
      {screen === 'launcher' ? (
        <JapaLauncherScreen
          isDark={isDark}
          cardBg={cardBg}
          text={text}
          dim={dim}
          theme={theme}
          loading={loading}
          traditionLabel={traditionLabel}
          authenticatedUserId={appIdentity.kind === 'authenticated' ? appIdentity.userId : null}
          japaReminderEnabled={japaReminderEnabled}
          japaAlreadyDoneToday={japaAlreadyDoneToday}
          syncPendingCount={syncPendingCount}
          syncFailedCount={syncFailedCount}
          syncQueueUnavailable={syncQueueUnavailable}
          mantra={mantra}
          malaSkin={malaSkin}
          targetRounds={targetRounds}
          streak={streak}
          selectedSoundId={selectedSoundId}
          activeSound={activeSound}
          rank={rank}
          volume={volume}
          fact={fact}
          reduceMotion={reduceMotion}
          onConfigureReminder={() => { reminderSettingsReturnRef.current = true; }}
          onReviewSync={() => setSyncReviewVisible(true)}
          onSelectTargetRounds={selectTargetRounds}
          onChangeMala={() => setScreen('chooseMala')}
          onOpenSound={() => setSoundSheetOpen(true)}
          onOpenInsights={() => router.push('/japa-insights' as Href)}
          onStart={handleStartPractice}
        />
      ) : screen === 'chooseMala' ? (
        // ── Choose Mala: mala list + practice background; continuing chains
        // to Choose Mantra. ─────────────────────────────────────────────────
        <JapaChooseMalaScreen
          selectedMalaId={selectedMalaId}
          scenes={BG_SCENES}
          selectedSceneId={selectedSceneId}
          isDark={isDark}
          cardBg={cardBg}
          text={text}
          dim={dim}
          theme={theme}
          onBack={backToLauncher}
          onSelectMala={selectMala}
          onSelectScene={selectScene}
          onContinue={confirmMalaAndChooseMantra}
          canAdvance={isFocused && isForeground}
        />
      ) : screen === 'chooseMantra' ? (
        // ── Choose Mantra: personal mantra card + preset list + target
        // rounds; confirming begins practice. ─────────────────────────────
        <JapaChooseMantraScreen
          mantras={mantras}
          mantraIndex={mantraIndex}
          customMantra={customMantra}
          customSelected={mantraOptions[mantraIndex]?.key === 'custom'}
          targetRounds={targetRounds}
          isDark={isDark}
          cardBg={cardBg}
          text={text}
          dim={dim}
          theme={theme}
          onBack={backToChooseMala}
          onSelectCustom={selectCustomMantra}
          onEditCustom={openCustomMantraSheet}
          onSelectMantra={selectMantra}
          onChangeTargetRounds={selectTargetRounds}
          onBegin={confirmMantraAndBegin}
          canAdvance={isFocused && isForeground && !customMantraOpen}
        />
      ) : (
        <JapaPracticeScreen
          isDark={isDark}
          theme={theme}
          scene={scene}
          reduceMotion={reduceMotion}
          insets={insets}
          ringLayout={ringLayout}
          count={count}
          completedRounds={completedRounds}
          targetRounds={targetRounds}
          practiceTextColor={practiceTextColor}
          practiceMutedColor={practiceMutedColor}
          malaSkin={malaSkin}
          bloomIndex={bloomIndex}
          pulseRadius={pulseRadius}
          pulseOpacity={pulseOpacity}
          bloomRadius={bloomRadius}
          bloomOpacity={bloomOpacity}
          tapScale={tapScale}
          tapCountScale={tapCountScale}
          tapCountTranslate={tapCountTranslate}
          tapGlowOpacity={tapGlowOpacity}
          swayRotate={swayRotate}
          roundCelebrateVisible={roundCelebrateVisible}
          roundOpacity={roundOpacity}
          roundTranslate={roundTranslate}
          activeSound={activeSound}
          selectedSoundId={selectedSoundId}
          chantingMode={chantingMode}
          isPaused={handsFree.isPaused}
          handsFreePace={handsFreePace}
          onIncrement={increment}
          onStopSession={() => { if (!savingRef.current) setShowStopSheet(true); }}
          onOpenSettings={() => setCustomizeOpen(true)}
          onOpenSound={() => setSoundSheetOpen(true)}
          onToggleChantingMode={toggleChantingMode}
          onTogglePause={handsFree.togglePause}
          onCyclePace={cycleHandsFreePace}
        />
      )}

      <JapaStopPracticeSheet
        visible={showStopSheet}
        hasProgress={hasProgress}
        saving={stopSaving}
        saveFailed={saveFailed}
        isDark={isDark}
        cardBg={cardBg}
        border={border}
        text={text}
        dim={dim}
        theme={theme}
        onClose={() => { if (!savingRef.current && !saveFailed) setShowStopSheet(false); }}
        onSave={() => { void finishPractice(true); }}
        onDiscard={handleDiscardAndStop}
      />

      <JapaCustomizeSheet
        visible={customizeOpen}
        cardBg={cardBg}
        border={border}
        text={text}
        dim={dim}
        bg={bg}
        theme={theme}
        onClose={() => setCustomizeOpen(false)}
      >
        <JapaCustomizeSceneSection
          options={BG_SCENES}
          selectedId={selectedSceneId}
          isDark={isDark}
          cardBg={cardBg}
          text={text}
          dim={dim}
          theme={theme}
          onSelect={selectScene}
        />
        <JapaCustomizeChantingModeSection
          chantingMode={chantingMode}
          paceSeconds={handsFreePace}
          isDark={isDark}
          cardBg={cardBg}
          text={text}
          dim={dim}
          theme={theme}
          onSelectMode={selectChantingMode}
          onSelectPace={selectHandsFreePace}
          ceremonyAutoAdvance={ceremonyAutoAdvance}
          onChangeCeremonyAutoAdvance={(enabled) => {
            setCeremonyAutoAdvance(enabled);
            void writeJapaPreference(JAPA_CEREMONY_AUTO_ADVANCE_KEY, String(enabled)).catch(() => {});
          }}
        />
        <JapaCustomizeAmbientSoundSection
          options={JAPA_SOUND_OPTIONS}
          selectedId={selectedSoundId}
          isDark={isDark}
          cardBg={cardBg}
          text={text}
          dim={dim}
          theme={theme}
          onSelect={selectSound}
        />
        <JapaCustomizeSoundLinkSection
          soundOn={selectedSoundId !== 'off'}
          activeSound={activeSound}
          cardBg={cardBg}
          text={text}
          dim={dim}
          theme={theme}
          onPress={() => {
            setCustomizeOpen(false);
            setSoundSheetOpen(true);
          }}
        />
      </JapaCustomizeSheet>

      <JapaSoundSheet
        visible={soundSheetOpen}
        selectedId={selectedSoundId}
        options={JAPA_SOUND_OPTIONS}
        isDark={isDark}
        cardBg={cardBg}
        border={border}
        text={text}
        dim={dim}
        bg={bg}
        theme={theme}
        onClose={() => setSoundSheetOpen(false)}
        onSelect={selectSound}
      />

      <JapaCustomMantraSheet
        visible={customMantraOpen}
        value={customMantraText}
        isDark={isDark}
        cardBg={cardBg}
        border={border}
        text={text}
        dim={dim}
        bg={bg}
        theme={theme}
        onChange={setCustomMantraText}
        onClose={() => setCustomMantraOpen(false)}
        onSave={() => {
          const trimmed = customMantraText.trim();
          void writeUserScoped(appIdentity, USER_SCOPED_NAMES.japaCustomMantra, trimmed);
          if (trimmed.length >= 2) {
            setMantraIndex(mantraOptions.length - 1);
            void writeJapaPreference(JAPA_MANTRA_KEY, 'custom');
          }
          setCustomMantraOpen(false);
        }}
      />

      <JapaSyncReviewSheet
        visible={syncReviewVisible}
        onClose={() => setSyncReviewVisible(false)}
        failedItems={syncFailedItems}
        retryingCompletionId={retryingCompletionId}
        onRetry={(item) => { void retrySyncedCompletion(item); }}
        onDiscard={discardSyncedCompletion}
        cardBg={cardBg}
        border={border}
        text={text}
        dim={dim}
        isDark={isDark}
        theme={theme}
      />

      {toast.visible ? (
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + NAV_BAR_CLEARANCE,
            left: 20,
            right: 20,
            borderRadius: 16,
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: theme.brand,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: text }}>{toast.message}</Text>
        </View>
      ) : null}

      <JapaCompletionCeremony
        completionStats={completionStats}
        completionVisible={completionVisible}
        completionInsight={completionInsight}
        completionInsightLoading={completionInsightLoading}
        confettiVisible={confettiVisible}
        tradition={tradition}
        malaSkin={malaSkin}
        isDark={isDark}
        cardBg={cardBg}
        border={border}
        text={text}
        dim={dim}
        bg={bg}
        theme={theme}
        ceremonyScale={ceremonyScale}
        ceremonyTranslate={ceremonyTranslate}
        autoAdvance={ceremonyAutoAdvance && chantingMode === 'hands_free' && isFocused && isForeground && !authGateVisible}
        onAutoAdvance={handleAutoAdvance}
        onConfettiComplete={handleConfettiComplete}
        onAnotherMala={handleAnotherMala}
        onDone={dismissCompletion}
      />

      <AuthGate
        visible={authGateVisible}
        onClose={() => setAuthGateVisible(false)}
        title="Save your Sadhana"
        message="Sign in to save your sadhana rounds and streaks."
      />
    </Screen>
  );
}
