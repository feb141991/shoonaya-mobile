import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View, useColorScheme } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS } from '@/lib/constants';
import { getPathLessons } from '@/lib/pathshala-lessons';
import { SEED_PATHS } from '@/lib/pathshala-paths';
import { supabase } from '@/lib/supabase';

type EnrollmentRow = {
  path_id: string;
  current_lesson: number | null;
  completed_lessons: number[] | null;
};

export default function PathLessonListScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const params = useLocalSearchParams<{ pathId?: string | string[] }>();
  const pathId = Array.isArray(params.pathId) ? params.pathId[0] : params.pathId;
  const path = useMemo(() => SEED_PATHS.find((entry) => entry.id === pathId), [pathId]);
  const lessons = useMemo(() => (pathId ? getPathLessons(pathId) : []), [pathId]);

  const [loading, setLoading] = useState(true);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [currentLesson, setCurrentLesson] = useState(0);

  const loadProgress = useCallback(async () => {
    if (!pathId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      router.replace('/(auth)/login');
      return;
    }

    const { data, error } = await supabase
      .from('guided_path_progress')
      .select('path_id, current_lesson, completed_lessons')
      .eq('user_id', user.id)
      .eq('path_id', pathId)
      .maybeSingle();

    if (!error && data) {
      const row = data as EnrollmentRow;
      setCompletedLessons(row.completed_lessons ?? []);
      setCurrentLesson(row.current_lesson ?? 0);
    } else {
      setCompletedLessons([]);
      setCurrentLesson(0);
    }

    setLoading(false);
  }, [pathId, router]);

  useFocusEffect(
    useCallback(() => {
      void loadProgress();
    }, [loadProgress])
  );

  if (!pathId || !path) {
    return (
      <Screen style={{ backgroundColor: bg }}>
        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: text }}>Path not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONTS.serifBold, fontSize: 28, color: text }}>{path.title}</Text>
          <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: dim }}>
            {lessons.length} lessons
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.brandGold} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={lessons}
          keyExtractor={(_, index) => `${pathId}-${index}`}
          contentContainerStyle={{ paddingBottom: 24, gap: 12 }}
          renderItem={({ item, index }) => {
            const isComplete = completedLessons.includes(index);
            const isLocked = index > currentLesson && !isComplete;

            return (
              <Pressable
                disabled={isLocked}
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
                    backgroundColor: isComplete ? COLORS.brandGold : 'transparent',
                    borderWidth: isComplete ? 0 : 1,
                    borderColor: isLocked ? border : COLORS.brandGold,
                  }}
                >
                  {isComplete ? (
                    <Feather name="check" size={16} color={bg} />
                  ) : isLocked ? (
                    <Feather name="lock" size={14} color={dim} />
                  ) : (
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.brandGold }}>
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
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}
