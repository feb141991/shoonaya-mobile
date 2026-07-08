import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS } from '@/lib/constants';
import { buildHeroPoster, selectDharmVeerOfTheDayFromRoster, type DharmVeer } from '@/lib/dharm-veer';
import { spiritualDate } from '@/lib/spiritualDate';
import { supabase } from '@/lib/supabase';

type Tradition = 'hindu' | 'sikh' | 'buddhist' | 'jain';
type SwipeDecision = 'inspired' | 'skip' | 'share';

type ProfileContext = {
  userId: string;
  tradition: Tradition;
  timezone: string;
};

type ProgressSnapshot = {
  done: boolean;
  seenIds: string[];
};

const MAX_DAILY_CARDS = 3;

// Builds the deck from the CANONICAL roster fetched from
// `GET /api/dharm-veer/roster` (see loadState). Does not fall back to the
// local fixture — if `roster` is empty this returns an empty deck, and the
// screen renders an honest "Unable to load today's profile" state instead
// of silently substituting stale local content.
function buildDailyDeck(tradition: Tradition, roster: DharmVeer[]) {
  if (roster.length === 0) {
    return [];
  }

  const byTradition = roster.filter((hero) => hero.tradition === tradition);
  const fallbackPool = byTradition.length > 0 ? byTradition : roster.filter((hero) => hero.tradition === 'hindu');
  const effectivePool = fallbackPool.length > 0 ? fallbackPool : roster;
  const todayHero = selectDharmVeerOfTheDayFromRoster(roster, tradition);
  const anchorIndex = Math.max(
    0,
    effectivePool.findIndex((hero) => hero.id === todayHero.id)
  );

  return Array.from({ length: Math.min(MAX_DAILY_CARDS, effectivePool.length) }, (_, index) => {
    return effectivePool[(anchorIndex + index) % effectivePool.length];
  });
}

