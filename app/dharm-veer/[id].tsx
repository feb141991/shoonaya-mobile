import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS } from '@/lib/constants';
import { buildHeroPoster, type DharmVeer } from '@/lib/dharm-veer';

// Detail screen for a SPECIFIC Dharm Veer, reached from Home's
// `dharmVeer.href` (`/dharm-veer/{id}`) or any other deep link that names a
// hero by id. This is the fix for a real bug: Home shows hero X (from
// /api/native/home-summary, whose id comes from
// getDharmVeerRoster()+selectDharmVeerOfTheDayFromRoster()), but the old
// static `/dharm-veer` route ignored the id entirely and recomputed its own
// "hero of the day" locally — so a tap on Home could land on a *different*
// hero than the one just shown. This screen instead:
//   1. Fetches the same canonical roster Home's id was drawn from
//      (`GET /api/dharm-veer/roster` — no direct Supabase read/write here).
//   2. Finds the hero by the route's `id` param.
//   3. Renders that exact hero — never a substitute.
// If the id is missing or not found in the roster, it shows an honest
// "not found" state with Retry + Back rather than silently falling back to
// a different (e.g. today's) hero. Opening this screen never marks daily
// completion — that stays owned by the swipe deck at app/dharm-veer.tsx,
// which is unchanged and still the "practice" surface; this is a "read
// about this hero" surface reachable from Home, notifications, or a share.
export default function DharmVeerDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const textDim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const surface = isDark ? COLORS.darkBg : COLORS.creamBg;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [hero, setHero] = useState<DharmVeer | null>(null);

  const load = useCallback(async () => {
    setLoadError(false);
    setNotFound(false);

    if (!id) {
      setNotFound(true);
      return;
    }

    try {
      const response = await apiFetch('/api/dharm-veer/roster');
      if (!response.ok) {
        setLoadError(true);
        return;
      }

      const json = await response.json();
      const roster: DharmVeer[] = Array.isArray(json?.roster) ? json.roster : [];
      const match = roster.find((candidate) => candidate.id === id) ?? null;

      if (!match) {
        // Correct on purpose: an unknown id is a "not found" state, never a
        // silent substitution for today's hero or the first roster entry.
        setNotFound(true);
        return;
      }

      setHero(match);
    } catch {
      setLoadError(true);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const retry = useCallback(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  if (loading) {
    return (
      <Screen style={{ backgroundColor: surface }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.brandGold} />
        </View>
      </Screen>
    );
  }

  if (loadError || notFound) {
    return (
      <Screen style={{ backgroundColor: surface }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
          <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="chevron-left" size={16} color={textDim} />
            <Text style={{ color: textDim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
          </Pressable>

          <Card style={{ backgroundColor: cardBg, borderColor: border, gap: 14 }}>
            <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 26 }}>
              {notFound ? 'Hero not found' : 'Could not load this hero'}
            </Text>
            <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 24 }}>
              {notFound
                ? "This Dharm Veer couldn't be found. It may have been renamed or removed — try again, or go back."
                : 'Check your connection and try again.'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={retry}
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
              <Pressable
                onPress={() => router.back()}
                style={{
                  alignSelf: 'flex-start',
                  borderRadius: 999,
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: border,
                }}
              >
                <Text style={{ color: text, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Go back</Text>
              </Pressable>
            </View>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  if (!hero) {
    // Unreachable in practice (covered by notFound above), kept only so
    // TypeScript can narrow `hero` to non-null below without a cast.
    return null;
  }

  return (
    <Screen style={{ backgroundColor: surface }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="chevron-left" size={16} color={textDim} />
          <Text style={{ color: textDim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
        </Pressable>

        <Card style={{ backgroundColor: cardBg, borderColor: border, gap: 16 }}>
          <Image
            source={{ uri: buildHeroPoster(hero) }}
            style={{ width: '100%', height: 260, borderRadius: 22, backgroundColor: isDark ? COLORS.darkBg : COLORS.creamBg }}
            contentFit="cover"
          />

          <View style={{ gap: 4 }}>
            <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 28 }}>{hero.name}</Text>
            {hero.nameLocal ? (
              <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 14 }}>{hero.nameLocal}</Text>
            ) : null}
            <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>
              {hero.emoji} {hero.tradition.toUpperCase()} · {hero.era} · {hero.region}
            </Text>
          </View>

          <Text style={{ color: text, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 24, fontStyle: 'italic' }}>
            {hero.tagline}
          </Text>

          <View style={{ gap: 6 }}>
            <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Journey</Text>
            <Text style={{ color: text, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 25 }}>{hero.journey}</Text>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>The Trial</Text>
            <Text style={{ color: text, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 25 }}>{hero.trial}</Text>
          </View>

          <Card style={{ backgroundColor: surface, borderColor: border, padding: 14 }}>
            <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 12, marginBottom: 6 }}>
              Teaching
            </Text>
            <Text style={{ color: text, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 22 }}>{hero.teaching}</Text>
          </Card>

          <View style={{ gap: 6 }}>
            <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
              Moral for Today
            </Text>
            <Text style={{ color: text, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 25 }}>{hero.moral}</Text>
          </View>

          {hero.legacy ? (
            <View style={{ gap: 6 }}>
              <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Legacy</Text>
              <Text style={{ color: text, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 25 }}>{hero.legacy}</Text>
            </View>
          ) : null}

          {hero.quote ? (
            <View
              style={{
                borderLeftWidth: 3,
                borderLeftColor: COLORS.brandGold,
                paddingLeft: 14,
                gap: 4,
              }}
            >
              <Text style={{ color: text, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 24, fontStyle: 'italic' }}>
                “{hero.quote.text}”
              </Text>
              <Text style={{ color: textDim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                — {hero.quote.attribution}
              </Text>
            </View>
          ) : null}
        </Card>

        <Pressable
          onPress={() => router.push('/dharm-veer')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: 999,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <Text style={{ color: text, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>
            Open today&apos;s Dharm Veer practice
          </Text>
          <Feather name="arrow-right" size={16} color={text} />
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
