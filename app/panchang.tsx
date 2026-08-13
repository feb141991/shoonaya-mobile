import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { WhyTodayModal } from '@/components/calendar/WhyTodayModal';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS } from '@/lib/constants';
import { calculatePanchang, type PanchangData } from '@sangam/panchang-engine';
import { supabase } from '@/lib/supabase';
import { RASHI_MAP } from '@/lib/jyotish';
import { isGuestMode } from '@/lib/guestSession';

// ── Panchang — rebuilt to match PWA's src/app/(main)/panchang/today/
// PanchangDetail.tsx living-sky design (sky-phase gradient, glow orb,
// twinkling stars, glass rows, info tooltips) instead of the flat card list
// this screen previously had. This is a fixed atmospheric treatment, same
// idea as Home's gold Sadhana CTA card (see index.tsx comment) — PWA renders
// this page identically regardless of the site's light/dark toggle, so
// native intentionally doesn't theme-switch it either. The Rashiphala/
// Kundali entry points and the day strip are native-only additions (PWA
// splits those into a separate /panchang hub page); kept here since a single
// consolidated screen is the better shape for a stacked native route.

type Tradition = 'hindu' | 'sikh' | 'buddhist' | 'jain' | 'all';

type UpcomingFestival = {
  date: string;
  slug: string;
  display_name: string;
  emoji: string;
  kind: 'major' | 'vrat' | 'regional';
  tradition: Tradition;
  status?: 'resolved' | 'ambiguous' | 'unresolved';
  alternatives?: any[];
  monthLabel?: { formattedLabel: string; isDivergentFromRuleDefault?: boolean } | null;
  description?: string | null;
  reasons?: Array<{ label: string; description: string }>;
  diagnostics?: string[];
  sourceRefs?: Array<{ title: string; tier?: string; citation?: string | null }>;
};

type PanchangState = {
  lat: number;
  lon: number;
  timezone: string;
  tradition: Tradition;
  rashi: string | null;
  city: string;
};

const INITIAL_STATE: PanchangState = {
  lat: 23.1765,
  lon: 75.7885,
  timezone: 'Asia/Kolkata',
  tradition: 'hindu',
  rashi: null,
  city: '',
};

const CREAM = COLORS.creamBg;
const GOLD = COLORS.brandGoldDark;

const TRADITION_META: Record<string, { badge: string; accent: string }> = {
  hindu: { badge: 'Vedic', accent: COLORS.brandPrimaryStrongLight },
  sikh: { badge: 'Nanakshahi', accent: COLORS.navy },
  buddhist: { badge: 'Buddhist', accent: COLORS.brandEarthLight },
  jain: { badge: 'Jain', accent: COLORS.sage },
};

type SkyPhase = 'night' | 'predawn' | 'dawn' | 'morning' | 'afternoon' | 'dusk' | 'evening';

function parseSunTime(timeStr: string): number {
  const [time, period] = timeStr.split(' ');
  const [h, m] = time.split(':').map(Number);
  let hours = h;
  if (period === 'PM' && h !== 12) hours += 12;
  if (period === 'AM' && h === 12) hours = 0;
  return hours * 60 + (m || 0);
}

function getSkyPhase(nowMin: number, sunriseMin: number, sunsetMin: number): SkyPhase {
  if (nowMin < sunriseMin - 60) return 'night';
  if (nowMin < sunriseMin - 15) return 'predawn';
  if (nowMin < sunriseMin + 45) return 'dawn';
  if (nowMin < (sunriseMin + sunsetMin) / 2) return 'morning';
  if (nowMin < sunsetMin - 45) return 'afternoon';
  if (nowMin < sunsetMin + 45) return 'dusk';
  if (nowMin < sunsetMin + 120) return 'evening';
  return 'night';
}

// Adapted from the PWA living-sky idea, but warmed into the native
// Shoonaya ivory/sandalwood/gold palette so Panchang matches the rest of
// the app instead of reading as a separate blue-purple feature.
const SKY_GRADIENTS: Record<SkyPhase, [string, string, string]> = {
  night: [COLORS.darkBg, '#17100B', '#24170D'],
  predawn: ['#100B08', '#26170D', '#5F3A16'],
  dawn: ['#2A170D', '#9F6314', '#F6E8CF'],
  morning: ['#744817', COLORS.brandGoldLight, '#F6E8CF'],
  afternoon: ['#5F3A16', '#B97924', '#F5E8D4'],
  dusk: ['#2A170D', '#7A2F18', '#D4784A'],
  evening: ['#120C08', '#2C1C11', '#5F3A16'],
};

