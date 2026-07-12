import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, TYPE, themeColor } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { RASHI_LIST } from '@/lib/jyotish';

type RashiHoroscope = {
  rashi: string;
  rashiSanskrit: string;
  symbol: string;
  lord: string;
  luckyColor: string;
  luckyNumber: number;
  luckyTime: string;
  sadhanaFocus: string;
  karma: string;
  health: string;
  love: string;
  shloka: string;
  shlokaTranslation: string;
  panditAiOracle: string;
  beejaMantra: string;
  gocharSummary: string;
  moonTransit: string;
  transitHighlights: Array<{ title: string; detail: string; tone: 'support' | 'discipline' | 'neutral' }>;
  sadhanaPlan: Array<{ label: string; action: string }>;
  accuracyNote: string;
};

function normalizeRashiKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const match = RASHI_LIST.find((rashi) =>
    rashi.key === normalized ||
    rashi.en.toLowerCase() === normalized ||
    rashi.sa.toLowerCase() === normalized
  );
  return match?.key ?? null;
}


export default function RashiphalaScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const theme = useMemo(() => themeColor(isDark), [isDark]);

  const [selectedRashi, setSelectedRashi] = useState<string>('aries');
  const [timezone, setTimezone] = useState<string>('Asia/Kolkata');
  const [data, setData] = useState<RashiHoroscope | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Load initial context (rashi, timezone)
  useEffect(() => {
    let active = true;
    async function loadContext() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('rashi, timezone')
            .eq('id', user.id)
            .single();
          if (active) {
            const profileRashi = normalizeRashiKey(profile?.rashi);
            if (profileRashi) setSelectedRashi(profileRashi);
            if (profile?.timezone) setTimezone(profile.timezone);
          }
        }
      } catch (e) {
        // use defaults
      } finally {
        if (active) setInitialLoad(false);
      }
    }
    void loadContext();
    return () => { active = false; };
  }, []);

  // Fetch horoscope when selectedRashi or timezone changes
  useEffect(() => {
    if (initialLoad) return;
    let active = true;
    setLoading(true);
    setErrorMessage(null);

    async function loadHoroscope() {
      try {
        const res = await apiFetch(`/api/jyotish/rashiphal?rashi=${selectedRashi}&tz=${encodeURIComponent(timezone)}`);
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(payload?.error ?? 'Unable to load Rashiphala.');
        }
        if (active) {
          setData(payload as RashiHoroscope);
        }
      } catch (e) {
        if (active) {
          setData(null);
          setErrorMessage(e instanceof Error ? e.message : 'Unable to load Rashiphala.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadHoroscope();
    return () => { active = false; };
  }, [selectedRashi, timezone, initialLoad, reloadToken]);

  return (
    <Screen header={{ title: 'Your Rashiphala', onBack: () => router.back() }} style={{ backgroundColor: theme.bg, paddingHorizontal: 0 }}>
      <View style={{ paddingTop: 16 }}>
        {/* Horizontal Rashi Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 16 }}>
          {RASHI_LIST.map((rashi) => {
            const isSelected = selectedRashi === rashi.key;
            return (
              <PressableSurface
                key={rashi.key}
                onPress={() => setSelectedRashi(rashi.key)}
                haptic="selection"
                style={{
                  width: 80,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  backgroundColor: isSelected ? theme.brandSoft : theme.card,
                  borderColor: isSelected ? theme.brand : theme.border,
                }}
              >
                <Text style={{ fontSize: 28 }}>{rashi.symbol}</Text>
                <Text style={{ marginTop: 8, color: isSelected ? theme.brand : theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>{rashi.sa}</Text>
                <Text style={{ marginTop: 2, color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>{rashi.en}</Text>
              </PressableSurface>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.brand} />
        </View>
      ) : !data ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 80 }}>
          <Card tone="auto" style={{ alignItems: 'center', gap: 14 }}>
            <Text style={{ fontSize: 30 }}>✨</Text>
            <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 24, textAlign: 'center' }}>
              Rashiphala could not load
            </Text>
            <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 21, textAlign: 'center' }}>
              {errorMessage ?? 'Please try again in a moment.'}
            </Text>
            <PressableSurface
              onPress={() => {
                setInitialLoad(false);
                setSelectedRashi((current) => normalizeRashiKey(current) ?? 'aries');
                setReloadToken((current) => current + 1);
              }}
              style={{
                minHeight: 44,
                paddingHorizontal: 22,
                borderRadius: 22,
                backgroundColor: theme.brand,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: COLORS.onMediaWhite, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>Try again</Text>
            </PressableSurface>
          </Card>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48, gap: 16 }}>
          {/* Main Card */}
          <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 32 }}>{data.symbol}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 22 }}>
                  {data.rashiSanskrit} ({data.rashi})
                </Text>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sansMedium, fontSize: 13 }}>
                  Ruling Graha: <Text style={{ fontFamily: FONTS.sansSemiBold, color: theme.text }}>{data.lord}</Text>
                </Text>
              </View>
            </View>
            <View style={{ backgroundColor: theme.brandSoft, padding: 14, borderRadius: 12, borderColor: theme.premiumBorder, borderWidth: 1, gap: 6 }}>
              <Text style={{ color: theme.brand, ...TYPE.chip, textTransform: 'uppercase', letterSpacing: 1 }}>Transit Summary</Text>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 14, lineHeight: 22 }}>{data.panditAiOracle}</Text>
              <View style={{ height: 1, backgroundColor: theme.premiumBorder, marginVertical: 6 }} />
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 11, lineHeight: 16 }}>{data.accuracyNote}</Text>
            </View>
          </Card>

          {/* Transit Highlights */}
          <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <Text style={{ fontSize: 24 }}>🪐</Text>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Transit Facts</Text>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, lineHeight: 18 }}>{data.gocharSummary}</Text>
                <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 13, lineHeight: 18 }}>{data.moonTransit}</Text>
              </View>
            </View>
            <View style={{ gap: 10 }}>
              {data.transitHighlights.slice(0, 4).map((item, idx) => {
                const isSupport = item.tone === 'support';
                const isDiscipline = item.tone === 'discipline';
                const highlightBg = isSupport ? COLORS.successBg : isDiscipline ? COLORS.dangerBg : theme.brandSoft;
                const highlightBorder = isSupport ? COLORS.successBorder : isDiscipline ? COLORS.dangerBorder : theme.border;
                const textCol = isSupport ? COLORS.success : isDiscipline ? COLORS.danger : theme.text;
                return (
                  <View key={`${item.title}-${idx}`} style={{ backgroundColor: highlightBg, borderColor: highlightBorder, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 }}>
                    <Text style={{ color: textCol, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>{item.title}</Text>
                    <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, lineHeight: 18 }}>{item.detail}</Text>
                  </View>
                );
              })}
            </View>
          </Card>

          {/* Life Guidance Areas */}
          <View style={{ gap: 12 }}>
            {[
              { icon: '💼', title: 'Work Guidance', text: data.karma },
              { icon: '🌿', title: 'Body & Energy', text: data.health },
              { icon: '💖', title: 'Relationships', text: data.love },
            ].map((item, index) => (
              <Card key={index} style={{ backgroundColor: theme.card, borderColor: theme.border, flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{item.title}</Text>
                  <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 14, lineHeight: 22 }}>{item.text}</Text>
                </View>
              </Card>
            ))}
          </View>

          {/* Practice Guidance */}
          <Card tone="auto" style={{ backgroundColor: theme.glass, borderColor: theme.premiumBorder, gap: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 24 }}>📿</Text>
                <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Practice Guidance</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Suggested Window</Text>
                <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>{data.luckyTime}</Text>
              </View>
            </View>
            <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 15, lineHeight: 22 }}>{data.sadhanaFocus}</Text>
            <View style={{ gap: 10 }}>
              {data.sadhanaPlan.map((step) => (
                <View key={step.label} style={{ backgroundColor: theme.bg, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 }}>
                  <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{step.label}</Text>
                  <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 13, lineHeight: 18 }}>{step.action}</Text>
                </View>
              ))}
            </View>

            {/* Dhyana Support */}
            <View style={{ backgroundColor: theme.bg, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 }}>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Dhyana Support</Text>
              <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 15, lineHeight: 24, fontStyle: 'italic' }}>{data.shloka}</Text>
              <Text style={{ color: theme.brand, fontFamily: FONTS.sansMedium, fontSize: 11, lineHeight: 18 }}>{data.shlokaTranslation}</Text>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 12, marginTop: 4 }}>
                Mantra Anchor: <Text style={{ fontFamily: FONTS.sansSemiBold, textDecorationLine: 'underline' }}>{data.beejaMantra}</Text>
              </Text>
            </View>
          </Card>
        </ScrollView>
      )}
    </Screen>
  );
}
