import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { DharmVeerPoster } from '@/components/dharm-veer/DharmVeerPoster';
import { ShoonayaShareCard } from '@/components/share/ShoonayaShareCard';
import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, MIN_TOUCH_TARGET } from '@/lib/constants';
import type { DharmVeer } from '@/lib/dharm-veer';
import { shareCapturedShoonayaCard } from '@/lib/share-card';

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
  const shareCardRef = useRef<View>(null);
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
  const [askMoreQuery, setAskMoreQuery] = useState('');
  const [askMoreResponse, setAskMoreResponse] = useState('');
  const [askMoreLoading, setAskMoreLoading] = useState(false);

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

  const askDharmaMitra = useCallback(async () => {
    const question = askMoreQuery.trim();
    if (!question || !hero || askMoreLoading) return;

    setAskMoreLoading(true);
    setAskMoreResponse('');
    try {
      const response = await apiFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: question,
          mode: 'dharam_veer_reflection',
          figure_id: hero.id,
        }),
      });

      if (!response.ok) {
        setAskMoreResponse('Dharma Mitra could not answer right now.');
        return;
      }

      const answer = await response.text();
      setAskMoreResponse(answer.trim() || 'Dharma Mitra could not answer right now.');
    } catch {
      setAskMoreResponse('Dharma Mitra could not answer right now.');
    } finally {
      setAskMoreLoading(false);
    }
  }, [askMoreLoading, askMoreQuery, hero]);

  const shareHero = useCallback(async () => {
    if (!hero) return;
    await shareCapturedShoonayaCard(shareCardRef, {
      fileName: `shoonaya-dharm-veer-${hero.id}.png`,
      dialogTitle: 'Share Dharm Veer',
      fallbackMessage: `${hero.name} — ${hero.tagline}`,
    });
  }, [hero]);

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
          <PressableSurface haptic="selection" onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 0 }}>
            <Feather name="chevron-left" size={16} color={textDim} />
            <Text style={{ color: textDim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
          </PressableSurface>

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
              <PressableSurface
                haptic="selection"
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
              </PressableSurface>
              <PressableSurface
                haptic="selection"
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
              </PressableSurface>
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
          ref={shareCardRef}
          data={{
            tradition: hero.tradition,
            headlineValue: hero.name,
            title: 'Dharm Veer',
            subtitle: `${hero.era} · ${hero.region}`,
            caption: hero.teaching || hero.tagline,
            footer: 'Shared from Shoonaya',
          }}
        />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
        <PressableSurface haptic="selection" onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 0 }}>
          <Feather name="chevron-left" size={16} color={textDim} />
          <Text style={{ color: textDim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
        </PressableSurface>

        <Card style={{ backgroundColor: cardBg, borderColor: border, gap: 16 }}>
          <DharmVeerPoster hero={hero} />

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

        <Card style={{ backgroundColor: cardBg, borderColor: border, gap: 12 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 22 }}>Ask more about this Dharm Veer</Text>
            <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 13, lineHeight: 20 }}>
              {"Dharma Mitra can help you reflect on this hero's teaching."}
            </Text>
          </View>
          <TextInput
            value={askMoreQuery}
            onChangeText={setAskMoreQuery}
            placeholder="Ask a question..."
            placeholderTextColor={textDim}
            multiline
            style={{
              minHeight: 90,
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
          <PressableSurface
            haptic="selection"
            onPress={() => { void askDharmaMitra(); }}
            disabled={!askMoreQuery.trim() || askMoreLoading}
            style={{
              alignSelf: 'flex-end',
              minHeight: MIN_TOUCH_TARGET,
              borderRadius: 999,
              paddingHorizontal: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.brandGold,
            }}
          >
            {askMoreLoading ? (
              <ActivityIndicator color={COLORS.ink} size="small" />
            ) : (
              <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Ask AI</Text>
            )}
          </PressableSurface>
          {askMoreResponse ? (
            <View style={{ borderRadius: 18, borderWidth: 1, borderColor: border, backgroundColor: surface, padding: 14 }}>
              <Text style={{ color: text, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 22 }}>{askMoreResponse}</Text>
            </View>
          ) : null}
        </Card>

        <PressableSurface
          haptic="selection"
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
            {"Open today's Dharm Veer practice"}
          </Text>
          <Feather name="arrow-right" size={16} color={text} />
        </PressableSurface>
        <PressableSurface
          haptic="selection"
          onPress={() => { void shareHero(); }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: 999,
            minHeight: MIN_TOUCH_TARGET,
            backgroundColor: COLORS.brandGold,
          }}
        >
          <Feather name="share-2" size={16} color={COLORS.ink} />
          <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Share reflection</Text>
        </PressableSurface>
      </ScrollView>
    </Screen>
  );
}
