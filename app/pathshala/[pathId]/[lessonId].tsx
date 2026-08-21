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

import { BackButton } from '@/components/ui/BackButton';
import { ConfettiOverlay } from '@/components/ui/ConfettiOverlay';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS } from '@/lib/constants';
import type { PathshalaPath } from '@/lib/pathshala-types';
import { supabase } from '@/lib/supabase';
import { isGuestMode } from '@/lib/guestSession';
import { AuthGate } from '@/components/ui/AuthGate';
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
  const lessonId = Array.isArray(params.lessonId) ? params.lessonId[0] : params.lessonId;
  const lessonIndex = Number(lessonId ?? '0');

  const [fetchState, setFetchState] = useState<FetchState>('loading');
  const [path, setPath] = useState<PathshalaPath | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const lesson = lessons[lessonIndex];
  const entry = lesson?.entries[0];

  const [fontSize, setFontSize] = useState<ReaderFontSize>('normal');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [saving, setSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [authGateVisible, setAuthGateVisible] = useState(false);

  // ── AI verse explanation (real /api/pathshala/explain wiring) ──────────
  const [explainStatus, setExplainStatus] = useState<ExplainStatus>('idle');
  const [explainVisible, setExplainVisible] = useState(false);
  const [explainResult, setExplainResult] = useState<ExplainResult | null>(null);
  const [explainMeta, setExplainMeta] = useState<{ tradition?: string; teacher?: string } | null>(null);

  // ── Audio state ───────────────────────────────────────────────────
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [audioSpeed, setAudioSpeed] = useState<AudioSpeed>(1.0);
  const audioPlayer = useAudioPlayer();
  const currentAudioUrl = useRef<string | null>(null);

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
  const runExplain = useCallback(async () => {
    if (!entry || !path) return;
    if (isGuest) {
      setAuthGateVisible(true);
      return;
    }

    setExplainVisible(true);
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
        // Unconstrained, this claimed every touch on the screen — including
        // vertical drags meant for the ScrollView below — because Pan()
        // recognizes movement in any direction by default and only checked
        // translationX at onEnd, by which point it had already blocked the
        // ScrollView's own pan responder from ever engaging. That's why
        // scrolling didn't work: this gesture, not the ScrollView, was the
        // bug. activeOffsetX requires 20px of horizontal movement before
        // this gesture activates at all; failOffsetY releases it to the
        // ScrollView immediately if the drag turns out to be vertical.
        .activeOffsetX([-20, 20])
        .failOffsetY([-20, 20])
        .onEnd((event) => {
          if (event.translationX < -60) {
            goToLesson(lessonIndex + 1);
          } else if (event.translationX > 60) {
            goToLesson(lessonIndex - 1);
          }
        }),
    [goToLesson, lessonIndex]
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

  const handleDone = useCallback(async () => {
    if (isGuest) {
      setAuthGateVisible(true);
      return;
    }
    if (!pathId || !userId || saving) {
      return;
    }

    if (completedLessons.includes(lessonIndex)) {
      router.back();
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

    try {
      const response = await apiFetch('/api/pathshala/progress', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(errorBody?.error ?? 'Could not save progress');
      }
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
    setShowConfetti(true);
    setTimeout(() => router.back(), 650);
  }, [completedLessons, lessonIndex, lessons.length, pathId, router, saving, userId]);

  if (fetchState === 'loading' || loadingState) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={brand} />
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
          onPress={() => router.back()}
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
          onPress={() => router.back()}
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
          onPress={() => router.back()}
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

  const audioIcon =
    audioState === 'loading'
      ? null
      : audioState === 'playing'
      ? 'pause'
      : 'play';

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={{ flex: 1, backgroundColor: bg }}>
        <ConfettiOverlay show={showConfetti} onComplete={() => setShowConfetti(false)} density="soft" />
        <ScrollView
          contentContainerStyle={{
            paddingTop: 64,
            paddingHorizontal: 20,
            paddingBottom: 36,
            gap: 18,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <BackButton showLabel={false} iconSize={22} iconColor={text} />
            <Text style={{ flex: 1, textAlign: 'center', fontFamily: FONTS.sansSemiBold, fontSize: 14, color: dim }}>
              Lesson {lessonIndex + 1} of {lessons.length}
            </Text>
            <View style={{ width: 22 }} />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: FONTS.serifBold, fontSize: 30, color: text }}>{lesson.title}</Text>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: dim }}>{entry.source}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['en', 'hi'] as const).map((option) => (
              <PressableSurface
                key={option}
                onPress={() => setLanguage(option)}
                haptic="selection"
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: option === language ? brand : border,
                  backgroundColor: option === language ? cardBg : 'transparent',
                }}
              >
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: option === language ? brand : dim }}>
                  {option.toUpperCase()}
                </Text>
              </PressableSurface>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {(['small', 'normal', 'large', 'xl'] as const).map((option) => (
              <PressableSurface
                key={option}
                onPress={() => saveFontSize(option)}
                haptic="selection"
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: option === fontSize ? brand : border,
                  backgroundColor: option === fontSize ? cardBg : 'transparent',
                }}
              >
                <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: option === fontSize ? brand : dim }}>
                  {option === 'small' ? 'Small' : option === 'normal' ? 'Normal' : option === 'large' ? 'Large' : 'XL'}
                </Text>
              </PressableSurface>
            ))}
          </View>

          <View
            style={{
              borderRadius: 28,
              borderWidth: 1,
              borderColor: border,
              backgroundColor: cardBg,
              padding: 22,
              gap: 18,
            }}
          >
            <Text
              style={{
                fontSize: FONT_SCALE[fontSize].original,
                lineHeight: FONT_SCALE[fontSize].original * 1.45,
                color: text,
                textAlign: 'center',
                fontFamily: originalFontFamily,
              }}
            >
              {entry.original}
            </Text>

            <Text
              style={{
                fontSize: 15,
                lineHeight: 24,
                color: dim,
                textAlign: 'center',
                fontFamily: FONTS.sans,
              }}
            >
              {entry.transliteration}
            </Text>
          </View>

          {/* ── TTS Audio Panel ─────────────────────────────── */}
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
                      backgroundColor: audioSpeed === speed ? cardBg : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: FONTS.sansMedium,
                        fontSize: 11,
                        color: audioSpeed === speed ? brand : dim,
                      }}
                    >
                      {speed}×
                    </Text>
                  </PressableSurface>
                ))}
              </View>
            </View>
          </View>

          <View
            style={{
              borderRadius: 24,
              borderWidth: 1,
              borderColor: border,
              backgroundColor: cardBg,
              padding: 18,
              gap: 10,
            }}
          >
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: brand }}>
              {localizedMeaning.label}
            </Text>
            <Text style={{ fontFamily: FONTS.sans, fontSize: FONT_SCALE[fontSize].meaning, lineHeight: FONT_SCALE[fontSize].meaning * 1.55, color: text }}>
              {localizedMeaning.meaning}
            </Text>
            {localizedMeaning.isLoading ? <ActivityIndicator color={brand} /> : null}
          </View>

          {/* AI verse explanation — calls the real, RAG-backed, structured
              /api/pathshala/explain endpoint the PWA reader uses. */}
          <PressableSurface
            accessibilityRole="button"
            accessibilityLabel="Explain this verse"
            onPress={() => {
              void runExplain();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 22,
              borderWidth: 1,
              borderColor: border,
              backgroundColor: cardBg,
              minHeight: 44,
              padding: 16,
              gap: 12,
              marginTop: 4,
            }}
          >
            <Feather name="zap" size={16} color={brand} />
            <Text style={{ flex: 1, fontFamily: FONTS.sansSemiBold, fontSize: 13, color: text }}>
              Explain this verse
            </Text>
            <Feather name="chevron-right" size={16} color={dim} />
          </PressableSurface>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <PressableSurface
              onPress={() => goToLesson(lessonIndex - 1)}
              disabled={lessonIndex === 0}
              haptic="selection"
              style={{
                flex: 1,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: border,
                paddingVertical: 14,
                alignItems: 'center',
                opacity: lessonIndex === 0 ? 0.5 : 1,
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: text }}>Previous</Text>
            </PressableSurface>

            <PressableSurface
              onPress={() => goToLesson(lessonIndex + 1)}
              disabled={lessonIndex >= lessons.length - 1}
              haptic="selection"
              style={{
                flex: 1,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: border,
                paddingVertical: 14,
                alignItems: 'center',
                opacity: lessonIndex >= lessons.length - 1 ? 0.5 : 1,
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: text }}>Next</Text>
            </PressableSurface>
          </View>

          <PressableSurface
            onPress={() => { void handleDone(); }}
            disabled={saving}
            style={{
              borderRadius: 24,
              backgroundColor: brand,
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator color={bg} />
            ) : (
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: bg }}>
                Done
              </Text>
            )}
          </PressableSurface>
        </ScrollView>
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
    </GestureDetector>
  );
}
