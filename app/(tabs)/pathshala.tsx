import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { PathCard } from '@/components/pathshala/PathCard';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { BackButton } from '@/components/ui/BackButton';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { SkeletonRow } from '@/components/ui/SkeletonLoader';
import { ShoonayaShareCard } from '@/components/share/ShoonayaShareCard';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { navScrollHandler } from '@/lib/navScrollBus';
import { type PathshalaPath } from '@/lib/pathshala-types';
import { shareCapturedShoonayaCard } from '@/lib/share-card';
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

type TabKey = 'progress' | 'paths' | 'explore';
type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';

type EnrollmentRow = {
  path_id: string;
  current_lesson: number | null;
  completed_lessons: number[] | null;
  status: string | null;
};

type SacredText = {
  label: string;
  icon: string;
  original: string;
  transliteration: string;
  meaning: string;
  source: string;
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

// Mirrors PWA's TRADITION_SEAT map (PathshalaClient.tsx) — the tradition-
// aware eyebrow above "Today's Lesson" ("Your Seat · Gurukul" etc.).
const TRADITION_SEAT: Record<string, string> = {
  hindu: 'Your Seat · Gurukul',
  sikh: 'Your Seat · Pathshala',
  buddhist: 'Your Seat · Dhamma Path',
  jain: 'Your Seat · Svadhyaya',
};

// Same 7-dot streak visual PWA ships today — PWA's own `streakDays` array is
// explicitly a static placeholder (not yet wired to real per-day history;
// see JapaClient/PathshalaClient source), so mirroring the identical
// placeholder here keeps native/PWA behavior identical rather than
// fabricating a native-only "real" streak the backend doesn't track.
const STREAK_PLACEHOLDER: Array<true | false | 'pending'> = [true, true, true, false, true, true, 'pending'];

const DIFFICULTY_WEIGHT: Record<PathshalaPath['difficulty'], number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

const PATHSHALA_TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'progress', label: 'My Progress' },
  { key: 'paths', label: 'Paths' },
  { key: 'explore', label: 'Explore' },
];

const EXPLORE_CARDS = [
  {
    id: 'saved',
    title: 'Saved Verses',
    description: 'Return to bookmarked study notes and verses.',
    icon: 'bookmark',
    href: '/pathshala/saved',
  },
  {
    id: 'insights',
    title: 'Learning Insights',
    description: 'See your Pathshala rhythm and completed lessons.',
    icon: 'bar-chart-2',
    href: '/pathshala/insights',
  },
  {
    id: 'beginner',
    title: 'Beginner Gurukul',
    description: 'Start with the gentlest scripture paths.',
    icon: 'book-open',
    filter: 'beginner',
  },
] as const;

