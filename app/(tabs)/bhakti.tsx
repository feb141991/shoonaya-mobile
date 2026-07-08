import { Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Card } from '@/components/ui/Card';
import { SacredIcon, type SacredIconName } from '@/components/ui/SacredIcon';
import { COLORS, FONTS, MIN_TOUCH_TARGET } from '@/lib/constants';

// Minimal Bhakti hub — the true center/elevated tab in the 5-tab bar
// (Home / Japa / Bhakti / Pathshala / Mandali), matching PWA's shape
// (src/components/layout/BottomNav.tsx: Bhakti is the center pill, Japa —
// /bhakti/mala — is its own tab). Native previously had no distinct Bhakti
// screen at all: app/(tabs)/bhakti.tsx WAS the Japa/mala-counter screen
// (its own header read "Japa"), just mislabeled in the tab bar. That screen
// is now correctly named app/(tabs)/japa.tsx and unchanged in every other
// way; this is a new, deliberately small hub in its place — one primary
// entry into Japa, plus links to the practices that are genuinely
// devotional in nature (Nitya Karma's daily rituals, Dharm Veer's stories
// of devotion/courage), not a full rebuild of PWA's broader Bhakti section
// (mantra library, kirtan, etc.) — that's real, separate follow-up scope,
// not something to fake here with placeholder cards.
export default function BhaktiScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const background = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const iconWell = isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;

  const navigate = (href: Href) => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.push(href);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36, gap: 16 }}>
        <View>
          <Text style={{ fontFamily: FONTS.serifBold, fontSize: 30, color: text }}>Bhakti</Text>
          <Text style={{ marginTop: 4, fontFamily: FONTS.sans, fontSize: 14, color: dim }}>
            Devotion, one practice at a time
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Japa, your mala counter"
          onPress={() => navigate('/(tabs)/japa')}
          style={{
            borderRadius: 26,
            padding: 20,
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: iconWell,
            }}
          >
            <SacredIcon name="japa" fallbackGlyph="heart" size={26} color={brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: brand }}>
              Primary practice
            </Text>
            <Text style={{ marginTop: 3, fontFamily: FONTS.serifBold, fontSize: 20, color: text }}>Japa</Text>
            <Text style={{ marginTop: 2, fontFamily: FONTS.sans, fontSize: 13, color: dim }}>
              Your mala counter and daily mantra practice
            </Text>
          </View>
          <Feather name="arrow-right" size={20} color={brand} />
        </Pressable>

        <View style={{ gap: 4, marginTop: 4 }}>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: dim }}>
            More devotion
          </Text>
        </View>

        <Card tone="auto" style={{ backgroundColor: cardBg, borderColor: border, gap: 12 }}>
          {[
            { id: 'nitya' as SacredIconName, icon: 'sunrise' as const, title: 'Nitya Karma', detail: 'Your daily sacred rituals', href: '/nitya-karma' as Href },
            { id: 'dharmveer' as SacredIconName, icon: 'shield' as const, title: 'Dharm Veer', detail: 'Stories of dharmic courage', href: '/dharm-veer' as Href },
          ].map((item, index, arr) => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
              onPress={() => navigate(item.href)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingVertical: 4,
                minHeight: MIN_TOUCH_TARGET,
                borderBottomWidth: index < arr.length - 1 ? 1 : 0,
                borderBottomColor: border,
                paddingBottom: index < arr.length - 1 ? 12 : 0,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: iconWell,
                }}
              >
                <SacredIcon name={item.id} fallbackGlyph={item.icon} size={18} color={brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: text }}>{item.title}</Text>
                <Text style={{ marginTop: 1, fontFamily: FONTS.sans, fontSize: 12, color: dim }}>{item.detail}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={dim} />
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