const SKY_ORB: Record<SkyPhase, { color: string; size: number; opacity: number }> = {
  night: { color: 'rgba(200,220,255,0.35)', size: 80, opacity: 0.9 },
  predawn: { color: 'rgba(180,160,220,0.25)', size: 64, opacity: 0.6 },
  dawn: { color: 'rgba(255,180,80,0.45)', size: 96, opacity: 0.8 },
  morning: { color: 'rgba(255,220,100,0.5)', size: 128, opacity: 0.9 },
  afternoon: { color: 'rgba(255,240,150,0.4)', size: 160, opacity: 0.7 },
  dusk: { color: 'rgba(255,120,50,0.5)', size: 144, opacity: 0.85 },
  evening: { color: 'rgba(220,100,60,0.3)', size: 96, opacity: 0.5 },
};

const PHASE_LABELS: Record<SkyPhase, string> = {
  night: 'Night', predawn: 'Pre-dawn', dawn: 'Dawn',
  morning: 'Morning', afternoon: 'Afternoon', dusk: 'Dusk', evening: 'Evening',
};

const INFO_TEXT: Record<string, string> = {
  Tithi: 'Lunar day (1–30). Each tithi has a presiding deity and governs which activities are auspicious.',
  Nakshatra: "Moon's mansion in 1 of 27 star-clusters. Your moon nakshatra shapes emotion, instinct, and timing.",
  Yoga: 'Sun + Moon combined longitude across 27 yogas. Indicates the overall quality and nature of the day.',
  Karana: 'Half of a tithi — the moon moves 6° per karana. Governs the finer timing within each tithi for rituals.',
  Vara: 'Vedic day of the week. Each day has a ruling planet and presiding deity who blesses related acts.',
  Sunrise: 'Calculated for your location. Brahma Muhurta starts 96 minutes before sunrise — the ideal waking time.',
  Sunset: 'Sandhya kaal — ideal for evening prayers, japa, and quiet reflection as day meets night.',
  'Brahma Muhurta': 'The sacred pre-dawn window — 96 to 48 minutes before sunrise. The best time for meditation, japa, and pranayama.',
  'Rahu Kaal': 'A 90-min daily window ruled by Rahu (shadow planet). Avoid starting new ventures or auspicious acts.',
  'Abhijit Muhurat': 'The most auspicious ~48-min window around solar noon. Ideal for important new beginnings.',
};

function isRealToday(date: Date) {
  return date.toDateString() === new Date().toDateString();
}

function buildDateRange(selectedDate: Date) {
  return Array.from({ length: 9 }, (_, index) => {
    const date = new Date(selectedDate);
    date.setDate(selectedDate.getDate() + index - 4);
    return date;
  });
}

function GlowOrb({ phase }: { phase: SkyPhase }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      pulse.setValue(0.6);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  const orb = SKY_ORB[phase];
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [orb.opacity * 0.75, orb.opacity] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: '3%',
        left: '50%',
        marginLeft: -orb.size / 2,
        width: orb.size,
        height: orb.size,
        borderRadius: orb.size / 2,
        backgroundColor: orb.color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

function Stars({ count = 20 }: { count?: number }) {
  const opacity = useRef(new Animated.Value(0.35)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.45);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }, (_, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: 1 + (i % 3),
            height: 1 + (i % 3),
            borderRadius: 2,
            backgroundColor: CREAM,
            opacity: opacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0.12 + (i % 4) * 0.04, 0.55 + (i % 3) * 0.1],
            }),
            left: `${(i * 37 + 7) % 97}%`,
            top: `${(i * 23 + 5) % 55}%`,
          }}
        />
      ))}
    </View>
  );
}

function GlassCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View
      style={[
        {
          borderRadius: 20,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.10)',
          backgroundColor: 'rgba(10,8,25,0.5)',
          padding: 16,
          gap: 10,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function PanchangRow({
  emoji, label, value, upto, warn, infoKey, isOpen, onToggleInfo,
}: {
  emoji: string; label: string; value: string; upto?: string; warn?: boolean;
  infoKey?: string; isOpen?: boolean; onToggleInfo?: () => void;
}) {
  return (
    <View>
      <Pressable
        onPress={onToggleInfo}
        disabled={!infoKey}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 14,
          backgroundColor: warn ? 'rgba(200,80,20,0.18)' : 'rgba(255,255,255,0.06)',
          borderWidth: 1,
          borderColor: warn ? 'rgba(200,80,20,0.3)' : 'rgba(255,255,255,0.08)',
        }}
      >
        <Text style={{ fontSize: 17, width: 22, textAlign: 'center' }}>{emoji}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
            {label}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: warn ? '#FDBA74' : CREAM }}>
              {value}
            </Text>
            {upto ? <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>upto {upto}</Text> : null}
          </View>
        </View>
        {infoKey ? (
          <View
            style={{
              width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
            }}
          >
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>i</Text>
          </View>
        ) : null}
      </Pressable>
      {infoKey && isOpen ? (
        <View
          style={{
            marginTop: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
            backgroundColor: 'rgba(8,6,22,0.65)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <Text style={{ fontFamily: FONTS.sans, fontSize: 11, lineHeight: 16, color: 'rgba(255,255,255,0.75)' }}>{INFO_TEXT[infoKey]}</Text>
        </View>
      ) : null}
    </View>
  );
}

const iconBtnStyle = {
  width: 40, height: 40, borderRadius: 20, alignItems: 'center' as const, justifyContent: 'center' as const,
  backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
};

