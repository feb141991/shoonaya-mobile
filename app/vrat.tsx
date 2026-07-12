import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
const isExpoGo = Constants.appOwnership === 'expo';
const Notifications = isExpoGo ? null : (() => { try { return require('expo-notifications'); } catch { return null; } })();

import { calculatePanchang, getTithiReminder, type TithiReminder } from '@sangam/panchang-engine';

import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, TYPE } from '@/lib/constants';
import { VRAT_DATABASE, lookupVratData, type VratData } from '@/lib/vrat-data';
import { supabase } from '@/lib/supabase';

type Tradition = 'all' | 'hindu' | 'sikh' | 'buddhist' | 'jain';

const TRADITION_FILTERS: Tradition[] = ['all', 'hindu', 'sikh', 'buddhist', 'jain'];

type ProfileGeoState = {
  lat: number;
  lon: number;
  timezone: string;
  tradition: string | null;
};

// Default anchor (Ujjain — same fallback native's Panchang screen already
// uses) when a user has no saved location yet.
const DEFAULT_GEO: ProfileGeoState = {
  lat: 23.1765,
  lon: 75.7885,
  timezone: 'Asia/Kolkata',
  tradition: null,
};

type UpcomingVrat = {
  date: string;
  slug: string;
  vratData: VratData;
};

// Maps a live-calculated tithi index (from @sangam/panchang-engine) to the
// matching recurring VRAT_DATABASE key. Kept in exact sync with the index
// checks inside that package's own `getTithiReminder` so "today is special"
// and "which vrat card to highlight" never disagree.
function tithiIndexToVratId(tithiIndex: number, tradition: string | null | undefined): string | null {
  if (tithiIndex === 11 || tithiIndex === 26) return 'ekadashi';
  if (tithiIndex === 15) return 'purnima';
  if (tithiIndex === 30) return 'amavasya';
  const t = tradition ?? 'hindu';
  if ((tithiIndex === 13 || tithiIndex === 28) && (t === 'hindu' || t === 'shaiva' || t === 'vaishnava')) return 'pradosh';
  if (tithiIndex === 4 || tithiIndex === 19) return 'chaturthi';
  if (tithiIndex === 29 && (t === 'hindu' || t === 'shaiva')) return 'shivaratri';
  return null;
}

