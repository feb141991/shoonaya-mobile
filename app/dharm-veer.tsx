import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Card } from '@/components/ui/Card';
import { BackButton } from '@/components/ui/BackButton';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS } from '@/lib/constants';
import { selectDharmVeer, getDharmVeerOfTheDay, DHARM_VEERS, TRADITION_META, type DharmVeer } from '@/lib/dharm-veer';
import { supabase } from '@/lib/supabase';
import { isGuestMode } from '@/lib/guestSession';

type TraditionFilter = 'all' | 'hindu' | 'sikh' | 'buddhist' | 'jain';

const TRADITION_FILTERS: Array<{ key: TraditionFilter; label: string; emoji: string }> = [
  { key: 'all',      label: 'All',      emoji: '📚' },
  { key: 'hindu',    label: 'Hindu',    emoji: '🕉️' },
  { key: 'sikh',     label: 'Sikh',     emoji: '☬' },
  { key: 'buddhist', label: 'Buddhist', emoji: '☸️' },
  { key: 'jain',     label: 'Jain',     emoji: '🤲' },
];

const TRADITION_ACCENT: Record<string, string> = {
  hindu:    '#FF7800',
  sikh:     '#4080FF',
  buddhist: '#FFC800',
  jain:     '#00C832',
  sufi:     '#8C5ADC',
  tribal:   '#3CA05A',
};

function getLocalSpiritualDate(tz: string, rolloverHour: number = 4): string {
  try {
    const d = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: 'numeric', hourCycle: 'h23',
    }).formatToParts(d);

    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const dayStr = parts.find(p => p.type === 'day')?.value;
    const hourStr = parts.find(p => p.type === 'hour')?.value;

    if (year && month && dayStr && hourStr) {
      let day = parseInt(dayStr, 10);
      const hour = parseInt(hourStr, 10);
      if (hour < rolloverHour) {
         const temp = new Date(`${year}-${month}-${dayStr}T12:00:00Z`);
         temp.setUTCDate(temp.getUTCDate() - 1);
         return temp.toISOString().split('T')[0];
      }
      return `${year}-${month}-${dayStr}`;
    }
  } catch {}
  const fallback = new Date(Date.now() - rolloverHour * 3600 * 1000);
  return fallback.toISOString().split('T')[0];
}

