import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View, useColorScheme } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { BackButton } from '@/components/ui/BackButton';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS, TYPE } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import type { PathshalaPath } from '@/lib/pathshala-types';
import { supabase } from '@/lib/supabase';
import { isGuestMode } from '@/lib/guestSession';

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

type EnrollmentPayload = {
  pathId: string;
  currentLesson: number;
  completedLessons: number[];
  status: string | null;
};

type FetchState = 'loading' | 'ready' | 'not_found' | 'locked' | 'error';

export default function PathLessonListScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;
  const params = useLocalSearchParams<{ pathId?: string | string[] }>();
  const pathId = Array.isArray(params.pathId) ? params.pathId[0] : params.pathId;

  const [fetchState, setFetchState] = useState<FetchState>('loading');
  const [path, setPath] = useState<PathshalaPath | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [currentLesson, setCurrentLesson] = useState(0);
  const [isGuest, setIsGuest] = useState(false);

  const loadPath = useCallback(async () => {
    if (!pathId) {
      setFetchState('not_found');
      return;
    }

    setFetchState((prev) => (prev === 'ready' || prev === 'locked' ? prev : 'loading'));

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
  }, [pathId]);

  const loadProgress = useCallback(async () => {
    if (!pathId) {
      return;
    }

    const guest = await isGuestMode();
    setIsGuest(guest);

    if (guest) {
      setCompletedLessons([]);
      setCurrentLesson(0);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    try {
      const response = await apiFetch(`/api/pathshala/progress?pathId=${encodeURIComponent(pathId)}`);
      if (response.ok) {
        const body = (await response.json()) as { enrollment: EnrollmentPayload | null };
        if (body.enrollment) {
          setCompletedLessons(body.enrollment.completedLessons ?? []);
          setCurrentLesson(body.enrollment.currentLesson ?? 0);
          return;
        }
      }
    } catch {
      // fall through to defaults below
    }

    setCompletedLessons([]);
    setCurrentLesson(0);
  }, [pathId, router]);

  useFocusEffect(
    useCallback(() => {
      void loadPath();
      void loadProgress();
    }, [loadPath, loadProgress])
  );

  if (fetchState === 'loading') {
    return (
      <Screen style={{ backgroundColor: bg }}>
        <ActivityIndicator color={brand} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  if (fetchState === 'not_found' || !path || !pathId) {
    return (
      <Screen style={{ backgroundColor: bg }}>
        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: text }}>Path not found.</Text>
      </Screen>
    );
  }

  if (fetchState === 'error') {
    return (
      <Screen style={{ backgroundColor: bg }}>
        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: text }}>
          Could not load this path.
        </Text>
        <PressableSurface onPress={() => { void loadPath(); }} style={{ marginTop: 16, alignSelf: 'flex-start' }}>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: brand }}>Try again</Text>
        </PressableSurface>
      </Screen>
    );
  }

  if (fetchState === 'locked') {
    return (
      <Screen style={{ backgroundColor: bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <BackButton showLabel={false} iconSize={22} iconColor={text} />
          <Text style={{ fontFamily: FONTS.serifBold, fontSize: 26, color: text }}>{path.title}</Text>
        </View>
        <View style={{ alignItems: 'center', marginTop: 40, gap: 12, paddingHorizontal: 24 }}>
          <Feather name="lock" size={32} color={brand} />
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: text }}>Pro required</Text>
          <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: dim, textAlign: 'center' }}>
            Upgrade to Shoonaya Pro to unlock this path.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <BackButton showLabel={false} iconSize={22} iconColor={text} />
        <View style={{ flex: 1 }}>
          <Text style={{ ...TYPE.hero, color: text }}>{path.title}</Text>
          <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: dim }}>
            {lessons.length} lessons
          </Text>
        </View>
      </View>

      <FlatList
        data={lessons}
        keyExtractor={(_, index) => `${pathId}-${index}`}
        contentContainerStyle={{ paddingBottom: 24, gap: 12 }}
        renderItem={({ item, index }) => {
          const isComplete = completedLessons.includes(index);
          const isLocked = !isGuest && index > currentLesson && !isComplete;

          return (
            <PressableSurface
              disabled={isLocked}
              haptic="selection"
              onPress={() =>
                router.push({
                  pathname: '/pathshala/[pathId]/[lessonId]',
                  params: { pathId, lessonId: String(index) },
                })
              }
              style={{
                borderRadius: 22,
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: border,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                opacity: isLocked ? 0.6 : 1,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isComplete ? brand : 'transparent',
                  borderWidth: isComplete ? 0 : 1,
                  borderColor: isLocked ? border : brand,
                }}
              >
                {isComplete ? (
                  <Feather name="check" size={16} color={bg} />
                ) : isLocked ? (
                  <Feather name="lock" size={14} color={dim} />
                ) : (
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: brand }}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: text }}>
                  {item.title}
                </Text>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim }}>
                  {isComplete ? 'Completed' : isLocked ? 'Locked' : 'Ready to read'}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={dim} />
            </PressableSurface>
          );
        }}
      />
    </Screen>
  );
}