export default function PanchangScreen() {
  const router = useRouter();
  const [profileState, setProfileState] = useState<PanchangState>(INITIAL_STATE);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [festivals, setFestivals] = useState<UpcomingFestival[]>([]);
  const [whyTodayFestival, setWhyTodayFestival] = useState<UpcomingFestival | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewedToday, setViewedToday] = useState(false);
  const [markingViewed, setMarkingViewed] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [showRashiPicker, setShowRashiPicker] = useState(false);
  const [savingRashi, setSavingRashi] = useState(false);
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  const [displayTz, setDisplayTz] = useState<'local' | 'ist'>('local');

  const loadPanchangContext = useCallback(async () => {
    if (await isGuestMode()) {
      // Guests browse Panchang with INITIAL_STATE's fallback location —
      // same defaults a signed-in user with no saved location gets. Only
      // the personal Rashi-save (guarded by `!userId` in saveRashi) and
      // "mark viewed" actions need an account; isGuest below gates the
      // latter with a real explanation instead of a misleading "check your
      // connection" error.
      setIsGuest(true);
      const festivalsResponse = await apiFetch(
        `/api/calendar/upcoming?days=14&tradition=${INITIAL_STATE.tradition}&tz=${encodeURIComponent(INITIAL_STATE.timezone)}`
      );
      if (festivalsResponse.ok) {
        const payload = (await festivalsResponse.json()) as { observances?: UpcomingFestival[] };
        setFestivals(payload.observances ?? []);
      }
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    setUserId(user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('latitude, longitude, timezone, tradition, rashi, city, neighbourhood')
      .eq('id', user.id)
      .single();

    const nextState: PanchangState = {
      lat: profile?.latitude ?? INITIAL_STATE.lat,
      lon: profile?.longitude ?? INITIAL_STATE.lon,
      timezone: profile?.timezone ?? INITIAL_STATE.timezone,
      tradition: (profile?.tradition ?? 'hindu') as Tradition,
      rashi: profile?.rashi ?? null,
      city: profile?.neighbourhood ?? profile?.city ?? '',
    };
    setProfileState(nextState);

    const [festivalsResponse, viewedResponse] = await Promise.all([
      apiFetch(
        `/api/calendar/upcoming?days=14&tradition=${nextState.tradition}&tz=${encodeURIComponent(nextState.timezone)}`
      ),
      apiFetch('/api/native/panchang-viewed').catch(() => null),
    ]);

    if (festivalsResponse.ok) {
      const payload = (await festivalsResponse.json()) as { observances?: UpcomingFestival[] };
      setFestivals(payload.observances ?? []);
    }

    if (viewedResponse?.ok) {
      const payload = (await viewedResponse.json()) as { viewedToday?: boolean };
      setViewedToday(Boolean(payload.viewedToday));
    }
  }, [router]);

  useEffect(() => {
    loadPanchangContext()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [loadPanchangContext]);

  const saveRashi = async (rashi: string) => {
    if (!userId || savingRashi) return;
    setSavingRashi(true);
    try {
      await supabase.from('profiles').update({ rashi }).eq('id', userId);
      setProfileState((prev) => ({ ...prev, rashi }));
      setShowRashiPicker(false);
    } finally {
      setSavingRashi(false);
    }
  };

  const markObserved = useCallback(async () => {
    if (viewedToday || markingViewed) return;

    if (isGuest) {
      setMarkError('Sign in to track your Panchang observances.');
      return;
    }

    setMarkingViewed(true);
    setMarkError(null);
    try {
      const response = await apiFetch('/api/native/panchang-viewed', { method: 'POST' });
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      setViewedToday(true);
    } catch {
      setMarkError('Could not save — check your connection and try again.');
    } finally {
      setMarkingViewed(false);
    }
  }, [viewedToday, markingViewed, isGuest]);

  const effectiveTimezone = displayTz === 'ist' ? 'Asia/Kolkata' : profileState.timezone;

  const panchang = useMemo<PanchangData>(
    () => calculatePanchang(selectedDate, profileState.lat, profileState.lon, effectiveTimezone),
    [profileState.lat, profileState.lon, effectiveTimezone, selectedDate]
  );

  const dateStrip = useMemo(() => buildDateRange(selectedDate), [selectedDate]);

  const now = useMemo(() => new Date(), []);
  const skyPhase = useMemo(() => {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const sunriseMin = parseSunTime(panchang.sunrise);
    const sunsetMin = parseSunTime(panchang.sunset);
    return getSkyPhase(nowMin, sunriseMin, sunsetMin);
  }, [now, panchang.sunrise, panchang.sunset]);

  const isNight = skyPhase === 'night' || skyPhase === 'predawn' || skyPhase === 'evening';
  const tradMeta = TRADITION_META[profileState.tradition] ?? TRADITION_META.hindu;
  const rashiObj = profileState.rashi ? RASHI_MAP[profileState.rashi.toLowerCase()] : null;

  const dateLabel = selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const share = useCallback(async () => {
    const text = `🪔 Panchang — ${dateLabel}\n\n` +
      `📅 Tithi: ${panchang.tithi} (${panchang.paksha} Paksha)\n` +
      `⭐ Nakshatra: ${panchang.nakshatra}\n🕉️ Yoga: ${panchang.yoga}\n📆 Vara: ${panchang.vara}\n` +
      `🌅 Sunrise: ${panchang.sunrise}  🌆 Sunset: ${panchang.sunset}\n` +
      `⚠️ Rahu Kaal: ${panchang.rahuKaal}\n✨ Abhijit Muhurat: ${panchang.abhijitMuhurat}\n\n— Shoonaya`;
    try {
      await Share.share({ message: text });
    } catch {
      // user cancelled or share sheet unavailable — no-op
    }
  }, [dateLabel, panchang]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.darkBg }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={GOLD} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: SKY_GRADIENTS[skyPhase][0] }} edges={['top']}>
      <LinearGradient colors={SKY_GRADIENTS[skyPhase]} style={StyleSheet.absoluteFill} />
      {isNight ? <Stars /> : null}
      <GlowOrb phase={skyPhase} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 110, gap: 12 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8} style={iconBtnStyle}>
            <Feather name="chevron-left" size={18} color={CREAM} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 22, color: CREAM }}>Panchang</Text>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: tradMeta.accent }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, color: COLORS.onMediaWhite }}>{tradMeta.badge}</Text>
              </View>
            </View>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
              {PHASE_LABELS[skyPhase]}{profileState.city ? ` · 📍 ${profileState.city}` : ''}
            </Text>
          </View>
          <Pressable accessibilityLabel="Share today's Panchang" onPress={share} hitSlop={8} style={iconBtnStyle}>
            <Feather name="share-2" size={16} color={CREAM} />
          </Pressable>
        </View>

        {profileState.timezone && profileState.timezone !== 'Asia/Kolkata' ? (
          <Pressable
            onPress={() => setDisplayTz((t) => (t === 'local' ? 'ist' : 'local'))}
            style={{
              alignSelf: 'flex-start', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6,
              borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
              backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            <Text style={{ fontSize: 10, fontFamily: FONTS.sansSemiBold, color: displayTz === 'local' ? GOLD : 'rgba(255,255,255,0.6)' }}>Your time</Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>↔</Text>
            <Text style={{ fontSize: 10, fontFamily: FONTS.sansSemiBold, color: displayTz === 'ist' ? GOLD : 'rgba(255,255,255,0.6)' }}>IST</Text>
          </Pressable>
        ) : null}

        {/* Date strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
          {dateStrip.map((date) => {
            const active = date.toDateString() === selectedDate.toDateString();
            return (
              <Pressable
                key={date.toISOString()}
                onPress={() => setSelectedDate(date)}
                style={{
                  minWidth: 56, borderRadius: 16, paddingVertical: 9, paddingHorizontal: 12, alignItems: 'center', gap: 2,
                  minHeight: 44,
                  backgroundColor: active ? GOLD : 'rgba(255,255,255,0.08)',
                  borderWidth: 1, borderColor: active ? GOLD : 'rgba(255,255,255,0.12)',
                }}
              >
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, color: active ? COLORS.heroBgDark : 'rgba(255,255,255,0.5)' }}>
                  {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                </Text>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: active ? COLORS.heroBgDark : CREAM }}>
                  {date.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Paksha banner */}
        <View
          style={{
            borderRadius: 18, paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 12,
            backgroundColor: `${tradMeta.accent}CC`, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <Text style={{ fontSize: 22 }}>🪔</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>
              {panchang.paksha} Paksha · {panchang.masaName}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontFamily: FONTS.sans, fontSize: 11, marginTop: 2 }}>
              {panchang.vara} · {panchang.samvatYear} {panchang.samvatName}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: FONTS.sansSemiBold }}>{panchang.sunrise}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontFamily: FONTS.sans, fontSize: 10 }}>sunrise</Text>
          </View>
        </View>

        {isRealToday(selectedDate) ? (
          viewedToday ? (
            <View
              accessible
              accessibilityLabel="Today's Panchang marked as observed"
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14,
                borderRadius: 14, backgroundColor: 'rgba(197,160,89,0.15)', borderWidth: 1, borderColor: 'rgba(197,160,89,0.3)',
                alignSelf: 'flex-start',
              }}
            >
              <Feather name="check-circle" size={16} color={GOLD} />
              <Text style={{ color: GOLD, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Observed today</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <PressableSurface
                accessibilityLabel="Mark today's Panchang as observed"
                onPress={markObserved}
                disabled={markingViewed}
                style={{
                  minHeight: 48, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'center', gap: 8, backgroundColor: GOLD,
                }}
              >
                {markingViewed ? (
                  <ActivityIndicator color={COLORS.heroBgDark} />
                ) : (
                  <>
                    <Feather name="check" size={16} color={COLORS.heroBgDark} />
                    <Text style={{ color: COLORS.heroBgDark, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>
                      Mark today&apos;s Panchang as observed
                    </Text>
                  </>
                )}
              </PressableSurface>
              {markError ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.sans, fontSize: 12, flex: 1 }}>{markError}</Text>
                  <Pressable onPress={markObserved} hitSlop={8}>
                    <Text style={{ color: GOLD, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Retry</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          )
        ) : null}

        {/* Tithi / Nakshatra / Yoga / Karana / Vara */}
        <GlassCard>
          <PanchangRow emoji="⏳" label="Tithi (Lunar Day)" value={panchang.tithi} upto={panchang.tithiUpto} infoKey="Tithi" isOpen={openInfo === 'Tithi'} onToggleInfo={() => setOpenInfo((k) => (k === 'Tithi' ? null : 'Tithi'))} />
          <PanchangRow emoji="🌙" label="Paksha (Moon Phase)" value={`${panchang.paksha} Paksha`} />
          <PanchangRow emoji="⭐" label="Nakshatra (Star Mansion)" value={panchang.nakshatra} upto={panchang.nakshatraUpto} infoKey="Nakshatra" isOpen={openInfo === 'Nakshatra'} onToggleInfo={() => setOpenInfo((k) => (k === 'Nakshatra' ? null : 'Nakshatra'))} />
          <PanchangRow emoji="🕉️" label="Yoga (Alignment)" value={panchang.yoga} upto={panchang.yogaUpto} infoKey="Yoga" isOpen={openInfo === 'Yoga'} onToggleInfo={() => setOpenInfo((k) => (k === 'Yoga' ? null : 'Yoga'))} />
          <PanchangRow emoji="⚙️" label="Karana (Half-Tithi)" value={panchang.karana} upto={panchang.karanaUpto} infoKey="Karana" isOpen={openInfo === 'Karana'} onToggleInfo={() => setOpenInfo((k) => (k === 'Karana' ? null : 'Karana'))} />
          <PanchangRow emoji="📅" label="Vara (Weekday)" value={panchang.vara} infoKey="Vara" isOpen={openInfo === 'Vara'} onToggleInfo={() => setOpenInfo((k) => (k === 'Vara' ? null : 'Vara'))} />
        </GlassCard>

        {/* Daily timings */}
        <GlassCard>
          <Text style={{ fontSize: 10, fontFamily: FONTS.sansSemiBold, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.35)' }}>
            Daily Timings
          </Text>
          <PanchangRow emoji="🌅" label="Sunrise" value={panchang.sunrise} infoKey="Sunrise" isOpen={openInfo === 'Sunrise'} onToggleInfo={() => setOpenInfo((k) => (k === 'Sunrise' ? null : 'Sunrise'))} />
          <PanchangRow emoji="🌆" label="Sunset" value={panchang.sunset} infoKey="Sunset" isOpen={openInfo === 'Sunset'} onToggleInfo={() => setOpenInfo((k) => (k === 'Sunset' ? null : 'Sunset'))} />
          <PanchangRow emoji="✨" label="Brahma Muhurta (Sacred)" value={panchang.brahmaMuhurta} infoKey="Brahma Muhurta" isOpen={openInfo === 'Brahma Muhurta'} onToggleInfo={() => setOpenInfo((k) => (k === 'Brahma Muhurta' ? null : 'Brahma Muhurta'))} />
          <PanchangRow emoji="☀️" label="Abhijit Muhurat (Auspicious)" value={panchang.abhijitMuhurat} infoKey="Abhijit Muhurat" isOpen={openInfo === 'Abhijit Muhurat'} onToggleInfo={() => setOpenInfo((k) => (k === 'Abhijit Muhurat' ? null : 'Abhijit Muhurat'))} />
          <PanchangRow emoji="⚠️" label="Rahu Kaal (Avoid Starts)" value={panchang.rahuKaal} warn infoKey="Rahu Kaal" isOpen={openInfo === 'Rahu Kaal'} onToggleInfo={() => setOpenInfo((k) => (k === 'Rahu Kaal' ? null : 'Rahu Kaal'))} />
        </GlassCard>

        {/* Guidance footer */}
        <View style={{ borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(255,200,100,0.08)', borderWidth: 1, borderColor: 'rgba(255,200,100,0.15)' }}>
          <Text style={{ fontFamily: FONTS.sans, fontSize: 12, lineHeight: 18, color: 'rgba(253,230,180,0.85)' }}>
            <Text style={{ fontFamily: FONTS.sansSemiBold, color: '#FDE6B4' }}>Today&apos;s guidance: </Text>
            {panchang.paksha === 'Shukla'
              ? 'Shukla Paksha — auspicious for new beginnings, prayers, and blessings. Act and grow.'
              : 'Krishna Paksha — quiet reflection. Focus on purification, ancestral gratitude, and inward practices.'}
          </Text>
        </View>

        {/* Your Rashiphala */}
        <GlassCard style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
          <PressableSurface
            accessibilityLabel="Open your Rashiphala reading"
            onPress={() => router.push('/rashiphala')}
            style={{ minHeight: 0, flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 24 }}>{rashiObj ? rashiObj.symbol : '✨'}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: CREAM, fontFamily: FONTS.serifBold, fontSize: 19 }}>Your Rashiphala</Text>
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.sans, fontSize: 13 }}>
                {rashiObj ? (
                  <Text><Text style={{ fontFamily: FONTS.sansSemiBold, color: CREAM }}>{rashiObj.sa}</Text> · Today&apos;s reading</Text>
                ) : (
                  <Text style={{ fontStyle: 'italic' }}>Set your Rashi below to personalise</Text>
                )}
              </Text>
              <Text style={{ color: GOLD, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
                Daily · Weekly · Monthly
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
          </PressableSurface>

          {(showRashiPicker || !profileState.rashi) && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: GOLD, fontFamily: FONTS.sansSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {profileState.rashi ? 'Change your Rashi' : '✦ Set your Rashi for personalised readings'}
                </Text>
                {profileState.rashi && showRashiPicker && (
                  <Pressable onPress={() => setShowRashiPicker(false)}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.sans, fontSize: 12, textDecorationLine: 'underline' }}>Cancel</Text>
                  </Pressable>
                )}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(RASHI_MAP).map(([key, r]) => {
                  const isSelected = profileState.rashi === key;
                  return (
                    <Pressable
                      key={key}
                      disabled={savingRashi}
                      onPress={() => saveRashi(key)}
                      style={{
                        width: '23%', alignItems: 'center', justifyContent: 'center', paddingVertical: 12,
                        minHeight: 64,
                        borderRadius: 12, borderWidth: 1,
                        backgroundColor: isSelected ? 'rgba(197,160,89,0.18)' : 'rgba(255,255,255,0.05)',
                        borderColor: isSelected ? GOLD : 'rgba(255,255,255,0.1)',
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>{r.symbol}</Text>
                      <Text style={{ marginTop: 6, color: isSelected ? GOLD : 'rgba(255,255,255,0.5)', fontFamily: FONTS.sansSemiBold, fontSize: 10 }}>{r.en}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {profileState.rashi && !showRashiPicker && (
          <Pressable onPress={() => setShowRashiPicker(true)} hitSlop={8} style={{ paddingBottom: 16, alignItems: 'center', minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.sans, fontSize: 11, textDecorationLine: 'underline' }}>Change Rashi</Text>
            </Pressable>
          )}
        </GlassCard>

        {/* Kundali entry */}
        <GlassCard style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
          <PressableSurface
            accessibilityLabel="Generate your Vedic Kundali birth chart"
            onPress={() => router.push('/kundali')}
            style={{ minHeight: 0, flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 24 }}>🛕</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: CREAM, fontFamily: FONTS.serifBold, fontSize: 19 }}>Vedic Kundali</Text>
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.sans, fontSize: 13 }}>Generate your birth chart</Text>
            </View>
            <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
          </PressableSurface>
        </GlassCard>

        {/* Upcoming festivals */}
        <GlassCard>
          <Text style={{ color: CREAM, fontFamily: FONTS.serifBold, fontSize: 19 }}>Upcoming festivals</Text>
          {festivals.length === 0 ? (
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.sans, fontSize: 13 }}>No upcoming observances loaded.</Text>
          ) : (
            festivals.slice(0, 8).map((festival) => (
              <PressableSurface
                key={`${festival.date}-${festival.slug}`}
                onPress={() => setWhyTodayFestival(festival)}
                accessibilityLabel={`Why ${festival.display_name} is on ${festival.date}`}
                style={{
                  borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.05)',
                  padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: CREAM, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>
                    {festival.emoji} {festival.display_name}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.45)', fontFamily: FONTS.sans, fontSize: 11, marginTop: 2 }}>
                    {festival.status === 'unresolved'
                      ? 'Date under review'
                      : festival.monthLabel
                        ? `${festival.date} · ${festival.monthLabel.formattedLabel}`
                        : festival.date}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ color: GOLD, fontFamily: FONTS.sansSemiBold, fontSize: 10 }}>{festival.kind.toUpperCase()}</Text>
                  {festival.status === 'unresolved' && (
                    <Text style={{ color: GOLD, fontFamily: FONTS.sansSemiBold, fontSize: 9 }}>UNDER REVIEW</Text>
                  )}
                  {festival.status !== 'unresolved' && festival.alternatives && festival.alternatives.length > 0 && (
                    <Text style={{ color: GOLD, fontFamily: FONTS.sansSemiBold, fontSize: 9 }}>VARIANTS</Text>
                  )}
                </View>
              </PressableSurface>
            ))
          )}
        </GlassCard>

        <WhyTodayModal
          visible={!!whyTodayFestival}
          observance={whyTodayFestival}
          onClose={() => setWhyTodayFestival(null)}
        />

        <View style={{
          borderRadius: 14,
          padding: 12,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.15)',
          backgroundColor: 'rgba(255,255,255,0.04)',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginTop: 12,
          marginBottom: 16,
        }}>
          <Feather name="globe" size={16} color="rgba(255,255,255,0.6)" style={{ flexShrink: 0 }} />
          <Text style={{ flex: 1, color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.sans, fontSize: 11, lineHeight: 16 }}>
            Observance dates and timings depend on tradition and location. Verify calculations locally.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