export default function DharmVeerScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState<DharmVeer[]>([]);
  const [rosterError, setRosterError] = useState(false);
  const [filter, setFilter] = useState<TraditionFilter>('all');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [liveTodayHero, setLiveTodayHero] = useState<DharmVeer | null>(null);

  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const textDim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const surface = isDark ? COLORS.darkBg : COLORS.creamBg;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;
  const gold = brand;

  const loadState = useCallback(async () => {
    const guest = await isGuestMode();

    let resolvedTimezone = 'UTC';
    let resolvedTradition = 'hindu';

    if (!guest) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('tradition, timezone')
        .eq('id', user.id)
        .single();

      resolvedTradition = profileRow?.tradition ?? 'hindu';
      resolvedTimezone = profileRow?.timezone ?? 'UTC';
    }

    let rosterData: DharmVeer[] = [];
    if (guest) {
      rosterData = DHARM_VEERS;
    } else {
      const res = await apiFetch('/api/dharm-veer/roster');
      if (!res.ok) {
        throw new Error('Dharm Veer roster unavailable');
      }
      const json = await res.json();
      rosterData = Array.isArray(json?.roster) ? json.roster : [];
    }

    if (rosterData.length === 0) {
      throw new Error('Dharm Veer roster is empty');
    }

    setRoster(rosterData);
    setRosterError(!rosterData || rosterData.length === 0);

    try {
      const historyRaw = await AsyncStorage.getItem('shoonaya-dharmveer-history');
      const ids = new Set<string>();
      if (historyRaw) {
        const historyArr = JSON.parse(historyRaw) as string[];
        historyArr.forEach(id => ids.add(id));
      }

      const todayDate = getLocalSpiritualDate(resolvedTimezone, 4);
      // Legacy guest-only fallback from the old local fixture flow.
      if (guest && await AsyncStorage.getItem(`shoonaya-dharmveer-done-${todayDate}`)) {
        const fallbackHero = getDharmVeerOfTheDay(resolvedTradition);
        ids.add(fallbackHero.id);
      }
      setReadIds(ids);

      const lastSelectedDate = await AsyncStorage.getItem('shoonaya-dharmveer-last-selected-date');
      const lastSelectedId = await AsyncStorage.getItem('shoonaya-dharmveer-last-selected-id');
      const historyIds = Array.from(ids);

      const saveSelection = async (selected: DharmVeer) => {
        const newHistory = [...historyIds.filter(id => id !== selected.id), selected.id].slice(-14);
        await AsyncStorage.setItem('shoonaya-dharmveer-history', JSON.stringify(newHistory));
        await AsyncStorage.setItem('shoonaya-dharmveer-last-selected-date', todayDate);
        await AsyncStorage.setItem('shoonaya-dharmveer-last-selected-id', selected.id);
      };

      if (lastSelectedDate === todayDate && lastSelectedId) {
        const found = rosterData.find(h => h.id === lastSelectedId);
        if (found) {
          setLiveTodayHero(found);
        } else {
          const selected = selectDharmVeer({
            userTradition: resolvedTradition,
            historyIds,
            roster: rosterData,
          });
          setLiveTodayHero(selected);
          await saveSelection(selected);
        }
      } else {
        const selected = selectDharmVeer({
          userTradition: resolvedTradition,
          historyIds,
          roster: rosterData,
        });
        setLiveTodayHero(selected);
        await saveSelection(selected);
      }
    } catch (e) {}
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

  const filtered = useMemo(
    () => filter === 'all' ? roster : roster.filter((hero) => hero.tradition === filter),
    [filter, roster],
  );

  if (loading) {
    return (
      <Screen style={{ backgroundColor: surface }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={brand} />
        </View>
      </Screen>
    );
  }

  if (rosterError || !liveTodayHero) {
    return (
      <Screen style={{ backgroundColor: surface }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
          <BackButton variant="glass" />
          <Card style={{ backgroundColor: cardBg, borderColor: border, gap: 14 }}>
            <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 30 }}>Dharm Veer</Text>
            <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 24 }}>
              {"Unable to load today's profiles. Check your connection and try again."}
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

  return (
    <Screen style={{ backgroundColor: surface, paddingHorizontal: 0 }}>
      {/* Sticky Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: border,
        backgroundColor: cardBg,
        gap: 12
      }}>
        <BackButton variant="glass" style={{ marginHorizontal: 0, marginBottom: 0 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: textDim, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>
            Sacred Archive
          </Text>
          <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 22 }}>
            Dharm Veer
          </Text>
        </View>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: isDark ? 'rgba(197,160,89,0.1)' : 'rgba(197,160,89,0.15)',
          borderColor: isDark ? 'rgba(197,160,89,0.22)' : 'rgba(197,160,89,0.4)',
          borderWidth: 1,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999
        }}>
          <Feather name="award" size={12} color={gold} />
          <Text style={{ color: gold, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
            {readIds.size}/{roster.length}
          </Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(hero) => hero.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 20 }}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={(
          <>
            <Text style={{ color: textDim, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
              Today's Dharm Veer
            </Text>
            <PressableSurface
              haptic="selection"
              onPress={() => router.push(`/dharm-veer/${liveTodayHero.id}`)}
              style={{
                backgroundColor: isDark ? 'rgba(197,160,89,0.06)' : 'rgba(197,160,89,0.1)',
                borderColor: isDark ? 'rgba(197,160,89,0.28)' : 'rgba(197,160,89,0.4)',
                borderWidth: 1,
                borderRadius: 28,
                padding: 20,
                marginBottom: 24,
                overflow: 'hidden',
              }}
            >
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: TRADITION_META[liveTodayHero.tradition]?.color.replace('0.12', isDark ? '0.2' : '0.4') ?? 'rgba(197,160,89,0.2)',
                  borderColor: 'rgba(197,160,89,0.3)',
                  borderWidth: 1,
                }}>
                  <Text style={{ fontSize: 32 }}>{liveTodayHero.emoji}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <View style={{ backgroundColor: 'rgba(197,160,89,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                      <Text style={{ color: gold, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {TRADITION_META[liveTodayHero.tradition]?.label ?? liveTodayHero.tradition}
                      </Text>
                    </View>
                    {readIds.has(liveTodayHero.id) ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Feather name="check-circle" size={12} color={COLORS.success} />
                        <Text style={{ color: COLORS.success, fontFamily: FONTS.sansSemiBold, fontSize: 10 }}>Read</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 22 }}>{liveTodayHero.name}</Text>
                  <Text numberOfLines={2} style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 13, lineHeight: 18 }}>{liveTodayHero.tagline}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(197,160,89,0.2)' }} />
                <Feather name="book-open" size={14} color={gold} />
                <Text style={{ color: gold, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Read story</Text>
                <Feather name="chevron-right" size={14} color={gold} />
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(197,160,89,0.2)' }} />
              </View>
            </PressableSurface>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 20 }}
              contentContainerStyle={{ gap: 8 }}
            >
              {TRADITION_FILTERS.map((tradition) => {
                const active = filter === tradition.key;
                return (
                  <PressableSurface
                    key={tradition.key}
                    haptic="selection"
                    onPress={() => setFilter(tradition.key)}
                    accessibilityState={{ selected: active }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: active ? gold : isDark ? 'rgba(197,160,89,0.07)' : 'rgba(197,160,89,0.1)',
                      borderColor: active ? gold : 'rgba(197,160,89,0.18)',
                      borderWidth: 1,
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>{tradition.emoji}</Text>
                    <Text style={{ color: active ? COLORS.ink : textDim, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>
                      {tradition.label}
                    </Text>
                  </PressableSurface>
                );
              })}
            </ScrollView>
          </>
        )}
        renderItem={({ item: hero }) => {
            const isToday = hero.id === liveTodayHero.id;
            const isRead = readIds.has(hero.id);
            const meta = TRADITION_META[hero.tradition];
            const accent = TRADITION_ACCENT[hero.tradition] ?? gold;

          return (
            <PressableSurface
              haptic="selection"
              onPress={() => router.push(`/dharm-veer/${hero.id}`)}
              accessibilityLabel={`${hero.name}, ${isRead ? 'read' : 'unread'}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                padding: 16,
                borderRadius: 20,
                backgroundColor: isToday ? 'rgba(197,160,89,0.08)' : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderColor: isToday ? 'rgba(197,160,89,0.32)' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                borderWidth: 1,
              }}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: meta?.color.replace('0.12', '0.22') ?? 'rgba(197,160,89,0.15)',
                borderColor: meta?.color.replace('0.12', '0.32') ?? 'rgba(197,160,89,0.2)',
                borderWidth: 1,
              }}>
                <Text style={{ fontSize: 24 }}>{hero.emoji}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={{ color: accent, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {meta?.label ?? hero.tradition}
                  </Text>
                  {isToday ? (
                    <View style={{ backgroundColor: 'rgba(197,160,89,0.15)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999 }}>
                      <Text style={{ color: gold, fontFamily: FONTS.sansSemiBold, fontSize: 9 }}>Today</Text>
                    </View>
                  ) : null}
                </View>
                <Text numberOfLines={1} style={{ color: text, fontFamily: FONTS.sansSemiBold, fontSize: 16 }}>{hero.name}</Text>
                <Text numberOfLines={1} style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 12 }}>
                  {hero.era} · {hero.region}
                </Text>
              </View>
              {isRead ? (
                <Feather name="check-circle" size={20} color={COLORS.success} />
              ) : (
                <View style={{ width: 20, height: 20, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(197,160,89,0.3)' }} />
              )}
            </PressableSurface>
          );
        }}
        ListFooterComponent={(
          <View style={{
            marginTop: 32,
            padding: 24,
            borderRadius: 24,
            alignItems: 'center',
            backgroundColor: 'rgba(197,160,89,0.05)',
            borderColor: 'rgba(197,160,89,0.12)',
            borderWidth: 1,
            gap: 8,
          }}>
            <Feather name="shield" size={28} color={gold} />
            <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 20, textAlign: 'center' }}>
              Read daily — earn your Dharm Veer mark
            </Text>
            <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
              {'30 seconds of reading counts as your Sadhana.\nA new hero surfaces each day.'}
            </Text>
          </View>
        )}
      />
    </Screen>
  );
}
