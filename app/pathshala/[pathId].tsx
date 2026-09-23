import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View, useColorScheme } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { BackButton } from '@/components/ui/BackButton';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { SacredLoader } from '@/components/ui/SacredLoader';
import { COLORS, FONTS, TYPE } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import type { PathshalaPath } from '@/lib/pathshala-types';
import { captureAppIdentity, useAppIdentity } from '@/lib/appIdentity';
import {
  getPathshalaDetailCacheSnapshot,
  readPathshalaDetailCache,
  writePathshalaDetailCache,
  type PathshalaPathDetail,
} from '@/lib/pathshalaCache';

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

type PathDetailResponse = PathshalaPathDetail;

type EnrollmentPayload = {
  pathId: string;
  currentLesson: number;
  completedLessons: number[];
  progressPercent: number;
  lastReadAt: string | null;
  enrolledAt: string;
};

type FetchState = 'loading' | 'ready' | 'not_found' | 'locked' | 'error';

export default function PathDetailScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const appIdentity = useAppIdentity();
  const bg = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;
  const params = useLocalSearchParams<{ pathId?: string | string[] }>();
  const pathId = Array.isArray(params.pathId) ? params.pathId[0] : params.pathId;
  const cacheIdentity = appIdentity.kind === 'authenticated' ? appIdentity.userId : 'guest';
  const initialDetail = pathId ? getPathshalaDetailCacheSnapshot(cacheIdentity, pathId) : null;

  const [fetchState, setFetchState] = useState<FetchState>(initialDetail ? (initialDetail.locked ? 'locked' : 'ready') : 'loading');
  const [path, setPath] = useState<PathshalaPath | null>(initialDetail?.path ?? null);
  const [lessons, setLessons] = useState<Lesson[]>(initialDetail?.lessons ?? []);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [currentLesson, setCurrentLesson] = useState(0);
  const [isGuest, setIsGuest] = useState(false);

  const loadPath = useCallback(async () => {
    if (!pathId) {
      setFetchState('not_found');
      return;
    }
    if (appIdentity.kind === 'loading') return;

    const { isCurrent } = captureAppIdentity();
    const snapshot = getPathshalaDetailCacheSnapshot(cacheIdentity, pathId);
    let networkWon = false;
    if (snapshot) {
      setPath(snapshot.path);
      setLessons(snapshot.lessons);
      setFetchState(snapshot.locked ? 'locked' : 'ready');
    } else {
      setFetchState((prev) => (prev === 'ready' || prev === 'locked' ? prev : 'loading'));
      void readPathshalaDetailCache(cacheIdentity, pathId).then((cached) => {
        if (!cached || !isCurrent() || networkWon) return;
        setPath(cached.path);
        setLessons(cached.lessons);
        setFetchState(cached.locked ? 'locked' : 'ready');
      });
    }
    setRefreshFailed(false);

    try {
      const response = await apiFetch(`/api/pathshala/paths/${pathId}`, appIdentity.kind === 'authenticated'
        ? { expectedUserId: appIdentity.userId }
        : { expectedGuest: true });
      if (!isCurrent()) return;

      if (response.status === 404) {
        setFetchState('not_found');
        return;
      }

      if (!response.ok) {
        const cached = snapshot ?? await readPathshalaDetailCache(cacheIdentity, pathId);
        if (!isCurrent()) return;
        if (cached) setRefreshFailed(true);
        else setFetchState('error');
        return;
      }

      const responseBody = (await response.json()) as Omit<PathDetailResponse, 'locked'> & { locked?: boolean };
      if (!isCurrent()) return;
      networkWon = true;
      const data: PathDetailResponse = { ...responseBody, locked: responseBody.locked === true };
      setPath(data.path);
      setLessons(data.lessons);
      setFetchState(data.locked ? 'locked' : 'ready');
      if (!data.locked) void writePathshalaDetailCache(cacheIdentity, pathId, data);
    } catch {
      if (!isCurrent()) return;
      const cached = snapshot ?? getPathshalaDetailCacheSnapshot(cacheIdentity, pathId) ?? await readPathshalaDetailCache(cacheIdentity, pathId);
      if (!isCurrent()) return;
      if (cached) setRefreshFailed(true);
      else setFetchState('error');
    }
  }, [pathId, cacheIdentity, appIdentity]);

  const loadProgress = useCallback(async () => {
    if (!pathId || appIdentity.kind === 'loading') {
      return;
    }

    const { isCurrent } = captureAppIdentity();
    if (appIdentity.kind === 'guest' || appIdentity.kind === 'unauthenticated') {
      if (!isCurrent()) return;
      setIsGuest(true);
      setCompletedLessons([]);
      setCurrentLesson(0);
      return;
    }

    if (!isCurrent()) return;
    setIsGuest(false);
    setCompletedLessons([]);
    setCurrentLesson(0);

    try {
      const response = await apiFetch(`/api/pathshala/progress?pathId=${encodeURIComponent(pathId)}`, { expectedUserId: appIdentity.userId });
      if (!isCurrent()) return;
      if (response.ok) {
        const body = (await response.json()) as { enrollment: EnrollmentPayload | null };
        if (!isCurrent()) return;
        if (body.enrollment) {
          setCompletedLessons(body.enrollment.completedLessons ?? []);
          setCurrentLesson(body.enrollment.currentLesson ?? 0);
          return;
        }
      }
    } catch {
      // fall through to defaults below
    }

    if (!isCurrent()) return;
    setCompletedLessons([]);
    setCurrentLesson(0);
  }, [pathId, appIdentity]);

  useFocusEffect(
    useCallback(() => {
      void loadPath();
      void loadProgress();
    }, [loadPath, loadProgress])
  );

  if (fetchState === 'loading') {
    return (
      <Screen style={{ backgroundColor: bg, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
        <SacredLoader
          icon="pathshala"
          title="Loading Sacred Path"
          subtitle="Preparing chapters and scriptural commentary..."
          showBack={true}
        />
      </Screen>
    );
  }

  if (fetchState === 'not_found' || !path || !pathId) {
    return (
      <Screen style={{ backgroundColor: bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <BackButton showLabel={false} iconSize={22} iconColor={text} fallbackHref="/(tabs)/pathshala" handleHardwareBack />
          <Text style={{ fontFamily: FONTS.serifBold, fontSize: 22, color: text }}>Pathshala</Text>
        </View>
        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: text }}>Path not found.</Text>
        <PressableSurface
          onPress={() => router.replace('/(tabs)/pathshala')}
          style={{ marginTop: 16, alignSelf: 'flex-start' }}
        >
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: brand }}>Return to Pathshala</Text>
        </PressableSurface>
      </Screen>
    );
  }

  if (fetchState === 'error') {
    return (
      <Screen style={{ backgroundColor: bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <BackButton showLabel={false} iconSize={22} iconColor={text} fallbackHref="/(tabs)/pathshala" handleHardwareBack />
          <Text style={{ fontFamily: FONTS.serifBold, fontSize: 22, color: text }}>Pathshala</Text>
        </View>
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
          <BackButton showLabel={false} iconSize={22} iconColor={text} fallbackHref="/(tabs)/pathshala" handleHardwareBack />
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
        <BackButton showLabel={false} iconSize={22} iconColor={text} fallbackHref="/(tabs)/pathshala" handleHardwareBack />
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
      {refreshFailed ? (
        <Text accessibilityRole="alert" style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim, marginTop: 8 }}>
          Showing saved lessons. Could not refresh just now.
        </Text>
      ) : null}
    </Screen>
  );
}
