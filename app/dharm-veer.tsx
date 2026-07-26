import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { BackButton } from '@/components/ui/BackButton';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { DharmVeerPoster } from '@/components/dharm-veer/DharmVeerPoster';
import { ShoonayaShareCard } from '@/components/share/ShoonayaShareCard';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS } from '@/lib/constants';
import { selectDharmVeerOfTheDayFromRoster, DHARM_VEERS, type DharmVeer } from '@/lib/dharm-veer';
import { shareCapturedShoonayaCard } from '@/lib/share-card';
import { spiritualDate } from '@/lib/spiritualDate';
import { supabase } from '@/lib/supabase';
import { isGuestMode } from '@/lib/guestSession';
import { AuthGate } from '@/components/ui/AuthGate';

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
  const dharmVeerShareCardRef = useRef<View>(null);
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const [isGuest, setIsGuest] = useState(false);
  const [authGateVisible, setAuthGateVisible] = useState(false);
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
  const [shareHeroData, setShareHeroData] = useState<DharmVeer | null>(null);
  const [journeyExpanded, setJourneyExpanded] = useState(false);
  // Check-in (mood/intention/privacy) is only asked after an "inspired"
  // swipe — no point prompting for a written reflection on a hero the user
  // is about to skip. Holds the hero+decision so the modal keeps working
  // with the right card even after dayProgress advances past it.
  const [pendingCheckIn, setPendingCheckIn] = useState<{ hero: DharmVeer; decision: SwipeDecision } | null>(null);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const textDim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const surface = isDark ? COLORS.darkBg : COLORS.creamBg;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;

  const today = useMemo(() => spiritualDate(profile?.timezone ?? 'UTC'), [profile?.timezone]);
  const storageKey = useMemo(() => `shoonaya-dharm-veer-mobile-${today}`, [today]);
  const deck = useMemo(() => buildDailyDeck(profile?.tradition ?? 'hindu', roster), [profile?.tradition, roster]);
  const visibleCards = useMemo(
    () => deck.filter((hero) => !dayProgress.seenIds.includes(hero.id)),
    [deck, dayProgress.seenIds]
  );
  const currentHero = visibleCards[currentIndex] ?? null;

  useEffect(() => {
    setJourneyExpanded(false);
  }, [currentHero?.id]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const loadState = useCallback(async () => {
    const guest = await isGuestMode();
    setIsGuest(guest);

    if (guest) {
      const tradition: Tradition = 'hindu';
      const timezone = 'UTC';
      const resolvedToday = spiritualDate(timezone);
      const localKey = `shoonaya-dharm-veer-mobile-${resolvedToday}`;
      const storedValue = await AsyncStorage.getItem(localKey);
      const parsed = storedValue ? (JSON.parse(storedValue) as ProgressSnapshot) : null;

      setProfile({ userId: 'guest', tradition, timezone });
      setDayProgress({
        done: Boolean(parsed?.done),
        seenIds: parsed?.seenIds ?? [],
      });
      setRoster(DHARM_VEERS);
      setRosterError(false);
      setCurrentIndex(0);
      return;
    }

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
    setShareHeroData(hero);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await shareCapturedShoonayaCard(dharmVeerShareCardRef, {
      fileName: `shoonaya-dharm-veer-${hero.id}.png`,
      dialogTitle: 'Share Dharm Veer',
      fallbackMessage: `${hero.name} — ${hero.tagline}`,
    });
  }, []);

  const persistCompletion = useCallback(async () => {
    if (!profile) {
      return;
    }

    // daily_sadhana.dharmveer_done is now kept in sync server-side by
    // POST /api/dharm-veer/submit (called per-swipe in submitSwipe below,
    // via the complete_dharmveer RPC there) — each swipe already carries
    // real evidence into dharm_veer_responses, which is what
    // /api/sadhana/perfect-day now actually trusts. This function no longer
    // needs its own direct RPC call; it only awards the flat completion
    // bonus once all three cards are seen.
    await apiFetch('/api/karma/award', {
      method: 'POST',
      body: JSON.stringify({ amount: 5, reason: 'dharm_veer' }),
    }).catch(() => null);
  }, [profile]);

  const submitSwipe = useCallback(
    async (
      hero: DharmVeer,
      decision: SwipeDecision,
      checkIn: { mood: typeof mood; intention: string; privacyCommunity: boolean }
    ) => {
      if (!profile) {
        return;
      }

      const nextSeen = Array.from(new Set([...dayProgress.seenIds, hero.id]));
      const nextDone = nextSeen.length >= MAX_DAILY_CARDS;

      setDayProgress({ done: nextDone, seenIds: nextSeen });
      setCurrentIndex(0);
      await AsyncStorage.setItem(storageKey, JSON.stringify({ done: nextDone, seenIds: nextSeen }));

      if (isGuest) {
        if (decision === 'share') {
          await shareHero(hero);
        }
        if (nextDone) {
          setAuthGateVisible(true);
        }
        return;
      }

      await apiFetch('/api/dharm-veer/submit', {
        method: 'POST',
        body: JSON.stringify({
          heroId: hero.id,
          decision,
          mood: checkIn.mood,
          intention: checkIn.intention,
          privacy: checkIn.privacyCommunity ? 'community' : 'private',
        }),
      }).catch(() => null);

      if (decision === 'share') {
        await shareHero(hero);
      }

      if (nextDone) {
        await persistCompletion();
      }
    },
    [dayProgress.seenIds, persistCompletion, isGuest, profile, shareHero, storageKey]
  );

  // Skip/share commit immediately with no check-in — only an "inspired"
  // swipe opens the reflection modal (see the Modal below), since that's
  // the only decision worth interrupting the swipe flow for.
  const finalizeGesture = useCallback(
    (decision: SwipeDecision) => {
      if (!currentHero || submitting) {
        return;
      }

      if (decision === 'inspired') {
        setPendingCheckIn({ hero: currentHero, decision });
        translateX.value = 0;
        translateY.value = 0;
        rotate.value = 0;
        opacity.value = 1;
        return;
      }

      setSubmitting(true);
      submitSwipe(currentHero, decision, { mood: 'gratitude', intention: '', privacyCommunity: false })
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

  const confirmCheckIn = useCallback(() => {
    if (!pendingCheckIn) {
      return;
    }
    setSubmitting(true);
    submitSwipe(pendingCheckIn.hero, pendingCheckIn.decision, { mood, intention, privacyCommunity })
      .catch(() => {
        Alert.alert("Could not save today's response");
      })
      .finally(() => {
        setSubmitting(false);
        setPendingCheckIn(null);
        setMood('gratitude');
        setIntention('');
        setPrivacyCommunity(false);
      });
  }, [intention, mood, pendingCheckIn, privacyCommunity, submitSwipe]);

  const skipCheckInNote = useCallback(() => {
    if (!pendingCheckIn) {
      return;
    }
    setSubmitting(true);
    submitSwipe(pendingCheckIn.hero, pendingCheckIn.decision, { mood: 'gratitude', intention: '', privacyCommunity: false })
      .catch(() => {
        Alert.alert("Could not save today's response");
      })
      .finally(() => {
        setSubmitting(false);
        setPendingCheckIn(null);
        setMood('gratitude');
        setIntention('');
        setPrivacyCommunity(false);
      });
  }, [pendingCheckIn, submitSwipe]);

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
          <ActivityIndicator color={brand} />
        </View>
      </Screen>
    );
  }

  if (rosterError) {
    return (
      <Screen style={{ backgroundColor: surface }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
          <BackButton variant="glass" />

          <Card style={{ backgroundColor: cardBg, borderColor: border, gap: 14 }}>
            <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 30 }}>Dharm Veer</Text>
            <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 24 }}>
              {"Unable to load today's profile. Check your connection and try again."}
            </Text>
            <PressableSurface
              haptic="selection"
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
                backgroundColor: brand,
              }}
            >
              <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Retry</Text>
            </PressableSurface>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  if (dayProgress.done || !currentHero) {
    return (
      <Screen style={{ backgroundColor: surface }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
          <BackButton variant="glass" />

          <Card style={{ backgroundColor: cardBg, borderColor: border, gap: 14 }}>
            <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 30 }}>Dharm Veer</Text>
            <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 24 }}>
              {"You have completed today's three hero cards. Come back tomorrow for a new set."}
            </Text>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: surface }}>
      {shareHeroData ? (
        <View
          pointerEvents="none"
          collapsable={false}
          style={{
            position: 'absolute',
            left: -420,
            top: 0,
            opacity: 0.01,
          }}
        >
          <ShoonayaShareCard
            ref={dharmVeerShareCardRef}
            data={{
              tradition: shareHeroData.tradition,
              headlineValue: shareHeroData.name,
              title: 'Dharm Veer',
              subtitle: `${shareHeroData.era} · ${shareHeroData.region}`,
              caption: shareHeroData.teaching || shareHeroData.tagline,
              footer: 'Shared from Shoonaya',
            }}
          />
        </View>
      ) : null}
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
        <BackButton variant="glass" />

        <View style={{ gap: 4 }}>
          <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 30 }}>Dharm Veer</Text>
          <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 14 }}>
            Card {dayProgress.seenIds.length + 1} of {MAX_DAILY_CARDS}
          </Text>
        </View>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={cardStyle}>
            <Card style={{ backgroundColor: cardBg, borderColor: border, gap: 16 }}>
              <DharmVeerPoster hero={currentHero} />

              <View style={{ gap: 4 }}>
                <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 28 }}>{currentHero.name}</Text>
                <Text style={{ color: brand, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>
                  {currentHero.emoji} {currentHero.tradition.toUpperCase()} · {currentHero.era}
                </Text>
              </View>

              <View>
                <Text
                  numberOfLines={journeyExpanded ? undefined : 6}
                  style={{ color: text, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 25 }}
                >
                  {currentHero.journey}
                </Text>
                {currentHero.journey.length > 300 ? (
                  <PressableSurface
                    haptic="selection"
                    onPress={() => setJourneyExpanded((value) => !value)}
                    style={{ marginTop: 6, minHeight: 0, alignSelf: 'flex-start' }}
                  >
                    <Text style={{ color: brand, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>
                      {journeyExpanded ? 'Read less' : 'Read more'}
                    </Text>
                  </PressableSurface>
                ) : null}
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: border, paddingTop: 14, gap: 6 }}>
                <Text style={{ color: brand, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Teaching</Text>
                <Text style={{ color: text, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 22 }}>{currentHero.teaching}</Text>
              </View>
            </Card>
          </Animated.View>
        </GestureDetector>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 13 }}>Swipe left to skip</Text>
          <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 13 }}>Swipe right if inspired</Text>
        </View>
        <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 13, textAlign: 'center' }}>Swipe up to share</Text>
      </ScrollView>

      <AuthGate
        visible={authGateVisible}
        onClose={() => setAuthGateVisible(false)}
        title="Dharm Veer"
        message="Sign in to save your responses and streaks for daily heroes."
      />

      <Modal transparent visible={!!pendingCheckIn} animationType="slide" onRequestClose={skipCheckInNote}>
        <View style={{ flex: 1, backgroundColor: COLORS.bottomSheetScrim, justifyContent: 'flex-end' }}>
          <View
            style={{
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: border,
              padding: 22,
              paddingBottom: 34,
              gap: 16,
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 52, height: 4, borderRadius: 999, backgroundColor: border }} />
            </View>

            <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 20 }}>
              {pendingCheckIn ? `What are you taking from ${pendingCheckIn.hero.name}?` : ''}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {(['gratitude', 'devotion', 'peace', 'courage'] as const).map((option) => {
                const active = mood === option;
                return (
                  <PressableSurface
                    key={option}
                    haptic="selection"
                    onPress={() => setMood(option)}
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderWidth: 1,
                      borderColor: active ? brand : border,
                      backgroundColor: active ? brand : cardBg,
                    }}
                  >
                    <Text style={{ color: active ? COLORS.ink : textDim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                      {option}
                    </Text>
                  </PressableSurface>
                );
              })}
            </View>

            <TextInput
              value={intention}
              onChangeText={setIntention}
              placeholder="A word or two (optional)"
              placeholderTextColor={textDim}
              multiline
              style={{
                minHeight: 80,
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
              <Switch value={privacyCommunity} onValueChange={setPrivacyCommunity} trackColor={{ true: brand }} />
            </View>

            <PressableSurface
              haptic="selection"
              onPress={confirmCheckIn}
              disabled={submitting}
              style={{
                borderRadius: 999,
                paddingVertical: 14,
                alignItems: 'center',
                backgroundColor: brand,
              }}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.ink} />
              ) : (
                <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Save & continue</Text>
              )}
            </PressableSurface>

            <PressableSurface haptic="selection" onPress={skipCheckInNote} disabled={submitting} style={{ alignItems: 'center', minHeight: 0 }}>
              <Text style={{ color: textDim, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Skip note</Text>
            </PressableSurface>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
