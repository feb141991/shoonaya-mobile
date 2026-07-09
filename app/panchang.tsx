import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS } from '@/lib/constants';
import { calculatePanchang, type PanchangData } from '@sangam/panchang-engine';
import { supabase } from '@/lib/supabase';
import { RASHI_MAP } from '@/lib/jyotish';

type Tradition = 'hindu' | 'sikh' | 'buddhist' | 'jain' | 'all';

type UpcomingFestival = {
  date: string;
  slug: string;
  display_name: string;
  emoji: string;
  kind: 'major' | 'vrat' | 'regional';
  tradition: Tradition;
};

type PanchangState = {
  lat: number;
  lon: number;
  timezone: string;
  tradition: Tradition;
  rashi: string | null;
};

const INITIAL_STATE: PanchangState = {
  lat: 23.1765,
  lon: 75.7885,
  timezone: 'Asia/Kolkata',
  tradition: 'hindu',
  rashi: null,
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

export default function PanchangScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const [profileState, setProfileState] = useState<PanchangState>(INITIAL_STATE);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [festivals, setFestivals] = useState<UpcomingFestival[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewedToday, setViewedToday] = useState(false);
  const [markingViewed, setMarkingViewed] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showRashiPicker, setShowRashiPicker] = useState(false);
  const [savingRashi, setSavingRashi] = useState(false);

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

  const loadPanchangContext = useCallback(async () => {
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
      .select('latitude, longitude, timezone, tradition, rashi')
      .eq('id', user.id)
      .single();

    const nextState: PanchangState = {
      lat: profile?.latitude ?? INITIAL_STATE.lat,
      lon: profile?.longitude ?? INITIAL_STATE.lon,
      timezone: profile?.timezone ?? INITIAL_STATE.timezone,
      tradition: (profile?.tradition ?? 'hindu') as Tradition,
      rashi: profile?.rashi ?? null,
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
  }, [viewedToday, markingViewed]);

  const panchang = useMemo<PanchangData>(
    () => calculatePanchang(selectedDate, profileState.lat, profileState.lon, profileState.timezone),
    [profileState.lat, profileState.lon, profileState.timezone, selectedDate]
  );

  const dateStrip = useMemo(() => buildDateRange(selectedDate), [selectedDate]);

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.brandGold} />
        </View>
      </Screen>
    );
  }

  const rashiObj = profileState.rashi ? RASHI_MAP[profileState.rashi.toLowerCase()] : null;

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="chevron-left" size={16} color={theme.dim} />
          <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
        </Pressable>

        <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 30 }}>Panchang</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {dateStrip.map((date) => {
            const active = date.toDateString() === selectedDate.toDateString();
            return (
              <Pressable
                key={date.toISOString()}
                onPress={() => setSelectedDate(date)}
                style={{
                  minWidth: 72,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: active ? COLORS.brandGold : theme.border,
                  backgroundColor: active ? COLORS.brandGold : theme.card,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Text style={{ color: active ? COLORS.ink : theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>
                  {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                </Text>
                <Text style={{ color: active ? COLORS.ink : theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 16 }}>
                  {date.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Your Rashiphala Card */}
        <Card style={{ backgroundColor: theme.card, borderColor: theme.border, padding: 0, overflow: 'hidden' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open your Rashiphala reading"
            onPress={() => router.push('/rashiphala')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: isDark ? 'rgba(255,215,0,0.1)' : 'rgba(200,160,60,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 24 }}>{rashiObj ? rashiObj.symbol : '✨'}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 20 }}>Your Rashiphala</Text>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13 }}>
                {rashiObj ? (
                  <Text><Text style={{ fontFamily: FONTS.sansSemiBold, color: theme.text }}>{rashiObj.sa}</Text> · Today&apos;s reading</Text>
                ) : (
                  <Text style={{ fontStyle: 'italic' }}>Set your Rashi below to personalise</Text>
                )}
              </Text>
              <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
                Daily · Weekly · Monthly
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={theme.dim} />
          </Pressable>

          {(showRashiPicker || !profileState.rashi) && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4, borderTopWidth: 1, borderTopColor: theme.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {profileState.rashi ? 'Change your Rashi' : '✦ Set your Rashi for personalised readings'}
                </Text>
                {profileState.rashi && showRashiPicker && (
                  <Pressable onPress={() => setShowRashiPicker(false)}>
                    <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, textDecorationLine: 'underline' }}>Cancel</Text>
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
                        width: '23%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        backgroundColor: isSelected ? (isDark ? 'rgba(255,215,0,0.1)' : 'rgba(200,160,60,0.1)') : theme.bg,
                        borderColor: isSelected ? COLORS.brandGold : theme.border,
                        opacity: savingRashi ? 0.7 : 1,
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>{r.symbol}</Text>
                      <Text style={{ marginTop: 6, color: isSelected ? COLORS.brandGold : theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 10 }}>{r.en}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {profileState.rashi && !showRashiPicker && (
            <Pressable onPress={() => setShowRashiPicker(true)} style={{ paddingBottom: 16, alignItems: 'center' }}>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 11, textDecorationLine: 'underline' }}>Change Rashi</Text>
            </Pressable>
          )}
        </Card>

        {/* Kundali Entry Point */}
        <Card style={{ backgroundColor: theme.card, borderColor: theme.border, padding: 0, overflow: 'hidden' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Generate your Vedic Kundali birth chart"
            onPress={() => router.push('/kundali')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: isDark ? 'rgba(255,215,0,0.1)' : 'rgba(200,160,60,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 24 }}>🛕</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 20 }}>Vedic Kundali</Text>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13 }}>
                Generate your birth chart
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={theme.dim} />
          </Pressable>
        </Card>

        <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 14 }}>
          <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 28 }}>{"Today's Panchang"}</Text>
          <View style={{ gap: 10 }}>
            {[
              ['Tithi', `${panchang.tithi} · ${panchang.paksha}`],
              ['Nakshatra', panchang.nakshatra],
              ['Yoga', panchang.yoga],
              ['Karana', panchang.karana],
              ['Vara', panchang.vara],
            ].map(([label, value]) => (
              <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14 }}>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>{label}</Text>
                <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 14, flex: 1, textAlign: 'right' }}>
                  {value}
                </Text>
              </View>
            ))}
          </View>

          {isRealToday(selectedDate) ? (
            viewedToday ? (
              <View
                accessible
                accessibilityLabel="Today's Panchang marked as observed"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: theme.bg,
                  alignSelf: 'flex-start',
                }}
              >
                <Feather name="check-circle" size={16} color={COLORS.brandGold} />
                <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>
                  Observed today
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Mark today's Panchang as observed"
                  onPress={markObserved}
                  disabled={markingViewed}
                  style={{
                    minHeight: 48,
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: COLORS.brandGold,
                    opacity: markingViewed ? 0.7 : 1,
                  }}
                >
                  {markingViewed ? (
                    <ActivityIndicator color={COLORS.ink} />
                  ) : (
                    <>
                      <Feather name="check" size={16} color={COLORS.ink} />
                      <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>
                        Mark today&apos;s Panchang as observed
                      </Text>
                    </>
                  )}
                </Pressable>
                {markError ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, flex: 1 }}>
                      {markError}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Retry marking Panchang as observed"
                      onPress={markObserved}
                    >
                      <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                        Retry
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            )
          ) : null}
        </Card>

        <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 12 }}>
          <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 24 }}>Timing bands</Text>
          {[
            ['Sunrise', panchang.sunrise],
            ['Sunset', panchang.sunset],
            ['Rahu Kaal', panchang.rahuKaal],
            ['Abhijit Muhurat', panchang.abhijitMuhurat],
            ['Brahma Muhurta', panchang.brahmaMuhurta],
          ].map(([label, value]) => (
            <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14 }}>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>{label}</Text>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 14 }}>{value}</Text>
            </View>
          ))}
        </Card>

        <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 12 }}>
          <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 24 }}>Upcoming festivals</Text>
          {festivals.length === 0 ? (
            <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14 }}>No upcoming observances loaded.</Text>
          ) : (
            festivals.slice(0, 8).map((festival) => (
              <View
                key={`${festival.date}-${festival.slug}`}
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.bg,
                  padding: 14,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
                    {festival.emoji} {festival.display_name}
                  </Text>
                  <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, marginTop: 2 }}>{festival.date}</Text>
                </View>
                <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>
                  {festival.kind.toUpperCase()}
                </Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}