export default function DharmVeerScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const [profile, setProfile] = useState<ProfileContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState<DharmVeer[]>([]);
  const [rosterError, setRosterError] = useState(false);
  const [dayProgress, setDayProgress] = useState<ProgressSnapshot>({ done: false, seenIds: [] });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [privacyCommunity, setPrivacyCommunity] = useState(false);
  const [intention, setIntention] = useState('');
  const [mood, setMood] = useState<'gratitude' | 'devotion' | 'peace' | 'courage'>('gratitude');

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const textDim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const surface = isDark ? COLORS.darkBg : COLORS.creamBg;

  const today = useMemo(() => spiritualDate(profile?.timezone ?? 'UTC'), [profile?.timezone]);
  const storageKey = useMemo(() => `shoonaya-dharm-veer-mobile-${today}`, [today]);
  const deck = useMemo(() => buildDailyDeck(profile?.tradition ?? 'hindu', roster), [profile?.tradition, roster]);
  const visibleCards = deck.filter((hero) => !dayProgress.seenIds.includes(hero.id));
  const currentHero = visibleCards[currentIndex] ?? null;

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const loadState = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('tradition, timezone')
      .eq('id', user.id)
      .single();

    const tradition = (profileRow?.tradition ?? 'hindu') as Tradition;
    const timezone = profileRow?.timezone ?? 'UTC';
    const resolvedToday = spiritualDate(timezone);
    const localKey = `shoonaya-dharm-veer-mobile-${resolvedToday}`;

    const [storedValue, sadhanaRow, rosterResponse] = await Promise.all([
      AsyncStorage.getItem(localKey),
      supabase
        .from('daily_sadhana')
        .select('dharmveer_done')
        .eq('user_id', user.id)
        .eq('date', resolvedToday)
        .maybeSingle(),
      // Canonical, DB-backed roster — see src/app/api/dharm-veer/roster/route.ts
      // (wraps web's getDharmVeerRoster). Failure here is surfaced honestly
      // below rather than silently falling back to the local fixture.
      apiFetch('/api/dharm-veer/roster')
        .then(async (res) => {
          if (!res.ok) return null;
          const json = await res.json();
          return Array.isArray(json?.roster) ? (json.roster as DharmVeer[]) : null;
        })
        .catch(() => null),
    ]);

    const parsed = storedValue ? (JSON.parse(storedValue) as ProgressSnapshot) : null;

    setProfile({ userId: user.id, tradition, timezone });
    setDayProgress({
      done: Boolean(sadhanaRow.data?.dharmveer_done) || Boolean(parsed?.done),
      seenIds: parsed?.seenIds ?? [],
    });
    setRoster(rosterResponse ?? []);
    setRosterError(!rosterResponse || rosterResponse.length === 0);
    setCurrentIndex(0);
  }, [router]);

  useEffect(() => {
    setLoading(true);
    loadState()
      .catch(() => {
        Alert.alert('Could not load Dharm Veer');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loadState]);

  const shareHero = useCallback(async (hero: DharmVeer) => {
    const content = [
      `${hero.name} — Dharm Veer`,
      '',
      hero.tagline,
      '',
      hero.teaching,
      '',
      'Shared from Shoonaya',
    ].join('\n');

    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert(content);
      return;
    }

    const targetFile = new FileSystem.File(FileSystem.Paths.cache, 'shoonaya-dharm-veer.txt');
    targetFile.write(content);
    await Sharing.shareAsync(targetFile.uri);
  }, []);

  const persistCompletion = useCallback(async () => {
    if (!profile) {
      return;
    }

    await Promise.allSettled([
      // P0-3: daily_sadhana.dharmveer_done is no longer directly writable by
      // authenticated/anon — routed through the ownership-checked RPC (no
      // independent engagement signal exists for this practice yet;
      // ownership is enforced, genuine engagement is not).
      supabase.rpc('complete_dharmveer', { p_user_id: profile.userId, p_date: today }),
      apiFetch('/api/karma/award', {
        method: 'POST',
        body: JSON.stringify({ amount: 5, reason: 'dharm_veer' }),
      }),
    ]);
  }, [profile, today]);

  const submitSwipe = useCallback(
    async (hero: DharmVeer, decision: SwipeDecision) => {
      if (!profile) {
        return;
      }

      const nextSeen = Array.from(new Set([...dayProgress.seenIds, hero.id]));
      const nextDone = nextSeen.length >= MAX_DAILY_CARDS;

      setDayProgress({ done: nextDone, seenIds: nextSeen });
      setCurrentIndex(0);
      await AsyncStorage.setItem(storageKey, JSON.stringify({ done: nextDone, seenIds: nextSeen }));

      await apiFetch('/api/dharm-veer/submit', {
        method: 'POST',
        body: JSON.stringify({
          heroId: hero.id,
          decision,
          mood,
          intention,
          privacy: privacyCommunity ? 'community' : 'private',
        }),
      }).catch(() => null);

      if (decision === 'share') {
        await shareHero(hero);
      }

      if (nextDone) {
        await persistCompletion();
      }
    },
    [dayProgress.seenIds, intention, mood, persistCompletion, privacyCommunity, profile, shareHero, storageKey]
  );

  const finalizeGesture = useCallback(
    (decision: SwipeDecision) => {
      if (!currentHero || submitting) {
        return;
      }

      setSubmitting(true);
      submitSwipe(currentHero, decision)
        .catch(() => {
          Alert.alert("Could not save today's response");
        })
        .finally(() => {
          setSubmitting(false);
          translateX.value = 0;
          translateY.value = 0;
          rotate.value = 0;
          opacity.value = 1;
        });
    },
    [currentHero, rotate, submitSwipe, submitting, translateX, translateY, opacity]
  );

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      rotate.value = interpolate(event.translationX, [-240, 0, 240], [-10, 0, 10]);
    })
    .onEnd((event) => {
      if (event.translationX > 120) {
        translateX.value = withTiming(480, { duration: 220 });
        opacity.value = withTiming(0, { duration: 220 });
        runOnJS(finalizeGesture)('inspired');
        return;
      }

      if (event.translationX < -120) {
        translateX.value = withTiming(-480, { duration: 220 });
        opacity.value = withTiming(0, { duration: 220 });
        runOnJS(finalizeGesture)('skip');
        return;
      }

      if (event.translationY < -120) {
        translateY.value = withTiming(-420, { duration: 220 });
        opacity.value = withTiming(0, { duration: 220 });
        runOnJS(finalizeGesture)('share');
        return;
      }

      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      rotate.value = withSpring(0);
    });

  if (loading) {
    return (
      <Screen style={{ backgroundColor: surface }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.brandGold} />
        </View>
      </Screen>
    );
  }

  if (rosterError) {
    return (
      <Screen style={{ backgroundColor: surface }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
          <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="chevron-left" size={16} color={textDim} />
            <Text style={{ color: textDim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
          </Pressable>

          <Card style={{ backgroundColor: cardBg, borderColor: border, gap: 14 }}>
            <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 30 }}>Dharm Veer</Text>
            <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 24 }}>
              Unable to load today&apos;s profile. Check your connection and try again.
            </Text>
            <Pressable
              onPress={() => {
                setLoading(true);
                loadState()
                  .catch(() => Alert.alert('Could not load Dharm Veer'))
                  .finally(() => setLoading(false));
              }}
              style={{
                alignSelf: 'flex-start',
                borderRadius: 999,
                paddingHorizontal: 18,
                paddingVertical: 10,
                backgroundColor: COLORS.brandGold,
              }}
            >
              <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Retry</Text>
            </Pressable>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  if (dayProgress.done || !currentHero) {
    return (
      <Screen style={{ backgroundColor: surface }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
          <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="chevron-left" size={16} color={textDim} />
            <Text style={{ color: textDim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
          </Pressable>

          <Card style={{ backgroundColor: cardBg, borderColor: border, gap: 14 }}>
            <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 30 }}>Dharm Veer</Text>
            <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 24 }}>
              You have completed today&apos;s three hero cards. Come back tomorrow for a new set.
            </Text>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: surface }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="chevron-left" size={16} color={textDim} />
          <Text style={{ color: textDim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
        </Pressable>

        <View style={{ gap: 4 }}>
          <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 30 }}>Dharm Veer</Text>
          <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 14 }}>
            Card {dayProgress.seenIds.length + 1} of {MAX_DAILY_CARDS}
          </Text>
        </View>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={cardStyle}>
            <Card style={{ backgroundColor: cardBg, borderColor: border, gap: 16 }}>
              <Image
                source={{ uri: buildHeroPoster(currentHero) }}
                style={{ width: '100%', height: 260, borderRadius: 22, backgroundColor: isDark ? COLORS.darkBg : COLORS.creamBg }}
                contentFit="cover"
              />

              <View style={{ gap: 4 }}>
                <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 28 }}>{currentHero.name}</Text>
                <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>
                  {currentHero.emoji} {currentHero.tradition.toUpperCase()} · {currentHero.era}
                </Text>
              </View>

              <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                <Text style={{ color: text, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 25 }}>{currentHero.journey}</Text>
              </ScrollView>

              <Card style={{ backgroundColor: surface, borderColor: border, padding: 14 }}>
                <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 12, marginBottom: 6 }}>
                  Teaching
                </Text>
                <Text style={{ color: text, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 22 }}>{currentHero.teaching}</Text>
              </Card>
            </Card>
          </Animated.View>
        </GestureDetector>

        <Card style={{ backgroundColor: cardBg, borderColor: border, gap: 14 }}>
          <Text style={{ color: text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Check-in before you swipe</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {(['gratitude', 'devotion', 'peace', 'courage'] as const).map((option) => {
              const active = mood === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setMood(option)}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: active ? COLORS.brandGold : border,
                    backgroundColor: active ? COLORS.brandGold : cardBg,
                  }}
                >
                  <Text style={{ color: active ? COLORS.ink : textDim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={intention}
            onChangeText={setIntention}
            placeholder="What are you taking from this hero?"
            placeholderTextColor={textDim}
            multiline
            style={{
              minHeight: 96,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: border,
              backgroundColor: surface,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: text,
              fontFamily: FONTS.sans,
              fontSize: 14,
              textAlignVertical: 'top',
            }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 13 }}>Share with community</Text>
            <Switch value={privacyCommunity} onValueChange={setPrivacyCommunity} trackColor={{ true: COLORS.brandGold }} />
          </View>
        </Card>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 13 }}>Swipe left to skip</Text>
          <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 13 }}>Swipe right if inspired</Text>
        </View>
        <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 13, textAlign: 'center' }}>Swipe up to share</Text>
      </ScrollView>
    </Screen>
  );
}
