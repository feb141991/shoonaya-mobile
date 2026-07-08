import { StyleSheet, useColorScheme, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, RADII } from '@/lib/constants';

// Loading placeholder shaped like the real Home layout (hero, pill row,
// shloka, Next Practice card, practice-list row, Sankalpa row, Dharm Veer
// row) rather than two generic cards — so the screen doesn't visibly
// "reflow" once data arrives. Reuses the same shimmer block pattern as
// components/ui/SkeletonLoader.tsx, but doesn't import from it since none
// of its exports (SkeletonCard/SkeletonRow/SkeletonCircle) draw the hero's
// specific proportions.

function Block({ style, dark }: { style: StyleProp<ViewStyle>; dark: boolean }) {
  const color = dark ? COLORS.homeSkeletonBlockDark : COLORS.homeSkeletonBlockLight;
  return <View style={[{ backgroundColor: color, borderRadius: 8 }, style]} />;
}

export function HomeSkeleton() {
  const isDark = useColorScheme() === 'dark';
  const background = isDark ? COLORS.darkBg : COLORS.creamBg;
  const hero = isDark ? COLORS.homeHeroDark : COLORS.homeHeroLight;
  const card = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: background }} edges={['top']}>
      <View style={{ flex: 1 }}>
        {/* Hero */}
        <View style={{ minHeight: 572, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 34, backgroundColor: hero, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Block dark={isDark} style={{ width: 44, height: 44, borderRadius: 22 }} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Block dark={isDark} style={{ width: 60, height: 44, borderRadius: 22 }} />
              <Block dark={isDark} style={{ width: 48, height: 48, borderRadius: 24 }} />
            </View>
          </View>
          <View style={{ marginTop: 20 }}>
            <Block dark={isDark} style={{ width: '70%', height: 34, borderRadius: 8 }} />
            <Block dark={isDark} style={{ marginTop: 12, width: '45%', height: 14, borderRadius: 6 }} />
            <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
              <Block dark={isDark} style={{ width: 150, height: 44, borderRadius: 22 }} />
              <Block dark={isDark} style={{ width: 110, height: 44, borderRadius: 22 }} />
            </View>
          </View>

          {/* Shloka — background matches `background` (theme.background),
              same as the real Home's shloka panel now uses, so this
              skeleton's fold blends the same way instead of showing the
              old translucent-white glass card seam during loading. */}
          <View
            style={{
              marginTop: 42,
              marginHorizontal: -20,
              marginBottom: -34,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              paddingHorizontal: 24,
              paddingTop: 18,
              paddingBottom: 34,
              alignItems: 'center',
              backgroundColor: background,
            }}
          >
            <Block dark={isDark} style={{ width: 110, height: 11, borderRadius: 6 }} />
            <Block dark={isDark} style={{ marginTop: 14, width: '80%', height: 24, borderRadius: 8 }} />
            <Block dark={isDark} style={{ marginTop: 10, width: '60%', height: 14, borderRadius: 6 }} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 14, gap: 14 }}>
          {/* Next Practice */}
          <View style={{ borderRadius: 26, padding: 18, backgroundColor: card, borderWidth: 1, borderColor: border, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 10 }}>
                <Block dark={isDark} style={{ width: 90, height: 11, borderRadius: 6 }} />
                <Block dark={isDark} style={{ width: '70%', height: 26, borderRadius: 8 }} />
                <Block dark={isDark} style={{ width: '90%', height: 14, borderRadius: 6 }} />
              </View>
              <Block dark={isDark} style={{ width: 34, height: 34, borderRadius: 17 }} />
            </View>
            <Block dark={isDark} style={{ marginTop: 8, width: '100%', height: 52, borderRadius: 18 }} />
          </View>

          {/* Practice list row */}
          <View style={{ borderRadius: 18, backgroundColor: card, borderWidth: 1, borderColor: border, minHeight: 48 }} />

          {/* Sankalpa */}
          <View style={{ minHeight: 76, borderRadius: 22, backgroundColor: card, borderWidth: 1, borderColor: border }} />

          {/* Dharm Veer */}
          <View style={{ minHeight: 72, borderRadius: 22, backgroundColor: card, borderWidth: 1, borderColor: border }} />
        </View>
      </View>
    </SafeAreaView>
  );
}
