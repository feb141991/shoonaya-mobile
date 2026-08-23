import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';

import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, TYPE, RADII, themeColor } from '@/lib/constants';
import { VRAT_DATABASE, lookupVratData, type VratData } from '@/lib/vrat-data';
import type { ClientObservanceResult } from '@/lib/calendar-contract';
import { supabase } from '@/lib/supabase';
import { isGuestMode } from '@/lib/guestSession';
import {
  claimPromptForSession,
  getPromptDismissedAt,
  isPromptEligible,
  recordPromptDismissal,
} from '@/lib/progressiveProfiling';
import { trackProgressivePromptEvent } from '@/lib/progressiveProfilingAnalytics';
import { isConfirmedVratOccurrence } from '@/lib/vrat-observation';

type Tradition = 'all' | 'hindu' | 'sikh' | 'buddhist' | 'jain';

const TRADITION_FILTERS: Tradition[] = ['all', 'hindu', 'sikh', 'buddhist', 'jain'];

type ProfileGeoState = {
  lat: number;
  lon: number;
  timezone: string;
  tradition: string | null;
  appLanguage: string | null;
  meaningLanguage: string | null;
  calendarProfile: string | null;
  calendarScope: string | null;
};

const DEFAULT_GEO: ProfileGeoState = {
  lat: 23.1765,
  lon: 75.7885,
  timezone: 'Asia/Kolkata',
  tradition: 'hindu',
  appLanguage: 'en',
  meaningLanguage: 'en',
  calendarProfile: null,
  calendarScope: null,
};

type UpcomingVrat = {
  date: string;
  slug: string;
  vratData: VratData;
  observance: ClientObservanceResult;
};

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

