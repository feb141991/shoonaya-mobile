import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { API_BASE, COLORS, FONTS } from '@/lib/constants';
import { SACRED_RELICS, getUnlockedRelics, type Relic } from '@/lib/relics';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';

type FilterMode = 'all' | 'unlocked' | 'locked';

type ProfileRow = {
  tradition: string | null;
  active_symbol_id: string | null;
  seva_score: number | null;
  shloka_streak: number | null;
};

type DailySadhanaRow = {
  streak_count: number | null;
};

function getRequirementCopy(relic: Relic, streak: number, sevaScore: number) {
  if (relic.milestoneType === 'streak') {
    const remaining = Math.max(0, relic.milestoneValue - streak);
    return `${remaining} more ${remaining === 1 ? 'day' : 'days'} of streak needed`;
  }

  const remaining = Math.max(0, relic.milestoneValue - sevaScore);
  return `${remaining} more seva points needed`;
}

function getRelicUrl(imageUrl: string) {
  return imageUrl.startsWith('http') ? imageUrl : `${API_BASE}${imageUrl}`;
}

function RelicCard({
  relic,
  unlocked,
  active,
  streak,
  sevaScore,
  onPress,
}: {
  relic: Relic;
  unlocked: boolean;
  active: boolean;
  streak: number;
  sevaScore: number;
  onPress: () => void;
}) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const bob = useSharedValue(0);
  const scale = useSharedValue(1);

  const isLegendary = relic.milestoneValue >= 365 || relic.milestoneValue >= 1000;

  useEffect(() => {
    if (isLegendary && unlocked) {
      bob.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [bob, isLegendary, unlocked]);

  useEffect(() => {
    if (active) {
      scale.value = withSequence(
        withSpring(1.06, { damping: 10, stiffness: 160 }),
        withSpring(1, { damping: 12, stiffness: 140 })
      );
    }
  }, [active, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        style={{
          flex: 1,
          minHeight: 210,
          borderRadius: 24,
          borderWidth: active ? 2 : 1,
          borderColor: active ? COLORS.brandGold : border,
          backgroundColor: bg,
          padding: 14,
          justifyContent: 'space-between',
          shadowColor: unlocked ? COLORS.ink : 'transparent',
          shadowOpacity: unlocked ? 0.18 : 0,
          shadowRadius: unlocked ? 10 : 0,
          shadowOffset: unlocked ? { width: 0, height: 6 } : { width: 0, height: 0 },
          elevation: unlocked ? 6 : 0,
        }}
      >
        <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 100 }}>
          <Image
            source={{ uri: getRelicUrl(relic.imageUrl) }}
            resizeMode="contain"
            style={{
              width: 84,
              height: 84,
              opacity: unlocked ? 1 : 0.28,
              tintColor: unlocked ? undefined : dim,
            }}
          />
          {!unlocked ? (
            <View
              style={{
                position: 'absolute',
                right: 6,
                bottom: 6,
                width: 26,
                height: 26,
                borderRadius: 999,
                backgroundColor: bg,
                borderWidth: 1,
                borderColor: border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="lock" size={12} color={dim} />
            </View>
          ) : null}
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: text }} numberOfLines={2}>
            {relic.name}
          </Text>
          <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: dim }} numberOfLines={2}>
            {unlocked ? relic.effect : getRequirementCopy(relic, streak, sevaScore)}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function KoshScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tradition, setTradition] = useState('hindu');
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [sevaScore, setSevaScore] = useState(0);
  const [activeSymbolId, setActiveSymbolId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [selectedLocked, setSelectedLocked] = useState<Relic | null>(null);
  const [savingRelic, setSavingRelic] = useState<string | null>(null);

  const load = useCallback(async (pull = false) => {
    if (pull) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const [profileResult, latestResult, maxResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('tradition, active_symbol_id, seva_score, shloka_streak')
        .eq('id', user.id)
        .single(),
      supabase
        .from('daily_sadhana')
        .select('streak_count')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('daily_sadhana')
        .select('streak_count')
        .eq('user_id', user.id)
        .order('streak_count', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const profile = profileResult.data as ProfileRow | null;
    const latest = latestResult.data as DailySadhanaRow | null;
    const max = maxResult.data as DailySadhanaRow | null;

    setTradition(profile?.tradition ?? 'hindu');
    setActiveSymbolId(profile?.active_symbol_id ?? null);
    setSevaScore(profile?.seva_score ?? 0);
    setStreak(latest?.streak_count ?? profile?.shloka_streak ?? 0);
    setBestStreak(max?.streak_count ?? profile?.shloka_streak ?? 0);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unlocked = useMemo(() => getUnlockedRelics(streak, sevaScore, tradition), [sevaScore, streak, tradition]);
  const visibleRelics = useMemo(
    () => SACRED_RELICS.filter((relic) => relic.tradition === 'universal' || relic.tradition === tradition),
    [tradition]
  );
  const filteredRelics = useMemo(() => {
    if (filter === 'all') return visibleRelics;
    if (filter === 'unlocked') return visibleRelics.filter((relic) => unlocked.some((item) => item.id === relic.id));
    return visibleRelics.filter((relic) => !unlocked.some((item) => item.id === relic.id));
  }, [filter, unlocked, visibleRelics]);

  const equipRelic = useCallback(
    async (relic: Relic) => {
      setSavingRelic(relic.id);
      const previous = activeSymbolId;
      setActiveSymbolId(relic.id);

      try {
        const response = await apiFetch('/api/user/active-symbol', {
          method: 'PATCH',
          body: JSON.stringify({ symbolId: relic.id }),
        });

        if (!response.ok) {
          throw new Error('missing-active-symbol-route');
        }
      } catch {
        const fallback = await apiFetch('/api/profile', {
          method: 'PATCH',
          body: JSON.stringify({ active_symbol_id: relic.id }),
        });

        if (!fallback.ok) {
          setActiveSymbolId(previous);
        }
      } finally {
        setSavingRelic(null);
      }
    },
    [activeSymbolId]
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ paddingTop: 64, paddingHorizontal: 20, paddingBottom: 16, gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="arrow-left" size={22} color={text} />
          </Pressable>
          <Text style={{ fontFamily: FONTS.serifBold, fontSize: 30, color: text }}>Kosh</Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[
            `🔥 ${streak} streak`,
            `⭐ ${sevaScore} seva`,
            `🏆 ${bestStreak} best`,
          ].map((label) => (
            <View
              key={label}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: cardBg,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: text }}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['all', 'unlocked', 'locked'] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => setFilter(option)}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: filter === option ? COLORS.brandGold : border,
                backgroundColor: filter === option ? cardBg : 'transparent',
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text
                style={{
                  fontFamily: FONTS.sansMedium,
                  fontSize: 12,
                  color: filter === option ? COLORS.brandGold : dim,
                  textTransform: 'capitalize',
                }}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.brandGold} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredRelics}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 14 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36, gap: 14 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={COLORS.brandGold} />
          }
          renderItem={({ item }) => {
            const isUnlocked = unlocked.some((relic) => relic.id === item.id);
            const isActive = activeSymbolId === item.id;
            return (
              <View style={{ flex: 1 }}>
                <RelicCard
                  relic={item}
                  unlocked={isUnlocked}
                  active={isActive}
                  streak={streak}
                  sevaScore={sevaScore}
                  onPress={() => {
                    if (isUnlocked) {
                      void equipRelic(item);
                    } else {
                      setSelectedLocked(item);
                    }
                  }}
                />
                {savingRelic === item.id ? <ActivityIndicator color={COLORS.brandGold} style={{ marginTop: 8 }} /> : null}
              </View>
            );
          }}
        />
      )}

      <Modal transparent visible={Boolean(selectedLocked)} animationType="slide" onRequestClose={() => setSelectedLocked(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.28)', justifyContent: 'flex-end' }}>
          <View
            style={{
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: border,
              padding: 22,
              gap: 12,
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 52, height: 4, borderRadius: 999, backgroundColor: border }} />
            </View>
            <Text style={{ fontFamily: FONTS.serifBold, fontSize: 24, color: text }}>
              {selectedLocked?.name ?? 'Locked relic'}
            </Text>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: dim }}>
              {selectedLocked ? getRequirementCopy(selectedLocked, streak, sevaScore) : ''}
            </Text>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: text }}>
              {selectedLocked?.description ?? ''}
            </Text>
            <Pressable
              onPress={() => setSelectedLocked(null)}
              style={{
                marginTop: 8,
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
    </View>
  );
}
