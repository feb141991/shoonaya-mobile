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
};

const INITIAL_STATE: PanchangState = {
  lat: 23.1765,
  lon: 75.7885,
  timezone: 'Asia/Kolkata',
  tradition: 'hindu',
};

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('latitude, longitude, timezone, tradition')
      .eq('id', user.id)
      .single();

    const nextState: PanchangState = {
      lat: profile?.latitude ?? INITIAL_STATE.lat,
      lon: profile?.longitude ?? INITIAL_STATE.lon,
      timezone: profile?.timezone ?? INITIAL_STATE.timezone,
      tradition: (profile?.tradition ?? 'hindu') as Tradition,
    };
    setProfileState(nextState);

    const response = await apiFetch(
      `/api/calendar/upcoming?days=14&tradition=${nextState.tradition}&tz=${encodeURIComponent(nextState.timezone)}`
    );
    if (response.ok) {
      const payload = (await response.json()) as { observances?: UpcomingFestival[] };
      setFestivals(payload.observances ?? []);
    }
  }, [router]);

  useEffect(() => {
    loadPanchangContext()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [loadPanchangContext]);

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
