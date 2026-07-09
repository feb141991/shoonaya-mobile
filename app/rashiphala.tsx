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
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

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

const RASHI_LIST = [
  { key: 'aries', en: 'Aries', sa: 'Mesha', symbol: '🐏' },
  { key: 'taurus', en: 'Taurus', sa: 'Vrishabha', symbol: '🐂' },
  { key: 'gemini', en: 'Gemini', sa: 'Mithuna', symbol: '👥' },
  { key: 'cancer', en: 'Cancer', sa: 'Karka', symbol: '🦀' },
  { key: 'leo', en: 'Leo', sa: 'Simha', symbol: '🦁' },
  { key: 'virgo', en: 'Virgo', sa: 'Kanya', symbol: '🌾' },
  { key: 'libra', en: 'Libra', sa: 'Tula', symbol: '⚖️' },
  { key: 'scorpio', en: 'Scorpio', sa: 'Vrishchika', symbol: '🦂' },
  { key: 'sagittarius', en: 'Sagittarius', sa: 'Dhanu', symbol: '🏹' },
  { key: 'capricorn', en: 'Capricorn', sa: 'Makara', symbol: '🐊' },
  { key: 'aquarius', en: 'Aquarius', sa: 'Kumbha', symbol: '🏺' },
  { key: 'pisces', en: 'Pisces', sa: 'Meena', symbol: '🐟' },
];

export default function RashiphalaScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const theme = useMemo(
    () => ({
      bg: isDark ? COLORS.darkBg : COLORS.creamBg,
      card: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
      border: isDark ? COLORS.borderDark : COLORS.borderLight,
      text: isDark ? COLORS.creamBg : COLORS.ink,
      dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
      gold: isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight,
    }),
    [isDark]
  );

  const [selectedRashi, setSelectedRashi] = useState<string>('aries');
  const [timezone, setTimezone] = useState<string>('Asia/Kolkata');
  const [data, setData] = useState<RashiHoroscope | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

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
            if (profile?.rashi) setSelectedRashi(profile.rashi.toLowerCase());
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

    async function loadHoroscope() {
      try {
        const res = await apiFetch(`/api/jyotish/rashiphal?rashi=${selectedRashi}&tz=${encodeURIComponent(timezone)}`);
        if (res.ok && active) {
          const payload = await res.json();
          setData(payload);
        }
      } catch (e) {
        // handle error silently
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadHoroscope();
    return () => { active = false; };
  }, [selectedRashi, timezone, initialLoad]);

  return (
    <Screen header={{ title: 'Your Rashiphala', onBack: () => router.back() }} style={{ backgroundColor: theme.bg, paddingHorizontal: 0 }}>
      <View style={{ paddingTop: 16 }}>
        {/* Horizontal Rashi Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 16 }}>
          {RASHI_LIST.map((rashi) => {
            const isSelected = selectedRashi === rashi.key;
            return (
              <Pressable
                key={rashi.key}
                onPress={() => setSelectedRashi(rashi.key)}
                style={{
                  width: 80,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  backgroundColor: isSelected ? (isDark ? 'rgba(255,215,0,0.1)' : 'rgba(200,160,60,0.1)') : theme.card,
                  borderColor: isSelected ? theme.gold : theme.border,
                }}
              >
                <Text style={{ fontSize: 28 }}>{rashi.symbol}</Text>
                <Text style={{ marginTop: 8, color: isSelected ? theme.gold : theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>{rashi.sa}</Text>
                <Text style={{ marginTop: 2, color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>{rashi.en}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading || !data ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.gold} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48, gap: 16 }}>
          {/* Main Card */}
          <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,215,0,0.1)' : 'rgba(200,160,60,0.1)', alignItems: 'center', justifyContent: 'center' }}>
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
            <View style={{ backgroundColor: isDark ? 'rgba(255,215,0,0.05)' : 'rgba(200,160,60,0.05)', padding: 14, borderRadius: 12, borderColor: isDark ? 'rgba(255,215,0,0.15)' : 'rgba(200,160,60,0.2)', borderWidth: 1, gap: 6 }}>
              <Text style={{ color: theme.gold, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Transit Summary</Text>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 14, lineHeight: 22 }}>{data.panditAiOracle}</Text>
              <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,215,0,0.15)' : 'rgba(200,160,60,0.2)', marginVertical: 6 }} />
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 11, lineHeight: 16 }}>{data.accuracyNote}</Text>
            </View>
          </Card>

          {/* Transit Highlights */}
          <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <Text style={{ fontSize: 24 }}>🪐</Text>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: theme.gold, fontFamily: FONTS.sansSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Transit Facts</Text>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, lineHeight: 18 }}>{data.gocharSummary}</Text>
                <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 13, lineHeight: 18 }}>{data.moonTransit}</Text>
              </View>
            </View>
            <View style={{ gap: 10 }}>
              {data.transitHighlights.slice(0, 4).map((item, idx) => {
                const isSupport = item.tone === 'support';
                const isDiscipline = item.tone === 'discipline';
                const highlightBg = isSupport ? (isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.06)') : isDiscipline ? (isDark ? 'rgba(249,115,22,0.1)' : 'rgba(249,115,22,0.06)') : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)');
                const highlightBorder = isSupport ? 'rgba(16,185,129,0.2)' : isDiscipline ? 'rgba(249,115,22,0.2)' : theme.border;
                const textCol = isSupport ? (isDark ? '#34d399' : 'rgb(6,95,70)') : isDiscipline ? (isDark ? '#fb923c' : 'rgb(154,52,18)') : theme.text;
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
                  <Text style={{ color: theme.gold, fontFamily: FONTS.sansSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{item.title}</Text>
                  <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 14, lineHeight: 22 }}>{item.text}</Text>
                </View>
              </Card>
            ))}
          </View>

          {/* Practice Guidance */}
          <Card style={{ backgroundColor: isDark ? '#221c10' : '#fcf9f2', borderColor: theme.gold, gap: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 24 }}>📿</Text>
                <Text style={{ color: theme.gold, fontFamily: FONTS.sansSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Practice Guidance</Text>
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
                  <Text style={{ color: theme.gold, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{step.label}</Text>
                  <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 13, lineHeight: 18 }}>{step.action}</Text>
                </View>
              ))}
            </View>

            {/* Dhyana Support */}
            <View style={{ backgroundColor: theme.bg, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 }}>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Dhyana Support</Text>
              <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 15, lineHeight: 24, fontStyle: 'italic' }}>{data.shloka}</Text>
              <Text style={{ color: theme.gold, fontFamily: FONTS.sansMedium, fontSize: 11, lineHeight: 18 }}>{data.shlokaTranslation}</Text>
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
