import { ScrollView, Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter, type Href } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { BackButton } from '@/components/ui/BackButton';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { COLORS, FONTS, RADII, SPACING, TYPE, themeColor } from '@/lib/constants';
import { DYUTA_COPY } from '@/lib/dyuta/copy';

export default function PlayScreen() {
  const router = useRouter();
  const { language } = useLanguage();
  const copy = DYUTA_COPY[language];
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  return (
    <Screen style={{ backgroundColor: theme.bg, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: 70, right: -86, width: 220, height: 220, borderRadius: 110, backgroundColor: theme.brandSoft }} />
        <View style={{ position: 'absolute', top: 390, left: -96, width: 240, height: 240, borderRadius: 120, backgroundColor: isDark ? COLORS.navGlowIvoryDark : COLORS.navGlowGoldLight }} />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: 40, gap: SPACING.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
          <BackButton label={copy.backLabel} variant="glass" showLabel={false} fallbackHref="/(tabs)" />
          <View style={{ flex: 1 }}>
            <Text style={{ ...TYPE.title, color: theme.text }}>{copy.playTitle}</Text>
            <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.playSubtitle}</Text>
          </View>
        </View>

        <PressableSurface
          accessibilityLabel={`${copy.featuredGame}. ${copy.featuredDescription} ${copy.playNow}`}
          haptic="selection"
          onPress={() => router.push('/dyuta' as Href)}
          style={{
            minHeight: 174,
            padding: SPACING.lg,
            borderRadius: RADII.xl,
            borderWidth: 1,
            borderColor: theme.premiumBorder,
            backgroundColor: theme.card,
            gap: SPACING.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
            <View style={{ width: 48, height: 48, borderRadius: RADII.md, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="play-circle" size={25} color={theme.brand} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ ...TYPE.chip, color: theme.brand, textTransform: 'uppercase' }}>{copy.experienceLabel}</Text>
              <Text style={{ ...TYPE.cardHeading, color: theme.text }}>{copy.featuredGame}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={theme.dim} />
          </View>
          <Text style={{ ...TYPE.body, color: theme.dim }}>{copy.featuredDescription}</Text>
          <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.storyBoundary}</Text>
          <View style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: SPACING.md, borderRadius: RADII.pill, backgroundColor: theme.brand }}>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: theme.textOnBrand }}>{copy.playNow}</Text>
          </View>
        </PressableSurface>

        <Card tone="auto" style={{ padding: SPACING.lg, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ ...TYPE.chip, color: theme.brand, textTransform: 'uppercase' }}>{copy.comingSoon}</Text>
              <Text style={{ ...TYPE.cardHeading, color: theme.text }}>{copy.modernTitle}</Text>
              <Text style={{ ...TYPE.body, color: theme.dim }}>{copy.modernDescription}</Text>
            </View>
            <View style={{ width: 44, height: 44, borderRadius: RADII.md, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="zap" size={21} color={theme.brand} />
            </View>
          </View>
        </Card>

        <Card tone="auto" style={{ padding: SPACING.lg, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ ...TYPE.cardHeading, color: theme.text }}>{copy.gyanTitle}</Text>
              <Text style={{ ...TYPE.body, color: theme.dim }}>{copy.gyanDescription}</Text>
            </View>
            <View style={{ minHeight: 32, paddingHorizontal: SPACING.sm, borderRadius: RADII.pill, backgroundColor: isDark ? COLORS.warningBgDark : COLORS.warningBgLight, justifyContent: 'center' }}>
              <Text style={{ ...TYPE.chip, color: theme.brand }}>{copy.comingSoon}</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
