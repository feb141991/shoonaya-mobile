import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { PathCard } from '@/components/pathshala/PathCard';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { SkeletonRow } from '@/components/ui/SkeletonLoader';
import { COLORS, FONTS } from '@/lib/constants';
import { type PathshalaPath } from '@/lib/pathshala-types';
import { supabase } from '@/lib/supabase';
import { useScrollToTop } from '@/lib/useScrollToTop';
import { apiFetch } from '@/lib/api';

function parseEnrollmentsResponse(value: unknown): EnrollmentRow[] {
  if (!value || typeof value !== 'object') return [];
  const enrollments = (value as Record<string, unknown>).enrollments;
  if (!Array.isArray(enrollments)) return [];
  return enrollments
    .filter((row): row is { pathId: string; currentLesson: number; completedLessons: number[]; status: string | null } =>
      !!row && typeof row === 'object' && typeof (row as Record<string, unknown>).pathId === 'string'
    )
    .map((row) => ({
      path_id: row.pathId,
      current_lesson: row.currentLesson,
      completed_lessons: row.completedLessons,
      status: row.status,
    }));
}

function parseEnrollmentResponse(value: unknown): EnrollmentRow | null {
  if (!value || typeof value !== 'object') return null;
  const enrollment = (value as Record<string, unknown>).enrollment;
  if (!enrollment || typeof enrollment !== 'object') return null;
  const candidate = enrollment as Record<string, unknown>;
  if (typeof candidate.pathId !== 'string') return null;
  return {
    path_id: candidate.pathId,
    current_lesson: typeof candidate.currentLesson === 'number' ? candidate.currentLesson : 0,
    completed_lessons: Array.isArray(candidate.completedLessons) ? (candidate.completedLessons as number[]) : [],
    status: typeof candidate.status === 'string' ? candidate.status : null,
  };
}

type TabKey = 'progress' | 'explore';
type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';

type EnrollmentRow = {
  path_id: string;
  current_lesson: number | null;
  completed_lessons: number[] | null;
  status: string | null;
};

function isPathshalaPath(value: unknown): value is PathshalaPath {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.description === 'string' &&
    (candidate.difficulty === 'beginner' ||
      candidate.difficulty === 'intermediate' ||
      candidate.difficulty === 'advanced') &&
    typeof candidate.proRequired === 'boolean' &&
    typeof candidate.tradition === 'string' &&
    typeof candidate.total_lessons === 'number' &&
    typeof candidate.duration_days === 'number'
  );
}

function parsePathsResponse(value: unknown): PathshalaPath[] {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const paths = (value as Record<string, unknown>).paths;
  return Array.isArray(paths) ? paths.filter(isPathshalaPath) : [];
}

const TRADITION_EMOJI: Record<string, string> = {
  hindu: '🕉️',
  sikh: '☬',
  buddhist: '☸️',
  jain: '卐',
};

