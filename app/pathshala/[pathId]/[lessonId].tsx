import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { ConfettiOverlay } from '@/components/ui/ConfettiOverlay';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS } from '@/lib/constants';
import type { PathshalaPath } from '@/lib/pathshala-types';
import { supabase } from '@/lib/supabase';
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
      Gesture.Pan().onEnd((event) => {
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
      const response = await apiFetch('/api/tts/generate', {
        method: 'POST',
        body: JSON.stringify({ text: entry.original }),
      });

      if (!response.ok) {
        throw new Error('tts-failed');
      }

      const data = (await response.json()) as { url?: string; audioUrl?: string };
      const audioUrl = data.url ?? data.audioUrl;

      if (!audioUrl) {
        throw new Error('tts-no-url');
      }

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
        <ActivityIndicator color={COLORS.brandGold} />
      </View>
    );
  }

  if (fetchState === 'locked') {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Feather name="lock" size={40} color={COLORS.brandGold} />
        <Text style={{ fontFamily: FONTS.serifBold, fontSize: 18, color: text, marginTop: 16, textAlign: 'center' }}>
          Pro required
        </Text>
        <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: dim, marginTop: 8, textAlign: 'center' }}>
          Upgrade to Shoonaya Pro to unlock this path.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            marginTop: 20,
            borderRadius: 18,
            backgroundColor: COLORS.brandGold,
            paddingHorizontal: 24,
            paddingVertical: 14,
          }}
        >
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: COLORS.ink }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (fetchState === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Feather name="alert-circle" size={40} color={COLORS.brandGold} />
        <Text style={{ fontFamily: FONTS.serifBold, fontSize: 18, color: text, marginTop: 16, textAlign: 'center' }}>
          Could not load this lesson.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            marginTop: 20,
            borderRadius: 18,
            backgroundColor: COLORS.brandGold,
            paddingHorizontal: 24,
            paddingVertical: 14,
          }}
        >
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: COLORS.ink }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!pathId || !lesson || !entry || !path || fetchState === 'not_found') {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Feather name="book-open" size={40} color={COLORS.brandGold} />
        <Text style={{ fontFamily: FONTS.serifBold, fontSize: 18, color: text, marginTop: 16, textAlign: 'center' }}>
          Lesson not found.
        </Text>
        <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: dim, marginTop: 8, textAlign: 'center' }}>
          Return to Pathshala and choose a lesson.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            marginTop: 20,
            borderRadius: 18,
            backgroundColor: COLORS.brandGold,
            paddingHorizontal: 24,
            paddingVertical: 14,
          }}
        >
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: COLORS.ink }}>Go back</Text>
        </Pressable>
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
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Feather name="arrow-left" size={22} color={text} />
            </Pressable>
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
              <Pressable
                key={option}
                onPress={() => setLanguage(option)}
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: option === language ? COLORS.brandGold : border,
                  backgroundColor: option === language ? cardBg : 'transparent',
                }}
              >
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: option === language ? COLORS.brandGold : dim }}>
                  {option.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {(['small', 'normal', 'large', 'xl'] as const).map((option) => (
              <Pressable
                key={option}
                onPress={() => saveFontSize(option)}
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: option === fontSize ? COLORS.brandGold : border,
                  backgroundColor: option === fontSize ? cardBg : 'transparent',
                }}
              >
                <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: option === fontSize ? COLORS.brandGold : dim }}>
                  {option === 'small' ? 'Small' : option === 'normal' ? 'Normal' : option === 'large' ? 'Large' : 'XL'}
                </Text>
              </Pressable>
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
            <Pressable
              onPress={() => { void handlePlayPause(); }}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: COLORS.brandGold,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {audioState === 'loading' ? (
                <ActivityIndicator color={COLORS.ink} size="small" />
              ) : (
                <Feather name={audioIcon ?? 'play'} size={20} color={COLORS.ink} />
              )}
            </Pressable>

            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.brandGold }}>
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
                  <Pressable
                    key={speed}
                    onPress={() => { void handleSpeedChange(speed); }}
                    style={{
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderWidth: 1,
                      borderColor: audioSpeed === speed ? COLORS.brandGold : border,
                      backgroundColor: audioSpeed === speed ? cardBg : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: FONTS.sansMedium,
                        fontSize: 11,
                        color: audioSpeed === speed ? COLORS.brandGold : dim,
                      }}
                    >
                      {speed}×
                    </Text>
                  </Pressable>
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
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: COLORS.brandGold }}>
              {localizedMeaning.label}
            </Text>
            <Text style={{ fontFamily: FONTS.sans, fontSize: FONT_SCALE[fontSize].meaning, lineHeight: FONT_SCALE[fontSize].meaning * 1.55, color: text }}>
              {localizedMeaning.meaning}
            </Text>
            {localizedMeaning.isLoading ? <ActivityIndicator color={COLORS.brandGold} /> : null}
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={() => goToLesson(lessonIndex - 1)}
              disabled={lessonIndex === 0}
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
            </Pressable>

            <Pressable
              onPress={() => goToLesson(lessonIndex + 1)}
              disabled={lessonIndex >= lessons.length - 1}
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
            </Pressable>
          </View>

          <Pressable
            onPress={() => { void handleDone(); }}
            disabled={saving}
            style={{
              borderRadius: 24,
              backgroundColor: COLORS.brandGold,
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
          </Pressable>
        </ScrollView>
      </View>
    </GestureDetector>
  );
}
