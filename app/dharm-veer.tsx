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
import { DHARM_VEERS, getDharmVeerOfTheDay, type DharmVeer } from '@/lib/dharm-veer';
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

function spiritualDate(timezone: string) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const baseDate = new Date(`${year}-${month}-${day}T12:00:00Z`);

  if (hour < 4) {
    baseDate.setUTCDate(baseDate.getUTCDate() - 1);
  }

  return baseDate.toISOString().slice(0, 10);
}

function buildDailyDeck(tradition: Tradition) {
  const byTradition = DHARM_VEERS.filter((hero) => hero.tradition === tradition) as DharmVeer[];
  const fallbackPool = byTradition.length > 0 ? byTradition : (DHARM_VEERS.filter((hero) => hero.tradition === 'hindu') as DharmVeer[]);
  const todayHero = getDharmVeerOfTheDay(tradition);
  const anchorIndex = Math.max(
    0,
    fallbackPool.findIndex((hero) => hero.id === todayHero.id)
  );

  return Array.from({ length: Math.min(MAX_DAILY_CARDS, fallbackPool.length) }, (_, index) => {
    return fallbackPool[(anchorIndex + index) % fallbackPool.length];
  });
}

function buildHeroPoster(hero: DharmVeer) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="1200" viewBox="0 0 960 1200">
      <rect width="960" height="1200" fill="#FDF6E3" />
      <rect x="36" y="36" width="888" height="1128" rx="48" fill="#FFF9F0" stroke="#E6D8BC" stroke-width="3" />
      <text x="480" y="320" text-anchor="middle" font-size="180">${hero.emoji}</text>
      <text x="480" y="520" text-anchor="middle" font-size="56" font-family="Georgia" fill="#1A0F00">${hero.name}</text>
      <text x="480" y="596" text-anchor="middle" font-size="30" font-family="Georgia" fill="#7A6A53">${hero.era}</text>
      <foreignObject x="100" y="670" width="760" height="300">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Georgia; font-size: 26px; color: #1A0F00; line-height: 1.45; text-align: center;">
          ${hero.tagline}
        </div>
      </foreignObject>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function DharmVeerScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const [profile, setProfile] = useState<ProfileContext | null>(null);
  const [loading, setLoading] = useState(true);
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
  const deck = useMemo(() => buildDailyDeck(profile?.tradition ?? 'hindu'), [profile?.tradition]);
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

    const [storedValue, sadhanaRow] = await Promise.all([
      AsyncStorage.getItem(localKey),
      supabase
        .from('daily_sadhana')
        .select('dharmveer_done')
        .eq('user_id', user.id)
        .eq('date', resolvedToday)
        .maybeSingle(),
    ]);

    const parsed = storedValue ? (JSON.parse(storedValue) as ProgressSnapshot) : null;

    setProfile({ userId: user.id, tradition, timezone });
    setDayProgress({
      done: Boolean(sadhanaRow.data?.dharmveer_done) || Boolean(parsed?.done),
      seenIds: parsed?.seenIds ?? [],
    });
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

    const targetPath = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ''}shoonaya-dharm-veer.txt`;
    if (!targetPath) {
      Alert.alert(content);
      return;
    }

    await FileSystem.writeAsStringAsync(targetPath, content);
    await Sharing.shareAsync(targetPath);
  }, []);

  const persistCompletion = useCallback(async () => {
    if (!profile) {
      return;
    }

    await Promise.allSettled([
      supabase
        .from('daily_sadhana')
        .upsert({ user_id: profile.userId, date: today, dharmveer_done: true }, { onConflict: 'user_id,date' }),
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
