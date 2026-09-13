import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/BackButton';
import { ConfettiOverlay } from '@/components/ui/ConfettiOverlay';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { SacredLoader } from '@/components/ui/SacredLoader';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS } from '@/lib/constants';
import type { PathshalaPath } from '@/lib/pathshala-types';
import { supabase } from '@/lib/supabase';
import { isGuestMode } from '@/lib/guestSession';
import { AuthGate } from '@/components/ui/AuthGate';
import { PathshalaCompletionModal } from '@/components/pathshala/PathshalaCompletionModal';
import { useLocalizedMeaning } from '@/hooks/useLocalizedMeaning';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

type ReaderFontSize = 'small' | 'normal' | 'large' | 'xl';
type AudioSpeed = 0.75 | 1.0 | 1.25;
type AudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

type ProfileRow = {
  app_language: string | null;
  meaning_language: string | null;
};

type EnrollmentPayload = {
  pathId: string;
  currentLesson: number;
  completedLessons: number[];
  status: string | null;
};

type LessonEntry = {
  id: string;
  source: string;
  original: string;
  transliteration?: string;
  meaning?: string;
};

type Lesson = {
  title: string;
  entries: LessonEntry[];
};

type PathDetailResponse = {
  path: PathshalaPath;
  lessons: Lesson[];
  locked: boolean;
};

type FetchState = 'loading' | 'ready' | 'not_found' | 'locked' | 'error';

// Structured explanation shape returned by POST /api/pathshala/explain —
// mirrors the PWA's contract exactly (src/app/api/pathshala/explain/route.ts).
type ExplainResult = {
  word_by_word: string;
  meaning: string;
  commentary: string;
  daily_application: string;
  contemplation: string;
  related_text: string;
};

type ExplainStatus = 'idle' | 'loading' | 'ready' | 'upgrade_required' | 'error';

const FONT_SIZE_KEY = 'shoonaya.pathshala.fontSize';

const FONT_SCALE: Record<ReaderFontSize, { original: number; meaning: number }> = {
  small: { original: 24, meaning: 15 },
  normal: { original: 28, meaning: 17 },
  large: { original: 32, meaning: 19 },
  xl: { original: 36, meaning: 21 },
};

const SPEED_OPTIONS: AudioSpeed[] = [0.75, 1.0, 1.25];