function PathshalaContent() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;
  const theme = themeColor(isDark);

  const [activeTab, setActiveTab] = useState<TabKey>('progress');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [paths, setPaths] = useState<PathshalaPath[]>([]);
  const [tradition, setTradition] = useState<string>('hindu');
  const [sacredText, setSacredText] = useState<SacredText | null>(null);
  const [sharing, setSharing] = useState(false);
  const dataLoadedRef = useRef(false);
  const shareCardRef = useRef<View | null>(null);

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
      const [pathsRes, profileResult, summaryRes, progressRes] = await Promise.all([
        apiFetch('/api/pathshala/paths'),
        supabase.from('profiles').select('tradition').eq('id', user.id).maybeSingle(),
        apiFetch('/api/native/home-summary'),
        // Doesn't actually depend on the paths list — it's the user's own
        // enrollment rows, not derived from `pathsRes` — so it can join the
        // same round trip instead of waiting on `fetchedPaths.length > 0`
        // below and firing a full extra sequential request afterward.
        apiFetch('/api/pathshala/progress'),
      ]);

      setTradition(profileResult.data?.tradition ?? 'hindu');

      if (summaryRes.ok) {
        const summaryJson = (await summaryRes.json()) as {
          sacredText?: Partial<SacredText>;
        };
        if (summaryJson.sacredText?.original) {
          setSacredText({
            label: summaryJson.sacredText.label ?? "Today's Verse",
            icon: summaryJson.sacredText.icon ?? '📖',
            original: summaryJson.sacredText.original,
            transliteration: summaryJson.sacredText.transliteration ?? '',
            meaning: summaryJson.sacredText.meaning ?? '',
            source: summaryJson.sacredText.source ?? '',
          });
        }
      }

      if (!pathsRes.ok) {
        setPaths([]);
        setEnrollments([]);
        return;
      }

      const fetchedPaths = parsePathsResponse(await pathsRes.json());
      setPaths(fetchedPaths);

      if (fetchedPaths.length > 0 && progressRes.ok) {
        setEnrollments(parseEnrollmentsResponse(await progressRes.json()));
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

  const sortedPaths = useMemo(() => {
    return [...paths].sort((a, b) => {
      const traditionA = a.tradition === tradition ? 0 : 1;
      const traditionB = b.tradition === tradition ? 0 : 1;
      if (traditionA !== traditionB) return traditionA - traditionB;
      const difficultyDelta = DIFFICULTY_WEIGHT[a.difficulty] - DIFFICULTY_WEIGHT[b.difficulty];
      if (difficultyDelta !== 0) return difficultyDelta;
      return a.title.localeCompare(b.title);
    });
  }, [paths, tradition]);

  const enrolledPaths = useMemo(
    () => sortedPaths
      .filter((path) => progressMap.has(path.id))
      .sort((a, b) => {
        const progressA = progressMap.get(a.id);
        const progressB = progressMap.get(b.id);
        const currentA = progressA?.current_lesson ?? 0;
        const currentB = progressB?.current_lesson ?? 0;
        return currentB - currentA;
      }),
    [progressMap, sortedPaths]
  );

  // First enrollment is the "Today's Lesson" hero; the rest render under
  // "Also enrolled in" — matches PWA's ContinueLearningHero + ActivePathCard
  // split (PathshalaClient.tsx).
  const primaryPath = enrolledPaths[0] ?? null;
  const secondaryPaths = enrolledPaths.slice(1);

  const filteredPaths = useMemo(() => {
    if (difficulty === 'all') {
      return sortedPaths;
    }
    return sortedPaths.filter((path) => path.difficulty === difficulty);
  }, [difficulty, sortedPaths]);

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

  const shareVerse = useCallback(async () => {
    if (!sacredText || sharing) return;
    setSharing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));
      await shareCapturedShoonayaCard(shareCardRef, {
        fileName: 'shoonaya-pathshala-verse.png',
        dialogTitle: "Share today's verse",
        fallbackMessage: `${sacredText.original}\n\n${sacredText.meaning}`,
      });
    } finally {
      setSharing(false);
    }
  }, [sacredText, sharing]);

  const seatLabel = TRADITION_SEAT[tradition] ?? TRADITION_SEAT.hindu;

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
            tintColor={brand}
          />
        }
        contentContainerStyle={{ paddingBottom: 28, gap: 18 }}
        onScroll={navScrollHandler}
        scrollEventThrottle={16}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BackButton showLabel={false} iconSize={23} iconColor={text} fallbackHref="/(tabs)" handleHardwareBack />
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.cardSoft,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
            }}
          >
            <Feather name="book-open" size={20} color={brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...TYPE.screenTitle, color: text }}>Pathshala</Text>
            <Text style={{ ...TYPE.caption, color: dim }} numberOfLines={1}>
              {seatLabel.replace('Your Seat · ', '')} · Sacred Learning
            </Text>
          </View>
          {enrolledPaths.length > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 7,
                backgroundColor: theme.cardSoft,
                borderWidth: 1,
                borderColor: theme.borderSoft,
              }}
            >
              <Feather name="award" size={13} color={brand} />
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: brand }}>
                {enrolledPaths.length}
              </Text>
            </View>
          ) : null}
          <PressableSurface
            haptic="selection"
            accessibilityLabel="Saved verses"
            onPress={() => router.push('/pathshala/saved')}
            style={{
              width: 40,
              height: 40,
              minHeight: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: theme.borderSoft,
            }}
          >
            <Feather name="bookmark" size={17} color={text} />
          </PressableSurface>
          <PressableSurface
            haptic="selection"
            accessibilityLabel="Learning insights"
            onPress={() => router.push('/pathshala/insights')}
            style={{
              width: 40,
              height: 40,
              minHeight: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: theme.borderSoft,
            }}
          >
            <Feather name="bar-chart-2" size={17} color={text} />
          </PressableSurface>
        </View>

        {/* Verse of the day — reuses the same sacredText payload as
            app/shloka.tsx and the Home hero card; presented here with a
            "Share this verse" action, matching PWA's Pathshala hero section. */}
        {sacredText ? (
          <View
            style={{
              borderRadius: 24,
              backgroundColor: isDark ? COLORS.homeShlokaSurfaceDark : COLORS.homeShlokaSurfaceLight,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              padding: 18,
              gap: 12,
              boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
              <PressableSurface
                haptic="selection"
                accessibilityLabel="Share today's verse"
                disabled={sharing}
                onPress={() => { void shareVerse(); }}
                style={{
                  width: 44,
                  height: 44,
                  minHeight: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.cardSoft,
                  borderWidth: 1,
                  borderColor: theme.borderSoft,
                }}
              >
                {sharing ? (
                  <ActivityIndicator color={brand} size="small" />
                ) : (
                  <Feather name="share-2" size={17} color={brand} />
                )}
              </PressableSurface>
            </View>

            <Text style={{ ...TYPE.shloka, color: text }}>{sacredText.original}</Text>
            {sacredText.meaning ? (
              <Text style={{ ...TYPE.body, color: dim }}>
                {sacredText.meaning}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View
          style={{
            borderRadius: 24,
            backgroundColor: theme.cardSoft,
            borderWidth: 1,
            borderColor: theme.borderSoft,
            padding: 4,
            flexDirection: 'row',
            gap: 4,
            boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
          }}
        >
          {PATHSHALA_TABS.map(({ key, label }) => {
            const active = activeTab === key;
            return (
              <PressableSurface
                key={key}
                onPress={() => setActiveTab(key)}
                haptic="selection"
                accessibilityState={{ selected: active }}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  paddingVertical: 10,
                  alignItems: 'center',
                  backgroundColor: active ? cardBg : 'transparent',
                  boxShadow: active ? (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light) : undefined,
                }}
              >
                <Text
                  style={{
                    fontFamily: FONTS.sansSemiBold,
                    fontSize: 12,
                    letterSpacing: 0.2,
                    color: active ? brand : dim,
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
            <Text style={{ ...TYPE.section, letterSpacing: 1.1, textTransform: 'uppercase', color: brand }}>
              {seatLabel.replace('Your Seat · ', '')}
            </Text>

            {primaryPath ? (
              (() => {
                const enrollment = progressMap.get(primaryPath.id);
                const doneCount = (enrollment?.completed_lessons ?? []).length;
                const resumeLesson = enrollment?.current_lesson ?? doneCount;
                const progressPct = Math.round((doneCount / primaryPath.total_lessons) * 100);

                return (
                  <View
                    style={{
                      borderRadius: 24,
                      backgroundColor: cardBg,
                      borderWidth: 1,
                      borderLeftWidth: 4,
                      borderLeftColor: brand,
                      borderColor: border,
                      padding: 18,
                      gap: 12,
                    }}
                  >
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: brand }}>
                      Today&apos;s Lesson
                    </Text>
                    <Text style={{ ...TYPE.cardHeading, color: text }}>{primaryPath.title}</Text>
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: dim }}>
                      Lesson {Math.min(resumeLesson + 1, primaryPath.total_lessons)} of {primaryPath.total_lessons}
                    </Text>

                    <View style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: brand }}>
                          {progressPct}% Complete
                        </Text>
                        <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: dim }}>
                          {doneCount}/{primaryPath.total_lessons}
                        </Text>
                      </View>
                      <View style={{ height: 8, borderRadius: 999, backgroundColor: border, overflow: 'hidden' }}>
                        <View
                          style={{
                            width: `${Math.max(0, Math.min(progressPct, 100))}%`,
                            height: '100%',
                            backgroundColor: brand,
                            borderRadius: 999,
                          }}
                        />
                      </View>
                    </View>

                    <PressableSurface
                      haptic="selection"
                      onPress={() => openPath(primaryPath)}
                      style={{
                        marginTop: 4,
                        minHeight: MIN_TOUCH_TARGET,
                        borderRadius: 16,
                        backgroundColor: brand,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <Feather name="play" size={14} color={bg} />
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: bg }}>
                        {doneCount === 0 ? 'Begin Path' : `Continue · Lesson ${Math.min(resumeLesson + 1, primaryPath.total_lessons)}`}
                      </Text>
                    </PressableSurface>

                    <View style={{ gap: 8 }}>
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: dim }}>
                        7-Day Learning Streak
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {STREAK_PLACEHOLDER.map((state, index) => (
                          <View
                            key={index}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: state === true ? brand : 'transparent',
                              borderWidth: state === true ? 0 : 1.5,
                              borderColor: state === 'pending' ? brand : border,
                              borderStyle: state === 'pending' ? 'dashed' : 'solid',
                            }}
                          >
                            {state === true ? (
                              <Feather name="check" size={13} color={bg} />
                            ) : state === 'pending' ? (
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: brand }} />
                            ) : null}
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                );
              })()
            ) : (
              <EmptyState
                emoji="📚"
                title="No paths enrolled yet"
                subtitle="Choose a beginner path below to begin your disciplined, daily study."
                ctaLabel="Explore paths"
                onCta={() => setActiveTab('paths')}
              />
            )}

            {secondaryPaths.length > 0 ? (
              <View style={{ gap: 12 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: dim }}>
                  Also enrolled in
                </Text>
                {secondaryPaths.map((path, index) => {
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
                      index={index}
                    />
                  );
                })}
              </View>
            ) : null}

            {primaryPath === null && (
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
                          borderColor: brand,
                        }}
                      >
                        <Feather name="book-open" size={18} color={brand} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: text }}>
                          {path.title}
                        </Text>
                        <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim }} numberOfLines={1}>
                          {path.description}
                        </Text>
                        <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 11, color: brand, textTransform: 'capitalize' }}>
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
                          backgroundColor: brand,
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
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: brand }}>
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
                            backgroundColor: complete ? brand : 'transparent',
                            borderWidth: complete ? 0 : 1.5,
                            borderColor: current ? brand : border,
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
                                backgroundColor: brand,
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
                                  ? brand
                                  : border
                                : completedLessonsByDifficulty.intermediate
                                  ? brand
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
        ) : activeTab === 'paths' ? (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ ...TYPE.section, letterSpacing: 1.1, textTransform: 'uppercase', color: brand }}>
                Sacred Paths
              </Text>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 13, lineHeight: 19, color: dim }}>
                Browse structured learning paths, sorted by your tradition and level.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((option) => (
                <PressableSurface
                  key={option}
                  onPress={() => setDifficulty(option)}
                  haptic="selection"
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: difficulty === option ? brand : border,
                    backgroundColor: difficulty === option ? cardBg : 'transparent',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: difficulty === option ? brand : dim, textTransform: 'capitalize' }}>
                    {option}
                  </Text>
                </PressableSurface>
              ))}
            </View>

            {filteredPaths.map((path, index) => {
              const enrollment = progressMap.get(path.id);
              const progressPct = enrollment
                ? Math.round((((enrollment.completed_lessons ?? []).length || 0) / path.total_lessons) * 100)
                : 0;

              return (
                <PathCard
                  key={path.id}
                  path={path}
                  progressPct={progressPct}
                  index={index}
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
        ) : (
          <View style={{ gap: 16 }}>
            <View
              style={{
                borderRadius: 26,
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                padding: 18,
                gap: 12,
                boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.brandSoft,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                }}
              >
                <Feather name="search" size={22} color={brand} />
              </View>
              <View style={{ gap: 5 }}>
                <Text style={{ ...TYPE.cardHeading, color: text }}>Explore Pathshala</Text>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 13, lineHeight: 20, color: dim }}>
                  Saved verses, insights, and beginner routes in one quiet study shelf.
                </Text>
              </View>
            </View>

            {EXPLORE_CARDS.map((item) => (
              <PressableSurface
                key={item.id}
                haptic="selection"
                accessibilityLabel={`Open ${item.title}`}
                onPress={() => {
                  if ('href' in item) {
                    router.push(item.href);
                  } else if ('filter' in item) {
                    setDifficulty(item.filter);
                    setActiveTab('paths');
                  }
                }}
                style={{
                  borderRadius: 24,
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: border,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.brandSoft,
                    borderWidth: 1,
                    borderColor: theme.premiumBorder,
                  }}
                >
                  <Feather name={item.icon} size={19} color={brand} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: text }}>
                    {item.title}
                  </Text>
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 12, lineHeight: 17, color: dim }} numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={dim} />
              </PressableSurface>
            ))}

            <View style={{ gap: 12 }}>
              <Text style={{ ...TYPE.section, letterSpacing: 1.1, textTransform: 'uppercase', color: brand }}>
                Recommended Next
              </Text>
              {sortedPaths.slice(0, 3).map((path, index) => {
                const enrollment = progressMap.get(path.id);
                const progressPct = enrollment
                  ? Math.round((((enrollment.completed_lessons ?? []).length || 0) / path.total_lessons) * 100)
                  : 0;
                return (
                  <PathCard
                    key={path.id}
                    path={path}
                    progressPct={progressPct}
                    index={index}
                    onPress={() => {
                      if (enrollment) {
                        openPath(path);
                      } else {
                        void enroll(path);
                      }
                    }}
                  />
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {sacredText ? (
        <View pointerEvents="none" collapsable={false} style={{ position: 'absolute', left: -420, top: 0, opacity: 0.01 }}>
          <ShoonayaShareCard
            ref={shareCardRef}
            data={{
              tradition,
              headlineValue: sacredText.source || sacredText.label,
              title: sacredText.label,
              subtitle: sacredText.source,
              caption: sacredText.meaning || sacredText.original,
              footer: 'Shared from Shoonaya · Pathshala',
            }}
          />
        </View>
      ) : null}
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