export default function VratScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = themeColor(isDark);

  const [loading, setLoading] = useState(true);
  const [geo, setGeo] = useState<ProfileGeoState>(DEFAULT_GEO);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedTradition, setSelectedTradition] = useState<Tradition>('all');
  const [upcomingVrats, setUpcomingVrats] = useState<UpcomingVrat[]>([]);
  const [upcomingError, setUpcomingError] = useState(false);
  const [todayVratOccurrence, setTodayVratOccurrence] = useState<UpcomingVrat | null>(null);
  const [showCalendarPrompt, setShowCalendarPrompt] = useState(false);

  // ── Load User Profile ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const guest = await isGuestMode();
        if (guest) {
          if (!cancelled) setLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          if (!cancelled) setLoading(false);
          return;
        }

        if (!cancelled) setUserId(session.user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('lat, lon, timezone, tradition, app_language, meaning_language, calendar_profile, calendar_scope')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile && !cancelled) {
          setGeo({
            lat: profile.lat ?? DEFAULT_GEO.lat,
            lon: profile.lon ?? DEFAULT_GEO.lon,
            timezone: profile.timezone ?? DEFAULT_GEO.timezone,
            tradition: profile.tradition ?? DEFAULT_GEO.tradition,
            appLanguage: profile.app_language ?? DEFAULT_GEO.appLanguage,
            meaningLanguage: profile.meaning_language ?? DEFAULT_GEO.meaningLanguage,
            calendarProfile: profile.calendar_profile ?? null,
            calendarScope: profile.calendar_scope ?? null,
          });

          if (profile.tradition && ['hindu', 'sikh', 'buddhist', 'jain'].includes(profile.tradition)) {
            setSelectedTradition(profile.tradition as Tradition);
          }
        }
      } catch (err) {
        console.error('[Vrat] Profile load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Progressive Profiling Prompt Evaluation ─────────────────────────────
  useEffect(() => {
    if (!userId || loading) return;

    let cancelled = false;

    async function checkPrompt() {
      if (!userId) return;
      const dismissedAt = await getPromptDismissedAt(userId, 'calendar_setup');
      const isEligible = isPromptEligible({
        promptKey: 'calendar_setup',
        tradition: geo.tradition,
        profile: {
          calendar_profile: geo.calendarProfile,
          tradition: geo.tradition,
        },
        dismissedAtMs: dismissedAt,
      });

      if (!isEligible || cancelled) return;

      const claimed = claimPromptForSession(userId, 'calendar_setup');
      if (claimed && !cancelled) {
        setShowCalendarPrompt(true);
        trackProgressivePromptEvent('calendar_setup', 'shown');
      }
    }

    checkPrompt();

    return () => {
      cancelled = true;
    };
  }, [userId, loading, geo.calendarProfile, geo.tradition]);

  // ── Load Canonical Upcoming & Today Vrats from Server ─────────────────────
  useEffect(() => {
    let cancelled = false;
    setUpcomingError(false);

    const timezone = geo.timezone || 'Asia/Kolkata';
    const params = new URLSearchParams({
      days: '60',
      tz: timezone,
    });
    if (selectedTradition !== 'all') {
      params.set('tradition', selectedTradition);
    }
    if (geo.calendarProfile) {
      params.set('calendar_profile', geo.calendarProfile);
    }

    apiFetch(`/api/calendar/upcoming?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!data || !Array.isArray(data.observances)) {
          setUpcomingVrats([]);
          setTodayVratOccurrence(null);
          return;
        }

        const canonicalToday = data.from; // Server-derived local spiritual date

        const rawObservances: ClientObservanceResult[] = data.observances;
        const vratObservances = rawObservances.filter((o) => o.kind === 'vrat');

        const resolvedUpcoming: UpcomingVrat[] = vratObservances
          .filter(isConfirmedVratOccurrence)
          .map((observance) => {
            const vratData = lookupVratData(observance.slug);
            return vratData
              ? {
                  date: (observance.civilDate ?? observance.date)!,
                  slug: observance.slug,
                  vratData,
                  observance,
                }
              : null;
          })
          .filter((item): item is UpcomingVrat => item !== null);

        setUpcomingVrats(resolvedUpcoming);

        // Find canonical Today observance: resolved, primary, kind=vrat, matching canonicalToday
        const todayMatch = resolvedUpcoming.find(
          (u) =>
            u.observance.isPrimary === true &&
            u.observance.status === 'resolved' &&
            (u.observance.civilDate === canonicalToday || u.observance.date === canonicalToday)
        );

        setTodayVratOccurrence(todayMatch ?? null);
        setUpcomingError(false);
      })
      .catch(() => {
        if (!cancelled) {
          setUpcomingError(true);
          setTodayVratOccurrence(null);
          setUpcomingVrats([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTradition, geo.timezone, geo.calendarProfile]);

  const vrats = useMemo(
    () => Object.values(VRAT_DATABASE).filter((vrat) => vratMatchesTradition(vrat, selectedTradition)),
    [selectedTradition]
  );

  const handleDismissPrompt = async () => {
    setShowCalendarPrompt(false);
    if (userId) {
      await recordPromptDismissal(userId, 'calendar_setup');
      trackProgressivePromptEvent('calendar_setup', 'dismissed');
    }
  };

  const handleActionPrompt = () => {
    setShowCalendarPrompt(false);
    if (userId) {
      trackProgressivePromptEvent('calendar_setup', 'completed');
    }
    router.push('/(auth)/onboarding');
  };

  const openVratDetail = (vrat: VratData, occurrence?: ClientObservanceResult | null) => {
    if (occurrence?.id) {
      router.push({
        pathname: '/vrat/[slug]',
        params: {
          slug: occurrence.slug || vrat.id,
          occurrence_id: occurrence.id,
          date: occurrence.civilDate ?? occurrence.date,
        },
      });
    } else {
      router.push({
        pathname: '/vrat/[slug]',
        params: {
          slug: vrat.id,
        },
      });
    }
  };

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.brand} />
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <BackButton />
          <Text style={{ ...TYPE.title, color: theme.text, marginLeft: 12 }}>Vrat & Fasting</Text>
        </View>

        {/* Tradition filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {TRADITION_FILTERS.map((t) => {
              const active = selectedTradition === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setSelectedTradition(t)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: RADII.pill,
                    backgroundColor: active ? theme.brand : theme.card,
                    borderWidth: 1,
                    borderColor: active ? theme.brand : theme.border,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: active ? FONTS.sansSemiBold : FONTS.sans,
                      fontSize: 13,
                      color: active ? '#1c1208' : theme.text,
                      textTransform: 'capitalize',
                    }}
                  >
                    {t}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Progressive profiling calendar prompt */}
        {showCalendarPrompt ? (
          <Card
            style={{
              padding: 16,
              marginBottom: 16,
              backgroundColor: theme.brandSoft,
              borderColor: theme.brand,
              borderWidth: 1,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 4 }}>Align Fasting Dates</Text>
                <Text style={{ ...TYPE.caption, color: theme.text, lineHeight: 18 }}>
                  Set your sampradaya or regional calendar profile for exact observance and parana calculation.
                </Text>
              </View>
              <Pressable onPress={handleDismissPrompt} hitSlop={8}>
                <Feather name="x" size={18} color={theme.dim} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <PressableSurface
                onPress={handleActionPrompt}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  backgroundColor: theme.brand,
                  borderRadius: RADII.sm,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: '#1c1208' }}>Set Calendar Profile</Text>
              </PressableSurface>
              <Pressable
                onPress={handleDismissPrompt}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: theme.dim }}>Not now</Text>
              </Pressable>
            </View>
          </Card>
        ) : null}

        {/* Section: Today's Vrat (Determined Exclusively from Canonical Calendar) */}
        <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 8 }}>Today's Observance</Text>
        {todayVratOccurrence ? (
          <PressableSurface
            onPress={() => openVratDetail(todayVratOccurrence.vratData, todayVratOccurrence.observance)}
            style={{
              padding: 16,
              borderRadius: RADII.md,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              marginBottom: 20,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 32 }}>{todayVratOccurrence.vratData.emoji}</Text>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ ...TYPE.section, color: theme.text }}>{todayVratOccurrence.vratData.name}</Text>
                  <View style={{ backgroundColor: 'rgba(134,187,110,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: '#5aaa38', fontFamily: FONTS.sansSemiBold }}>Canonical Today</Text>
                  </View>
                </View>
                <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 2 }}>{todayVratOccurrence.vratData.tagline}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.dim} />
            </View>
          </PressableSurface>
        ) : (
          <Card style={{ padding: 16, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 24 }}>🌿</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ ...TYPE.section, color: theme.text }}>No Active Vrat Today</Text>
                <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 2 }}>
                  Today follows the standard nitya rhythm. View upcoming fasting days below.
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Section: Upcoming Vrats (Canonical Calendar Feed) */}
        <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 8 }}>Upcoming in Next 60 Days</Text>
        {upcomingError ? (
          <Card style={{ padding: 16, marginBottom: 20 }}>
            <Text style={{ ...TYPE.body, color: theme.dim }}>Could not load upcoming observances.</Text>
          </Card>
        ) : upcomingVrats.length > 0 ? (
          <View style={{ gap: 8, marginBottom: 24 }}>
            {upcomingVrats.map((upcoming) => (
              <PressableSurface
                key={upcoming.observance.id ?? `${upcoming.slug}-${upcoming.date}`}
                onPress={() => openVratDetail(upcoming.vratData, upcoming.observance)}
                style={{
                  padding: 14,
                  borderRadius: RADII.md,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Text style={{ fontSize: 24 }}>{upcoming.vratData.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...TYPE.section, fontSize: 14, color: theme.text }}>{upcoming.vratData.name}</Text>
                  <Text style={{ ...TYPE.caption, color: theme.dim }}>{upcoming.date}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={theme.dim} />
              </PressableSurface>
            ))}
          </View>
        ) : (
          <Card style={{ padding: 16, marginBottom: 24 }}>
            <Text style={{ ...TYPE.body, color: theme.dim }}>No upcoming vrats found in the selected tradition.</Text>
          </Card>
        )}

        {/* Section: Complete Vrat Library (Catalogue Overview) */}
        <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 8 }}>Vrat Library & Guidelines</Text>
        <View style={{ gap: 10 }}>
          {vrats.map((vrat) => (
            <PressableSurface
              key={vrat.id}
              onPress={() => openVratDetail(vrat, null)}
              style={{
                padding: 14,
                borderRadius: RADII.md,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Text style={{ fontSize: 24 }}>{vrat.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ ...TYPE.section, fontSize: 14, color: theme.text }}>{vrat.name}</Text>
                <Text style={{ ...TYPE.caption, color: theme.dim }} numberOfLines={1}>
                  {vrat.tagline}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={theme.dim} />
            </PressableSurface>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