export default function LessonReaderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;
  const params = useLocalSearchParams<{ pathId?: string | string[]; lessonId?: string | string[] }>();
  const pathId = Array.isArray(params.pathId) ? params.pathId[0] : params.pathId;
  const returnToPathshala = useCallback(() => {
    if (router.canGoBack()) router.back();
    else if (pathId) router.replace({ pathname: '/pathshala/[pathId]', params: { pathId } });
    else router.replace('/(tabs)/pathshala');
  }, [router, pathId]);
  const lessonId = Array.isArray(params.lessonId) ? params.lessonId[0] : params.lessonId;
  const lessonIndex = Number(lessonId ?? '0');

  const [fetchState, setFetchState] = useState<FetchState>('loading');
  const [path, setPath] = useState<PathshalaPath | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [verseIndex, setVerseIndex] = useState(0);
  const lesson = lessons[lessonIndex];
  const totalVerses = lesson?.entries.length ?? 0;
  const entry = lesson?.entries[verseIndex] ?? lesson?.entries[0];

  const [fontSize, setFontSize] = useState<ReaderFontSize>('normal');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [saving, setSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [authGateVisible, setAuthGateVisible] = useState(false);
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [completionReward, setCompletionReward] = useState<{
    karmaEarned: number;
    dailySadhanaUpdated: boolean;
  }>({ karmaEarned: 8, dailySadhanaUpdated: true });

  // ── AI verse explanation (real /api/pathshala/explain wiring) ──────────
  const [explainStatus, setExplainStatus] = useState<ExplainStatus>('idle');
  const [explainVisible, setExplainVisible] = useState(false);
  const [explainExpanded, setExplainExpanded] = useState(false);
  const [explainResult, setExplainResult] = useState<ExplainResult | null>(null);
  const [explainMeta, setExplainMeta] = useState<{ tradition?: string; teacher?: string } | null>(null);

  // ── Audio state ───────────────────────────────────────────────────
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [audioSpeed, setAudioSpeed] = useState<AudioSpeed>(1.0);
  const audioPlayer = useAudioPlayer();
  const audioPlayerRef = useRef(audioPlayer);
  audioPlayerRef.current = audioPlayer;
  const currentAudioUrl = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Reset verse index and audio ONLY when lesson index actually changes
  useEffect(() => {
    setVerseIndex(0);
    setAudioState('idle');
    setExplainExpanded(false);
    currentAudioUrl.current = null;
    void audioPlayerRef.current.stop();
  }, [lessonIndex]);

  // Reset audio and scroll to top when verse changes within lesson
  useEffect(() => {
    setAudioState('idle');
    setExplainExpanded(false);
    currentAudioUrl.current = null;
    void audioPlayerRef.current.stop();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [verseIndex]);

  const localizedMeaning = useLocalizedMeaning({
    entryId: entry?.id ?? null,
    sourceMeaning: entry?.meaning ?? null,
    targetLanguage: language,
    enabled: language !== 'en',
  });

  useEffect(() => {
    AsyncStorage.getItem(FONT_SIZE_KEY)
      .then((value) => {
        if (value === 'small' || value === 'normal' || value === 'large' || value === 'xl') {
          setFontSize(value);
        }
      })
      .catch(() => {});
  }, []);

  // ── Fetch path + lessons from the contract-backed endpoint ─────────────────
  useEffect(() => {
    const loadPath = async () => {
      if (!pathId) {
        setFetchState('not_found');
        return;
      }

      setFetchState('loading');

      try {
        const response = await apiFetch(`/api/pathshala/paths/${pathId}`);

        if (response.status === 404) {
          setFetchState('not_found');
          return;
        }

        if (!response.ok) {
          setFetchState('error');
          return;
        }

        const data = (await response.json()) as PathDetailResponse;
        setPath(data.path);
        setLessons(data.lessons);
        setFetchState(data.locked ? 'locked' : 'ready');
      } catch {
        setFetchState('error');
      }
    };

    void loadPath();
  }, [pathId]);

  useEffect(() => {
    const loadContext = async () => {
      if (!pathId) {
        setLoadingState(false);
        return;
      }

      const guest = await isGuestMode();
      setIsGuest(guest);

      if (guest) {
        setUserId('guest');
        setCompletedLessons([]);
        setLanguage('en');
        setLoadingState(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoadingState(false);
        router.replace('/(auth)/login');
        return;
      }

      setUserId(user.id);

      // Language preference stays a direct Supabase read — out of scope for
      // this slice (Slice 4D only migrates guided_path_progress usage).
      const [profileResult, enrollmentResponse] = await Promise.all([
        supabase.from('profiles').select('app_language, meaning_language').eq('id', user.id).maybeSingle(),
        apiFetch(`/api/pathshala/progress?pathId=${encodeURIComponent(pathId)}`).catch(() => null),
      ]);

      if (profileResult.data) {
        const profile = profileResult.data as ProfileRow;
        if (profile.meaning_language === 'hi' || (profile.meaning_language !== 'en' && profile.app_language === 'hi')) {
          setLanguage('hi');
        }
      }

      if (enrollmentResponse && enrollmentResponse.ok) {
        const body = (await enrollmentResponse.json()) as { enrollment: EnrollmentPayload | null };
        if (body.enrollment) {
          setCompletedLessons(body.enrollment.completedLessons ?? []);
        }
      }

      setLoadingState(false);
    };

    void loadContext();
  }, [pathId, router]);

  // Stop audio when navigating away
  useEffect(() => {
    return () => {
      void audioPlayer.stop();
    };
  }, [audioPlayer]);

  const saveFontSize = useCallback((value: ReaderFontSize) => {
    setFontSize(value);
    void AsyncStorage.setItem(FONT_SIZE_KEY, value);
  }, []);

  // Calls the real, structured, RAG-backed explain endpoint the PWA reader
  // uses — replaces the previous behaviour of deep-linking to the generic
  // /ai-chat screen with a canned prompt string.
  const runExplain = useCallback(async (openModal = false) => {
    if (!entry || !path) return;
    if (isGuest) {
      setAuthGateVisible(true);
      return;
    }

    if (openModal) {
      setExplainVisible(true);
    }
    setExplainExpanded(true);
    setExplainStatus('loading');
    setExplainResult(null);
    setExplainMeta(null);

    try {
      const response = await apiFetch('/api/pathshala/explain', {
        method: 'POST',
        body: JSON.stringify({
          originalText: entry.original,
          transliteration: entry.transliteration,
          translation: localizedMeaning.meaning || entry.meaning,
          source: entry.source,
          title: path.title,
          tradition: path.tradition,
          language,
        }),
      });

      if (response.status === 403) {
        // Zenith/Pro gate — matches the PWA's upgrade_required contract.
        setExplainStatus('upgrade_required');
        return;
      }

      if (!response.ok) {
        setExplainStatus('error');
        return;
      }

      const body = (await response.json()) as {
        explanation?: ExplainResult;
        tradition?: string;
        teacher?: string;
      };

      if (!body.explanation) {
        setExplainStatus('error');
        return;
      }

      setExplainResult(body.explanation);
      setExplainMeta({ tradition: body.tradition, teacher: body.teacher });
      setExplainStatus('ready');
    } catch {
      setExplainStatus('error');
    }
  }, [entry, path, isGuest, localizedMeaning.meaning, language]);

  const goToLesson = useCallback(
    (nextLessonIndex: number) => {
      if (!pathId || nextLessonIndex < 0 || nextLessonIndex >= lessons.length) {
        return;
      }

      router.replace({
        pathname: '/pathshala/[pathId]/[lessonId]',
        params: { pathId, lessonId: String(nextLessonIndex) },
      });
    },
    [lessons.length, pathId, router]
  );

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-20, 20])
        .failOffsetY([-40, 40])
        .onEnd((event) => {
          if (event.translationX < -40) {
            setVerseIndex((v) => (v < totalVerses - 1 ? v + 1 : v));
          } else if (event.translationX > 40) {
            setVerseIndex((v) => (v > 0 ? v - 1 : v));
          }
        }),
    [totalVerses]
  );

  // ── TTS: fetch and play ───────────────────────────────────────────
  const handlePlayPause = useCallback(async () => {
    if (!entry?.original) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (audioState === 'playing') {
      await audioPlayer.pause();
      setAudioState('paused');
      return;
    }

    if (audioState === 'paused' && currentAudioUrl.current) {
      await audioPlayer.resume();
      setAudioState('playing');
      return;
    }

    // Fresh load
    setAudioState('loading');
    try {
      // Real route is POST /api/tts (there is no /api/tts/generate), and it
      // returns base64 audio bytes in `audioContent`, not a URL — wrap it in
      // a data URI for the audio player instead of looking for url/audioUrl.
      const response = await apiFetch('/api/tts', {
        method: 'POST',
        body: JSON.stringify({ text: entry.original }),
      });

      if (!response.ok) {
        throw new Error('tts-failed');
      }

      const data = (await response.json()) as { audioContent?: string };

      if (!data.audioContent) {
        throw new Error('tts-no-audio');
      }

      const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;

      currentAudioUrl.current = audioUrl;
      await audioPlayer.loadAndPlay(audioUrl, false);
      await audioPlayer.setRate(audioSpeed);
      setAudioState('playing');
    } catch {
      setAudioState('error');
      Alert.alert('Audio unavailable', 'Could not load recitation. Check your connection.');
    }
  }, [audioPlayer, audioSpeed, audioState, entry]);

  const handleSpeedChange = useCallback(
    async (speed: AudioSpeed) => {
      setAudioSpeed(speed);
      if (audioState === 'playing') {
        await audioPlayer.setRate(speed);
      }
    },
    [audioPlayer, audioState]
  );

  const handleContinueNextLesson = useCallback(() => {
    setCompletionModalVisible(false);
    setShowConfetti(false);
    const nextIndex = lessonIndex + 1;
    if (pathId && nextIndex < lessons.length) {
      router.replace({
        pathname: '/pathshala/[pathId]/[lessonId]',
        params: { pathId, lessonId: String(nextIndex) },
      });
    } else {
      returnToPathshala();
    }
  }, [lessonIndex, lessons.length, pathId, returnToPathshala, router]);

  const handleDone = useCallback(async () => {
    if (isGuest) {
      setAuthGateVisible(true);
      return;
    }
    if (!pathId || !userId || saving) {
      return;
    }

    if (completedLessons.includes(lessonIndex)) {
      setCompletionModalVisible(true);
      return;
    }

    setSaving(true);
    const nextCompleted = [...completedLessons, lessonIndex].sort((a, b) => a - b);
    const nextLessonIndex = Math.min(lessonIndex + 1, lessons.length - 1);
    setCompletedLessons(nextCompleted);

    const payload = {
      pathId,
      lessonIndex,
      currentLesson: nextLessonIndex,
      completedLessons: nextCompleted,
      completed: nextCompleted.length >= lessons.length,
    };

    let earned = 8;
    let sadhanaUpdated = true;

    try {
      const response = await apiFetch('/api/pathshala/progress', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(errorBody?.error ?? 'Could not save progress');
      }

      const data = (await response.json().catch(() => ({}))) as {
        karmaEarned?: number;
        dailySadhanaUpdated?: boolean;
      };
      if (typeof data.karmaEarned === 'number') earned = data.karmaEarned;
      if (typeof data.dailySadhanaUpdated === 'boolean') sadhanaUpdated = data.dailySadhanaUpdated;
    } catch (error) {
      setCompletedLessons(completedLessons);
      Alert.alert(error instanceof Error ? error.message : 'Could not save progress');
      setSaving(false);
      return;
    }

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    setSaving(false);
    setCompletionReward({ karmaEarned: earned, dailySadhanaUpdated: sadhanaUpdated });
    setShowConfetti(true);
    setCompletionModalVisible(true);
  }, [completedLessons, isGuest, lessonIndex, lessons.length, pathId, saving, userId]);

  if (fetchState === 'loading' || loadingState) {
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        <SacredLoader
          icon="pathshala"
          title="Opening Sacred Lesson"
          subtitle="Illuminating verse wisdom and deep contemplation..."
          showBack={true}
        />
      </View>
    );
  }

  if (fetchState === 'locked') {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Feather name="lock" size={40} color={brand} />
        <Text style={{ fontFamily: FONTS.serifBold, fontSize: 18, color: text, marginTop: 16, textAlign: 'center' }}>
          Pro required
        </Text>
        <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: dim, marginTop: 8, textAlign: 'center' }}>
          Upgrade to Shoonaya Pro to unlock this path.
        </Text>
        <PressableSurface
          onPress={returnToPathshala}
          style={{
            marginTop: 20,
            borderRadius: 18,
            backgroundColor: brand,
            paddingHorizontal: 24,
            paddingVertical: 14,
          }}
        >
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: COLORS.ink }}>Go back</Text>
        </PressableSurface>
      </View>
    );
  }

  if (fetchState === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Feather name="alert-circle" size={40} color={brand} />
        <Text style={{ fontFamily: FONTS.serifBold, fontSize: 18, color: text, marginTop: 16, textAlign: 'center' }}>
          Could not load this lesson.
        </Text>
        <PressableSurface
          onPress={returnToPathshala}
          style={{
            marginTop: 20,
            borderRadius: 18,
            backgroundColor: brand,
            paddingHorizontal: 24,
            paddingVertical: 14,
          }}
        >
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: COLORS.ink }}>Go back</Text>
        </PressableSurface>
      </View>
    );
  }

  if (!pathId || !lesson || !entry || !path || fetchState === 'not_found') {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Feather name="book-open" size={40} color={brand} />
        <Text style={{ fontFamily: FONTS.serifBold, fontSize: 18, color: text, marginTop: 16, textAlign: 'center' }}>
          Lesson not found.
        </Text>
        <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: dim, marginTop: 8, textAlign: 'center' }}>
          Return to Pathshala and choose a lesson.
        </Text>
        <PressableSurface
          onPress={returnToPathshala}
          style={{
            marginTop: 20,
            borderRadius: 18,
            backgroundColor: brand,
            paddingHorizontal: 24,
            paddingVertical: 14,
          }}
        >
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: COLORS.ink }}>Go back</Text>
        </PressableSurface>
      </View>
    );
  }

  const originalFontFamily =
    path.tradition === 'sikh' ? undefined : FONTS.serif;

  const traditionGlyph =
    path.tradition === 'sikh'
      ? 'ੴ'
      : path.tradition === 'jain'
      ? '卐'
      : path.tradition === 'buddhist'
      ? '☸'
      : 'ॐ';

  const audioIcon =
    audioState === 'loading'
      ? null
      : audioState === 'playing'
      ? 'pause'
      : 'play';

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <GestureDetector gesture={swipeGesture}>
        <View style={{ flex: 1 }}>
          <ConfettiOverlay show={showConfetti} onComplete={() => setShowConfetti(false)} density="soft" />
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{
              paddingTop: 64,
              paddingHorizontal: 20,
              paddingBottom: Math.max(insets.bottom, 16) + 90,
              gap: 18,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <BackButton
                showLabel={false}
                iconSize={22}
                iconColor={text}
                // A lesson's actual parent is its own path's detail screen,
                // not the Pathshala hub -- the generic BackButton fallback
                // (components/ui/BackButton.tsx's inferParentFallback) only
                // prefix-matches "/pathshala" and has no way to know this
                // specific lesson's pathId, so a direct-entry open with no
                // navigation history (deep link, notification) would
                // otherwise fall back to the hub instead of the path the
                // lesson actually belongs to.
                fallbackHref={{ pathname: '/pathshala/[pathId]', params: { pathId } }}
              />
              <Text style={{ flex: 1, textAlign: 'center', fontFamily: FONTS.sansSemiBold, fontSize: 14, color: dim }}>
                Lesson {lessonIndex + 1} of {lessons.length}
              </Text>
              <View style={{ width: 22 }} />
            </View>

            {/* ── Sacred Header & Source Pill Badge ── */}
            <View style={{ gap: 10, alignItems: 'center' }}>
              {entry.source ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: isDark ? 'rgba(197,160,89,0.12)' : '#FFF4E0',
                    borderWidth: 1,
                    borderColor: border,
                  }}
                >
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: brand }} />
                  <Text
                    style={{
                      fontFamily: FONTS.sansSemiBold,
                      fontSize: 11,
                      letterSpacing: 1.5,
                      color: brand,
                      textTransform: 'uppercase',
                    }}
                  >
                    {entry.source}
                  </Text>
                </View>
              ) : null}

              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 30, color: text, textAlign: 'center' }}>
                {lesson.title}
              </Text>

              {totalVerses > 1 ? (
                <View style={{ alignItems: 'center', gap: 10, marginVertical: 4 }}>
                  {/* Progress Capsules — standard Pressable with hitSlop so they render as sleek 7px pills */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {lesson.entries.map((_, i) => {
                      const isActive = i === verseIndex;
                      const isRead = i < verseIndex;
                      return (
                        <Pressable
                          key={i}
                          onPress={() => setVerseIndex(i)}
                          hitSlop={{ top: 16, bottom: 16, left: 6, right: 6 }}
                          accessibilityRole="button"
                          accessibilityLabel={`Go to verse ${i + 1}`}
                          style={{
                            height: 7,
                            width: isActive ? 28 : 8,
                            borderRadius: 4,
                            backgroundColor: isActive ? brand : isRead ? 'rgba(197,160,89,0.45)' : border,
                          }}
                        />
                      );
                    })}
                    <Text style={{ marginLeft: 6, fontFamily: FONTS.sansSemiBold, fontSize: 11, color: dim }}>
                      {verseIndex + 1}/{totalVerses}
                    </Text>
                  </View>

                  {/* Quick Verse Pills — instant one-tap verse jump */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ flexGrow: 0, height: 34 }}
                    contentContainerStyle={{ gap: 6, paddingHorizontal: 4, alignItems: 'center' }}
                  >
                    {lesson.entries.map((_, i) => {
                      const isActive = i === verseIndex;
                      return (
                        <Pressable
                          key={i}
                          onPress={() => setVerseIndex(i)}
                          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                          accessibilityRole="button"
                          accessibilityLabel={`Verse ${i + 1}`}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 5,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: isActive ? brand : border,
                            backgroundColor: isActive ? (isDark ? 'rgba(197,160,89,0.2)' : '#F2D9A8') : cardBg,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: FONTS.sansSemiBold,
                              fontSize: 11,
                              color: isActive ? (isDark ? brand : COLORS.ink) : dim,
                            }}
                          >
                            Verse {i + 1}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
            </View>

            {/* ── Subheader Controls Ribbon ── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['en', 'hi'] as const).map((option) => (
                  <PressableSurface
                    key={option}
                    onPress={() => setLanguage(option)}
                    haptic="selection"
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderWidth: 1,
                      borderColor: option === language ? brand : border,
                      backgroundColor: option === language ? (isDark ? 'rgba(197,160,89,0.18)' : '#F2D9A8') : cardBg,
                    }}
                  >
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: option === language ? (isDark ? brand : COLORS.ink) : dim }}>
                      {option.toUpperCase()}
                    </Text>
                  </PressableSurface>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 6 }}>
                {(['small', 'normal', 'large', 'xl'] as const).map((option) => (
                  <PressableSurface
                    key={option}
                    onPress={() => saveFontSize(option)}
                    haptic="selection"
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      borderWidth: 1,
                      borderColor: option === fontSize ? brand : border,
                      backgroundColor: option === fontSize ? (isDark ? 'rgba(197,160,89,0.18)' : '#F2D9A8') : cardBg,
                    }}
                  >
                    <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 11, color: option === fontSize ? (isDark ? brand : COLORS.ink) : dim }}>
                      {option === 'small' ? 'A-' : option === 'normal' ? 'A' : option === 'large' ? 'A+' : 'A++'}
                    </Text>
                  </PressableSurface>
                ))}
              </View>
            </View>

            {/* ── Sacred Tradition Glyph ── */}
            <Text style={{ fontFamily: FONTS.serif, fontSize: 34, color: brand, textAlign: 'center', marginVertical: 4 }}>
              {traditionGlyph}
            </Text>

            {/* ── 1. Sanskrit / Devanagari Centerpiece Card ── */}
            <View
              style={{
                borderRadius: 24,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: cardBg,
                padding: 24,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.25 : 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SCALE[fontSize].original,
                  lineHeight: FONT_SCALE[fontSize].original * 1.5,
                  color: isDark ? '#F0EDE6' : '#2C1A0E',
                  textAlign: 'center',
                  fontFamily: originalFontFamily,
                }}
              >
                {entry.original}
              </Text>
            </View>

            {/* ── 2. Transliteration Card (Amber Tinted) ── */}
            {entry.transliteration ? (
              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(197,160,89,0.2)' : '#DEC89A',
                  backgroundColor: isDark ? 'rgba(197,160,89,0.08)' : '#FFF4E0',
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    fontFamily: FONTS.sansSemiBold,
                    fontSize: 10,
                    letterSpacing: 2,
                    color: brand,
                    textTransform: 'uppercase',
                  }}
                >
                  Transliteration
                </Text>
                <Text
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 15,
                    lineHeight: 24,
                    color: isDark ? 'rgba(240,220,180,0.85)' : '#7A5C3A',
                    fontStyle: 'italic',
                    textAlign: 'center',
                  }}
                >
                  {entry.transliteration}
                </Text>
              </View>
            ) : null}

            {/* ── 3. Audio Recitation Panel ── */}
            <View
              style={{
                borderRadius: 22,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: cardBg,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <PressableSurface
                onPress={() => { void handlePlayPause(); }}
                haptic="selection"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: brand,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {audioState === 'loading' ? (
                  <ActivityIndicator color={COLORS.ink} size="small" />
                ) : (
                  <Feather name={audioIcon ?? 'play'} size={20} color={COLORS.ink} />
                )}
              </PressableSurface>

              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: brand }}>
                  {audioState === 'loading'
                    ? 'Preparing recitation…'
                    : audioState === 'playing'
                    ? 'Playing recitation'
                    : audioState === 'paused'
                    ? 'Paused'
                    : audioState === 'error'
                    ? 'Audio unavailable'
                    : 'Listen to recitation'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {SPEED_OPTIONS.map((speed) => (
                    <PressableSurface
                      key={speed}
                      onPress={() => { void handleSpeedChange(speed); }}
                      haptic="selection"
                      style={{
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderWidth: 1,
                        borderColor: audioSpeed === speed ? brand : border,
                        backgroundColor: audioSpeed === speed ? (isDark ? 'rgba(197,160,89,0.18)' : '#F2D9A8') : cardBg,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: FONTS.sansMedium,
                          fontSize: 11,
                          color: audioSpeed === speed ? (isDark ? brand : COLORS.ink) : dim,
                        }}
                      >
                        {speed}×
                      </Text>
                    </PressableSurface>
                  ))}
                </View>
              </View>
            </View>

            {/* ── 4. Meaning Card ── */}
            <View
              style={{
                borderRadius: 24,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: cardBg,
                padding: 20,
                gap: 10,
              }}
            >
              <Text
                style={{
                  fontFamily: FONTS.sansSemiBold,
                  fontSize: 11,
                  letterSpacing: 2,
                  color: brand,
                  textTransform: 'uppercase',
                }}
              >
                {localizedMeaning.label}
              </Text>
              <Text
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: FONT_SCALE[fontSize].meaning,
                  lineHeight: FONT_SCALE[fontSize].meaning * 1.65,
                  color: text,
                }}
              >
                {localizedMeaning.meaning}
              </Text>
              {localizedMeaning.isLoading ? <ActivityIndicator color={brand} /> : null}
            </View>

            {/* ── 5. AI Verse Explanation (PWA Inline Wisdom) ── */}
            <View
              style={{
                borderRadius: 22,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: cardBg,
                overflow: 'hidden',
              }}
            >
              <PressableSurface
                accessibilityRole="button"
                accessibilityLabel="Explain this verse"
                onPress={() => {
                  if (!explainResult && explainStatus === 'idle') {
                    void runExplain(false);
                  } else {
                    setExplainExpanded((prev) => !prev);
                  }
                }}
                haptic="selection"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: 48,
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                  gap: 12,
                  backgroundColor: explainExpanded ? (isDark ? 'rgba(197,160,89,0.1)' : '#FFF4E0') : cardBg,
                }}
              >
                <Feather name="zap" size={16} color={brand} />
                <Text style={{ flex: 1, fontFamily: FONTS.sansSemiBold, fontSize: 13, color: text }}>
                  {explainStatus === 'loading'
                    ? 'Reflecting on verse wisdom…'
                    : explainExpanded
                    ? 'Hide Explanation'
                    : 'Explain this verse'}
                </Text>
                {explainStatus === 'loading' ? (
                  <ActivityIndicator size="small" color={brand} />
                ) : (
                  <Feather
                    name={explainExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={dim}
                  />
                )}
              </PressableSurface>

              {explainExpanded ? (
                <View style={{ padding: 18, gap: 16, borderTopWidth: 1, borderColor: border }}>
                  {explainStatus === 'upgrade_required' ? (
                    <View style={{ gap: 8, paddingVertical: 8 }}>
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: text }}>
                        ✨ Zenith Wisdom
                      </Text>
                      <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: dim, lineHeight: 20 }}>
                        Upgrade to Zenith to unlock deep tradition commentary, word-by-word meaning, and daily application.
                      </Text>
                    </View>
                  ) : explainStatus === 'error' ? (
                    <View style={{ gap: 10, paddingVertical: 8 }}>
                      <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: dim }}>
                        Could not retrieve verse wisdom right now.
                      </Text>
                      <PressableSurface
                        onPress={() => { void runExplain(false); }}
                        haptic="selection"
                        style={{
                          alignSelf: 'flex-start',
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 12,
                          backgroundColor: isDark ? 'rgba(197,160,89,0.18)' : '#F2D9A8',
                        }}
                      >
                        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: brand }}>
                          Retry
                        </Text>
                      </PressableSurface>
                    </View>
                  ) : explainResult ? (
                    <>
                      {/* Teacher attribution */}
                      {explainMeta?.teacher || explainMeta?.tradition ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 16 }}>🪔</Text>
                          <View>
                            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, letterSpacing: 1.5, color: brand, textTransform: 'uppercase' }}>
                              {explainMeta?.tradition ?? path.tradition}
                            </Text>
                            <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: dim }}>
                              In the spirit of {explainMeta?.teacher ?? 'traditional masters'}
                            </Text>
                          </View>
                        </View>
                      ) : null}

                      {/* Commentary */}
                      {explainResult.commentary ? (
                        <View style={{ gap: 6 }}>
                          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, letterSpacing: 1.5, color: brand, textTransform: 'uppercase' }}>
                            Commentary
                          </Text>
                          <Text style={{ fontFamily: FONTS.sans, fontSize: 14, lineHeight: 22, color: text }}>
                            {explainResult.commentary}
                          </Text>
                        </View>
                      ) : null}

                      {/* Daily Application highlight */}
                      {explainResult.daily_application ? (
                        <View
                          style={{
                            borderRadius: 16,
                            padding: 14,
                            backgroundColor: isDark ? 'rgba(197,160,89,0.12)' : '#FFF4E0',
                            borderWidth: 1,
                            borderColor: border,
                            gap: 4,
                          }}
                        >
                          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, letterSpacing: 1.5, color: brand, textTransform: 'uppercase' }}>
                            Today&apos;s Practice
                          </Text>
                          <Text style={{ fontFamily: FONTS.sans, fontSize: 13, lineHeight: 20, color: text }}>
                            {explainResult.daily_application}
                          </Text>
                        </View>
                      ) : null}

                      {/* Contemplation quote */}
                      {explainResult.contemplation ? (
                        <Text
                          style={{
                            fontFamily: FONTS.serif,
                            fontSize: 14,
                            fontStyle: 'italic',
                            lineHeight: 22,
                            color: dim,
                            textAlign: 'center',
                            paddingTop: 8,
                            borderTopWidth: 1,
                            borderColor: border,
                          }}
                        >
                          &ldquo;{explainResult.contemplation}&rdquo;
                        </Text>
                      ) : null}
                    </>
                  ) : null}
                </View>
              ) : null}
            </View>

            {/* ── 6. Cross-Lesson Navigation Grid (PWA Parity) ── */}
            {lessons.length > 1 ? (
              <View style={{ marginTop: 12, paddingTop: 18, borderTopWidth: 1, borderColor: border, gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1.5, color: dim, textTransform: 'uppercase' }}>
                    Chapters ({lessons.length})
                  </Text>
                  <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: brand }}>
                    {completedLessons.length} of {lessons.length} Completed
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {lessons.map((_, idx) => {
                    const isCurrent = idx === lessonIndex;
                    const isDone = completedLessons.includes(idx);
                    return (
                      <PressableSurface
                        key={idx}
                        onPress={() => goToLesson(idx)}
                        haptic="selection"
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isCurrent ? brand : isDone ? (isDark ? 'rgba(197,160,89,0.18)' : '#F2D9A8') : cardBg,
                          borderWidth: 1,
                          borderColor: isCurrent ? brand : isDone ? brand : border,
                        }}
                      >
                        {isDone && !isCurrent ? (
                          <Feather name="check" size={16} color={brand} />
                        ) : (
                          <Text
                            style={{
                              fontFamily: FONTS.sansSemiBold,
                              fontSize: 13,
                              color: isCurrent ? COLORS.ink : isDone ? brand : dim,
                            }}
                          >
                            {idx + 1}
                          </Text>
                        )}
                      </PressableSurface>
                    );
                  })}
                </View>
              </View>
            ) : null}

        </ScrollView>
      </View>
    </GestureDetector>

    {/* ── Fixed Floating Bottom Navigation Dock (PWA CanonicalReader Parity) ── */}
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        elevation: 10,
        backgroundColor: bg,
        borderTopWidth: 1,
        borderTopColor: border,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 12) + 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: isDark ? 0.35 : 0.08,
        shadowRadius: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: 540, alignSelf: 'center', width: '100%' }}>
        {verseIndex > 0 ? (
          <PressableSurface
            onPress={() => {
              setVerseIndex((v) => Math.max(0, v - 1));
            }}
            haptic="selection"
            accessibilityRole="button"
            accessibilityLabel="Previous verse"
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: border,
              backgroundColor: cardBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="chevron-left" size={22} color={text} />
          </PressableSurface>
        ) : null}

        {verseIndex < totalVerses - 1 ? (
          <PressableSurface
            onPress={() => {
              setVerseIndex((v) => Math.min(v + 1, totalVerses - 1));
            }}
            haptic="selection"
            accessibilityRole="button"
            accessibilityLabel={`Next verse, verse ${verseIndex + 2} of ${totalVerses}`}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 16,
              backgroundColor: brand,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              shadowColor: brand,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
              elevation: 3,
            }}
          >
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: COLORS.ink }}>
              Next Verse ({verseIndex + 2}/{totalVerses})
            </Text>
            <Feather name="chevron-right" size={18} color={COLORS.ink} />
          </PressableSurface>
        ) : (
          <PressableSurface
            onPress={() => {
              void handleDone();
            }}
            disabled={saving}
            haptic="impact"
            accessibilityRole="button"
            accessibilityLabel="Complete lesson"
            style={{
              flex: 1,
              height: 52,
              borderRadius: 16,
              backgroundColor: brand,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              shadowColor: brand,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.ink} size="small" />
            ) : (
              <>
                <Feather name="check-circle" size={18} color={COLORS.ink} />
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: COLORS.ink }}>
                  {completedLessons.includes(lessonIndex)
                    ? lessonIndex < lessons.length - 1
                      ? 'Next Lesson'
                      : 'Path Completed ✓'
                    : 'Complete Lesson & Earn Karma'}
                </Text>
                <Feather name="arrow-right" size={16} color={COLORS.ink} />
              </>
            )}
          </PressableSurface>
        )}
      </View>
    </View>

      <AuthGate
        visible={authGateVisible}
        onClose={() => setAuthGateVisible(false)}
        title="Complete Lesson"
        message="Sign in to save your Pathshala study progress and earn Seva."
      />

      {/* Structured AI verse explanation, rendered as a bottom sheet. */}
      <Modal
        transparent
        visible={explainVisible}
        animationType="slide"
        onRequestClose={() => setExplainVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: COLORS.bottomSheetScrim, justifyContent: 'flex-end' }}>
          <View
            style={{
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              backgroundColor: cardBg,
              maxHeight: '82%',
              paddingTop: 20,
              paddingHorizontal: 20,
              paddingBottom: 28,
            }}
          >
            <Text style={{ fontFamily: FONTS.serifBold, fontSize: 20, color: text, marginBottom: 4 }}>
              Explain this verse
            </Text>
            {explainStatus === 'ready' && (explainMeta?.teacher || explainMeta?.tradition) ? (
              <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: dim, marginBottom: 12 }}>
                {[explainMeta?.teacher, explainMeta?.tradition].filter(Boolean).join(' · ')}
              </Text>
            ) : (
              <View style={{ marginBottom: 12 }} />
            )}

            {explainStatus === 'loading' ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <ActivityIndicator color={brand} />
                <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: dim, marginTop: 12 }}>
                  Dharma Mitra is reflecting on this verse…
                </Text>
              </View>
            ) : explainStatus === 'upgrade_required' ? (
              <View style={{ paddingVertical: 24, gap: 8 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: text }}>
                  Zenith feature
                </Text>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: dim, lineHeight: 20 }}>
                  Upgrade to Zenith to unlock AI verse explanations — word-by-word meaning, commentary, and daily application.
                </Text>
              </View>
            ) : explainStatus === 'error' ? (
              <View style={{ paddingVertical: 24, gap: 12 }}>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: dim, lineHeight: 20 }}>
                  Dharma Mitra could not explain this verse right now. Please try again.
                </Text>
                <PressableSurface
                  onPress={() => { void runExplain(); }}
                  style={{
                    alignSelf: 'flex-start',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: border,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: brand }}>Retry</Text>
                </PressableSurface>
              </View>
            ) : explainResult ? (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {[
                  { label: 'Word by word', value: explainResult.word_by_word },
                  { label: 'Meaning', value: explainResult.meaning },
                  { label: 'Commentary', value: explainResult.commentary },
                  { label: 'Daily application', value: explainResult.daily_application },
                  { label: 'Contemplation', value: explainResult.contemplation },
                  { label: 'Related text', value: explainResult.related_text },
                ]
                  .filter((section) => section.value?.trim())
                  .map((section) => (
                    <View key={section.label} style={{ marginBottom: 16 }}>
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: brand, marginBottom: 4 }}>
                        {section.label}
                      </Text>
                      <Text style={{ fontFamily: FONTS.sans, fontSize: 15, lineHeight: 22, color: text }}>
                        {section.value}
                      </Text>
                    </View>
                  ))}
              </ScrollView>
            ) : null}

            <PressableSurface
              haptic="selection"
              onPress={() => setExplainVisible(false)}
              style={{
                marginTop: 16,
                borderRadius: 20,
                paddingVertical: 14,
                alignItems: 'center',
                backgroundColor: brand,
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: bg }}>Close</Text>
            </PressableSurface>
          </View>
        </View>
      </Modal>

      <PathshalaCompletionModal
        visible={completionModalVisible}
        onClose={() => setCompletionModalVisible(false)}
        lessonTitle={lesson?.title ?? `Lesson ${lessonIndex + 1}`}
        lessonNumber={lessonIndex + 1}
        totalLessons={lessons.length}
        pathTitle={path?.title ?? 'Pathshala'}
        tradition={path?.tradition ?? 'hindu'}
        karmaEarned={completionReward.karmaEarned}
        dailySadhanaUpdated={completionReward.dailySadhanaUpdated}
        hasNextLesson={lessonIndex + 1 < lessons.length}
        onContinueNextLesson={handleContinueNextLesson}
        onReturnToPath={() => {
          setCompletionModalVisible(false);
          returnToPathshala();
        }}
      />
    </View>
  );
}