function vratMatchesTradition(vrat: VratData, tradition: Tradition) {
  if (tradition === 'all') {
    return true;
  }

  const source = `${vrat.significance} ${vrat.practice} ${vrat.mantra}`.toLowerCase();
  if (tradition === 'hindu') return true;
  if (tradition === 'sikh') return source.includes('gurbani') || source.includes('waheguru');
  if (tradition === 'buddhist') return source.includes('buddha') || source.includes('metta');
  if (tradition === 'jain') return source.includes('jain') || source.includes('tirthankara') || source.includes('paryushana');
  return false;
}

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export default function VratScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [selectedTradition, setSelectedTradition] = useState<Tradition>('all');
  const [selectedVrat, setSelectedVrat] = useState<VratData | null>(null);
  const [geo, setGeo] = useState<ProfileGeoState>(DEFAULT_GEO);
  const [upcomingVrats, setUpcomingVrats] = useState<UpcomingVrat[]>([]);
  const [upcomingError, setUpcomingError] = useState(false);

  // ── Vrat observation tracker — mirrors web's VratClient.tsx (same
  // GET/POST /api/vrat/observe contract, same karma-award behavior). ────────
  const [observedToday, setObservedToday] = useState(false);
  const [observeCount, setObserveCount] = useState(0);
  const [observeLoading, setObserveLoading] = useState(false);
  const [observeStatusLoaded, setObserveStatusLoaded] = useState(false);

  const theme = useMemo(
    () => ({
      bg: isDark ? COLORS.darkBg : COLORS.creamBg,
      card: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
      border: isDark ? COLORS.borderDark : COLORS.borderLight,
      text: isDark ? COLORS.creamBg : COLORS.ink,
      dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
    }),
    [isDark]
  );

  const loadProfileGeo = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('latitude, longitude, timezone, tradition')
      .eq('id', user.id)
      .single();

    setGeo({
      lat: profile?.latitude ?? DEFAULT_GEO.lat,
      lon: profile?.longitude ?? DEFAULT_GEO.lon,
      timezone: profile?.timezone ?? DEFAULT_GEO.timezone,
      tradition: profile?.tradition ?? null,
    });
  }, [router]);

  useEffect(() => {
    setLoading(true);
    loadProfileGeo().finally(() => setLoading(false));
  }, [loadProfileGeo]);

  // Canonical upcoming observances — same endpoint app/panchang.tsx already
  // uses. Filter to kind === 'vrat' and resolve each slug back to the rich
  // local VratData (VRAT_DATABASE / NAMED_VRAT_DATABASE) via lookupVratData
  // (already handles both direct-key and alias lookups), so dates are
  // live/real but the descriptive content stays the same trusted local copy.
  // Runs independently of the profile/auth load, so switching the tradition
  // filter only refreshes this list, not the whole screen.
  useEffect(() => {
    let cancelled = false;

    apiFetch(
      `/api/calendar/upcoming?days=60&tradition=${selectedTradition}&tz=${encodeURIComponent(geo.timezone)}`
    )
      .then(async (response) => {
        if (!response.ok) throw new Error('upcoming fetch failed');
        const payload = (await response.json()) as {
          observances?: Array<{ date: string; slug: string; kind: string }>;
        };
        const resolved = (payload.observances ?? [])
          .filter((observance) => observance.kind === 'vrat')
          .map((observance) => {
            const vratData = lookupVratData(observance.slug);
            return vratData ? { date: observance.date, slug: observance.slug, vratData } : null;
          })
          .filter((entry): entry is UpcomingVrat => entry !== null);
        if (!cancelled) {
          setUpcomingVrats(resolved);
          setUpcomingError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setUpcomingError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTradition, geo.timezone]);

  const panchangToday = useMemo(
    () => calculatePanchang(new Date(), geo.lat, geo.lon, geo.timezone),
    [geo.lat, geo.lon, geo.timezone]
  );

  const todayReminder: TithiReminder | null = useMemo(
    () => getTithiReminder(panchangToday.tithiIndex, geo.tradition),
    [panchangToday.tithiIndex, geo.tradition]
  );

  const todayVrat: VratData | null = useMemo(() => {
    const vratId = tithiIndexToVratId(panchangToday.tithiIndex, geo.tradition);
    return vratId ? (VRAT_DATABASE[vratId] ?? null) : null;
  }, [panchangToday.tithiIndex, geo.tradition]);

  const vrats = useMemo(
    () => Object.values(VRAT_DATABASE).filter((vrat) => vratMatchesTradition(vrat, selectedTradition)),
    [selectedTradition]
  );

  useEffect(() => {
    if (!selectedVrat) {
      setObservedToday(false);
      setObserveCount(0);
      setObserveStatusLoaded(false);
      return;
    }

    let cancelled = false;
    setObserveStatusLoaded(false);

    apiFetch(`/api/vrat/observe?vrat_id=${encodeURIComponent(selectedVrat.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setObservedToday(Boolean(data.observed_today));
        setObserveCount(data.total_count ?? 0);
      })
      .catch(() => {
        // Silently ignore — tracker is non-critical, mirrors web behavior.
      })
      .finally(() => {
        if (!cancelled) setObserveStatusLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedVrat]);

  const handleObserve = async () => {
    if (!selectedVrat || observedToday || observeLoading) {
      return;
    }

    setObserveLoading(true);
    try {
      const res = await apiFetch('/api/vrat/observe', {
        method: 'POST',
        body: JSON.stringify({ vrat_id: selectedVrat.id, vrat_name: selectedVrat.name }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setObservedToday(true);
        setObserveCount((count) => count + (data.already_observed ? 0 : 1));
        if (!data.already_observed && data.karma_earned > 0) {
          Alert.alert(`🙏 Vrat observed! +${data.karma_earned} karma`);
        } else {
          Alert.alert('Vrat observed');
        }
      } else {
        Alert.alert('Could not record observation');
      }
    } catch {
      Alert.alert('Could not record observation');
    } finally {
      setObserveLoading(false);
    }
  };

  const setReminder = async (vrat: VratData) => {
    if (!Notifications) {
      Alert.alert('Reminders not available in Expo Go. Use the full app.');
      return;
    }
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Notifications are required for reminders');
      return;
    }

    const now = new Date();
    const triggerDate = new Date(now);
    triggerDate.setHours(6, 0, 0, 0);
    if (triggerDate <= now) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${vrat.emoji} ${vrat.name} reminder`,
        body: vrat.tagline,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    Alert.alert('Reminder scheduled');
  };

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.brandGold} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
        <BackButton />

        <Text style={{ color: theme.text, ...TYPE.screenTitle }}>Vrat</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {TRADITION_FILTERS.map((tradition) => {
            const active = selectedTradition === tradition;
            return (
              <PressableSurface
                key={tradition}
                onPress={() => setSelectedTradition(tradition)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Filter by ${tradition}`}
                haptic="selection"
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? COLORS.brandGold : theme.border,
                  backgroundColor: active ? COLORS.brandGold : theme.card,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: active ? COLORS.ink : theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                  {tradition.toUpperCase()}
                </Text>
              </PressableSurface>
            );
          })}
        </ScrollView>

        {!selectedVrat && (
          <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 10 }}>
            <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Today</Text>
            {todayReminder && todayVrat ? (
              <PressableSurface onPress={() => setSelectedVrat(todayVrat)} haptic="selection" style={{ gap: 4 }}>
                <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.serifBold, fontSize: 20 }}>
                  {todayReminder.title}
                </Text>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 20 }}>
                  {todayReminder.body}
                </Text>
              </PressableSurface>
            ) : (
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14 }}>
                No special observance today — browse below or check what&apos;s coming up.
              </Text>
            )}
          </Card>
        )}

        {!selectedVrat && upcomingVrats.length > 0 && (
          <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 10 }}>
            <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Upcoming</Text>
            {upcomingVrats.slice(0, 5).map((upcoming) => (
              <PressableSurface
                key={`${upcoming.slug}-${upcoming.date}`}
                onPress={() => setSelectedVrat(upcoming.vratData)}
                haptic="selection"
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
              >
                <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 14 }}>
                  {upcoming.vratData.emoji} {upcoming.vratData.name}
                </Text>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13 }}>{upcoming.date}</Text>
              </PressableSurface>
            ))}
          </Card>
        )}

        {!selectedVrat && upcomingError && (
          <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, textAlign: 'center' }}>
            Unable to load upcoming dates right now — showing the full observance list below.
          </Text>
        )}

        {selectedVrat ? (
          <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 28 }}>
                  {selectedVrat.emoji} {selectedVrat.name}
                </Text>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14, marginTop: 4 }}>
                  {selectedVrat.tagline}
                </Text>
              </View>
              <PressableSurface onPress={() => setSelectedVrat(null)} haptic="selection" hitSlop={10}>
                <Feather name="x" size={18} color={theme.dim} />
              </PressableSurface>
            </View>

            <View style={{ gap: 12 }}>
              <Text style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 24 }}>
                {selectedVrat.significance}
              </Text>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>How to observe</Text>
              <Text style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 24 }}>
                {selectedVrat.practice}
              </Text>
              {selectedVrat.breakFastTime ? (
                <>
                  <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Duration</Text>
                  <Text style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 15 }}>{selectedVrat.breakFastTime}</Text>
                </>
              ) : null}
              <PressableSurface
                onPress={() => {
                  void setReminder(selectedVrat);
                }}
                style={{
                  borderRadius: 18,
                  backgroundColor: COLORS.brandGold,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Set reminder</Text>
              </PressableSurface>

              {observedToday ? (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 8,
                    borderRadius: 18,
                    borderWidth: 1.5,
                    borderColor: COLORS.successBorder,
                    backgroundColor: COLORS.successBg,
                    paddingVertical: 14,
                  }}
                >
                  <Feather name="check-circle" size={18} color={COLORS.success} />
                  <Text style={{ color: COLORS.success, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
                    Observed today ✓{observeCount > 1 ? `  (${observeCount}× total)` : ''}
                  </Text>
                </View>
              ) : (
                <PressableSurface
                  onPress={() => {
                    void handleObserve();
                  }}
                  disabled={observeLoading || !observeStatusLoaded}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.card,
                    paddingVertical: 14,
                    alignItems: 'center',
                    opacity: observeLoading || !observeStatusLoaded ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
                    🙏 Mark as Observed{observeCount > 0 ? `  (${observeCount}× before)` : ''}
                  </Text>
                </PressableSurface>
              )}
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, textAlign: 'center' }}>
                {observedToday ? 'Your practice is recorded' : 'Earn 25 karma for completing this vrat'}
              </Text>
            </View>
          </Card>
        ) : (
          vrats.map((vrat) => (
            <PressableSurface key={vrat.id} onPress={() => setSelectedVrat(vrat)} haptic="selection">
              <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 8 }}>
                <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 24 }}>
                  {vrat.emoji} {vrat.name}
                </Text>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14 }}>{vrat.tagline}</Text>
              </Card>
            </PressableSurface>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