function PathshalaContent() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;

  const [activeTab, setActiveTab] = useState<TabKey>('progress');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [paths, setPaths] = useState<PathshalaPath[]>([]);
  const dataLoadedRef = useRef(false);

  const scrollRef = useScrollToTop();

  const loadData = useCallback(async (refresh = false) => {
    if (refresh || dataLoadedRef.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setEnrollments([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const pathsRes = await apiFetch('/api/pathshala/paths');
      if (!pathsRes.ok) {
        setPaths([]);
        setEnrollments([]);
        return;
      }

      const fetchedPaths = parsePathsResponse(await pathsRes.json());
      setPaths(fetchedPaths);

      if (fetchedPaths.length > 0) {
        const progressRes = await apiFetch('/api/pathshala/progress');
        if (progressRes.ok) {
          setEnrollments(parseEnrollmentsResponse(await progressRes.json()));
        } else {
          setEnrollments([]);
        }
      } else {
        setEnrollments([]);
      }
    } catch (error) {
      console.error(error);
      setPaths([]);
      setEnrollments([]);
    }

    dataLoadedRef.current = true;
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const progressMap = useMemo(() => {
    const map = new Map<string, EnrollmentRow>();
    for (const enrollment of enrollments) {
      map.set(enrollment.path_id, enrollment);
    }
    return map;
  }, [enrollments]);

  const enrolledPaths = useMemo(
    () => paths.filter((path) => progressMap.has(path.id)),
    [paths, progressMap]
  );

  const filteredPaths = useMemo(() => {
    if (difficulty === 'all') {
      return paths;
    }
    return paths.filter((path) => path.difficulty === difficulty);
  }, [difficulty, paths]);

  const openPath = useCallback(
    (path: PathshalaPath) => {
      router.push({
        pathname: '/pathshala/[pathId]',
        params: { pathId: path.id },
      });
    },
    [router]
  );

  const enroll = useCallback(
    async (path: PathshalaPath) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      const optimistic: EnrollmentRow = {
        path_id: path.id,
        current_lesson: 0,
        completed_lessons: [],
        status: 'active',
      };

      setEnrollments((current) => {
        if (current.some((entry) => entry.path_id === path.id)) {
          return current;
        }
        return [...current, optimistic];
      });

      try {
        const response = await apiFetch('/api/pathshala/enroll', {
          method: 'POST',
          body: JSON.stringify({ pathId: path.id }),
        });

        if (!response.ok) {
          setEnrollments((current) => current.filter((entry) => entry.path_id !== path.id));
          return;
        }

        const enrollment = parseEnrollmentResponse(await response.json());
        if (enrollment) {
          setEnrollments((current) => {
            const withoutPath = current.filter((entry) => entry.path_id !== path.id);
            return [...withoutPath, enrollment];
          });
        }
      } catch {
        setEnrollments((current) => current.filter((entry) => entry.path_id !== path.id));
        return;
      }

      openPath(path);
    },
    [openPath, router]
  );

  const completedLessonsByDifficulty = useMemo(() => {
    const completedPathIds = enrollments
      .filter((entry) => {
        const path = paths.find((candidate) => candidate.id === entry.path_id);
        return path && (entry.completed_lessons ?? []).length >= path.total_lessons;
      })
      .map((entry) => entry.path_id);

    return {
      beginner: completedPathIds.some((id) => paths.find((path) => path.id === id)?.difficulty === 'beginner'),
      intermediate: completedPathIds.some((id) => paths.find((path) => path.id === id)?.difficulty === 'intermediate'),
    };
  }, [enrollments, paths]);

  const currentLevel: DifficultyFilter = useMemo(() => {
    if (enrolledPaths.some((path) => path.difficulty === 'advanced')) return 'advanced';
    if (enrolledPaths.some((path) => path.difficulty === 'intermediate')) return 'intermediate';
    return 'beginner';
  }, [enrolledPaths]);

  return (
    <Screen style={{ backgroundColor: bg }}>
      <ScrollView
        ref={scrollRef}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void loadData(true);
            }}
            tintColor={COLORS.brandGold}
          />
        }
        contentContainerStyle={{ paddingBottom: 28, gap: 18 }}
      >
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: FONTS.serifBold, fontSize: 30, color: text }}>Pathshala</Text>
          <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: dim }}>
            Scripture learning, daily discipline, and guided study.
          </Text>
        </View>

        <View
          style={{
            borderRadius: 24,
            backgroundColor: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
            borderWidth: 1,
            borderColor: border,
            padding: 6,
            flexDirection: 'row',
            gap: 6,
          }}
        >
          {([
            ['progress', 'My Progress'],
            ['explore', 'Explore'],
          ] as const).map(([key, label]) => {
            const active = activeTab === key;
            return (
              <PressableSurface
                key={key}
                onPress={() => setActiveTab(key)}
                haptic="selection"
                style={{
                  flex: 1,
                  borderRadius: 18,
                  paddingVertical: 12,
                  alignItems: 'center',
                  backgroundColor: active ? cardBg : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontFamily: FONTS.sansSemiBold,
                    fontSize: 13,
                    color: active ? COLORS.brandGold : dim,
                  }}
                >
                  {label}
                </Text>
              </PressableSurface>
            );
          })}
        </View>

        {loading ? (
          <View style={{ gap: 14 }}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : activeTab === 'progress' ? (
          <View style={{ gap: 18 }}>
            <View
              style={{
                borderRadius: 24,
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: border,
                padding: 18,
                gap: 14,
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.brandGold }}>
                YOUR GURUKUL
              </Text>
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 24, color: text }}>
                Continue your learning
              </Text>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: dim }}>
                {enrolledPaths.length > 0
                  ? `You are enrolled in ${enrolledPaths.length} sacred path${enrolledPaths.length === 1 ? '' : 's'}.`
                  : 'Choose a path and begin disciplined, daily study.'}
              </Text>
            </View>

              {enrolledPaths.length === 0 ? (
                <EmptyState
                  emoji="📖"
                  title="No paths enrolled yet"
                  subtitle="Choose a beginner path below to begin your disciplined, daily study."
                  ctaLabel="Explore paths"
                  onCta={() => setActiveTab('explore')}
                />
              ) : enrolledPaths.map((path) => {
                const enrollment = progressMap.get(path.id);
                const progressPct = Math.round(
                  (((enrollment?.completed_lessons ?? []).length || 0) / path.total_lessons) * 100
                );
                return (
                  <PathCard
                    key={path.id}
                    path={path}
                    progressPct={progressPct}
                    onPress={() => openPath(path)}
                  />
                );
              })}

            {enrolledPaths.length > 0 ? null : (
              <View style={{ gap: 12 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: dim }}>
                  BEGIN YOUR JOURNEY
                </Text>
                {paths.filter((path) => path.difficulty === 'beginner')
                  .slice(0, 3)
                  .map((path) => (
                    <View
                      key={path.id}
                      style={{
                        borderRadius: 22,
                        backgroundColor: cardBg,
                        borderWidth: 1,
                        borderColor: border,
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 999,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: COLORS.brandGold,
                        }}
                      >
                        <Text style={{ fontSize: 18 }}>{TRADITION_EMOJI[path.tradition] ?? '📖'}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: text }}>
                          {path.title}
                        </Text>
                        <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim }} numberOfLines={1}>
                          {path.description}
                        </Text>
                        <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 11, color: COLORS.brandGold, textTransform: 'capitalize' }}>
                          {path.difficulty}
                        </Text>
                      </View>
                      <PressableSurface
                        onPress={() => {
                          try { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                          void enroll(path);
                        }}
                        haptic="none"
                        style={{
                          borderRadius: 16,
                          backgroundColor: COLORS.brandGold,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                        }}
                      >
                        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: bg }}>Enroll</Text>
                      </PressableSurface>
                    </View>
                  ))}
                <PressableSurface onPress={() => setActiveTab('explore')} haptic="selection" style={{ paddingVertical: 8, alignItems: 'center' }}>
                  <Text style={{ textAlign: 'center', fontFamily: FONTS.sans, fontSize: 12, color: dim }}>
                    See all paths →
                  </Text>
                </PressableSurface>
              </View>
            )}

            <View
              style={{
                borderRadius: 24,
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: border,
                padding: 18,
                gap: 14,
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.brandGold }}>
                DIFFICULTY PROGRESSION
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                {(['beginner', 'intermediate', 'advanced'] as const).map((level, index) => {
                  const complete =
                    level === 'beginner'
                      ? completedLessonsByDifficulty.beginner
                      : level === 'intermediate'
                        ? completedLessonsByDifficulty.intermediate
                        : false;
                  const current = currentLevel === level;
                  const locked =
                    (level === 'intermediate' && !completedLessonsByDifficulty.beginner) ||
                    (level === 'advanced' && !completedLessonsByDifficulty.intermediate);

                  return (
                    <View key={level} style={{ flex: 1, alignItems: 'center', flexDirection: 'row' }}>
                      <View style={{ alignItems: 'center', width: 72 }}>
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 999,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: complete ? COLORS.brandGold : 'transparent',
                            borderWidth: complete ? 0 : 1.5,
                            borderColor: current ? COLORS.brandGold : border,
                          }}
                        >
                          {complete ? (
                            <Feather name="check" size={12} color={bg} />
                          ) : locked ? (
                            <Feather name="lock" size={10} color={dim} />
                          ) : current ? (
                            <View
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 999,
                                backgroundColor: COLORS.brandGold,
                              }}
                            />
                          ) : null}
                        </View>
                        <Text style={{ marginTop: 8, fontFamily: FONTS.sansMedium, fontSize: 10, color: dim, textTransform: 'uppercase' }}>
                          {level}
                        </Text>
                      </View>
                      {index < 2 ? (
                        <View
                          style={{
                            flex: 1,
                            height: 1.5,
                            backgroundColor:
                              index === 0
                                ? completedLessonsByDifficulty.beginner
                                  ? COLORS.brandGold
                                  : border
                                : completedLessonsByDifficulty.intermediate
                                  ? COLORS.brandGold
                                  : border,
                          }}
                        />
                      ) : null}
                    </View>
                  );
                })}
              </View>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim, fontStyle: 'italic' }}>
                {completedLessonsByDifficulty.intermediate
                  ? 'Advanced paths unlocked'
                  : completedLessonsByDifficulty.beginner
                    ? 'Complete an Intermediate path to unlock Advanced'
                    : 'Complete a Beginner path to advance'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((option) => (
                <PressableSurface
                  key={option}
                  onPress={() => setDifficulty(option)}
                  haptic="selection"
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: difficulty === option ? COLORS.brandGold : border,
                    backgroundColor: difficulty === option ? cardBg : 'transparent',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: difficulty === option ? COLORS.brandGold : dim, textTransform: 'capitalize' }}>
                    {option}
                  </Text>
                </PressableSurface>
              ))}
            </View>

            {filteredPaths.map((path) => {
              const enrollment = progressMap.get(path.id);
              const progressPct = enrollment
                ? Math.round((((enrollment.completed_lessons ?? []).length || 0) / path.total_lessons) * 100)
                : 0;

              return (
                <PathCard
                  key={path.id}
                  path={path}
                  progressPct={progressPct}
                  onPress={() => {
                    if (enrollment) {
                      openPath(path);
                    } else {
                      try { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                      void enroll(path);
                    }
                  }}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

export default function PathshalaScreen() {
  return (
    <ErrorBoundary>
      <PathshalaContent />
    </ErrorBoundary>
  );
}
