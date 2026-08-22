import { useEffect, useRef } from 'react';
import { Animated, Easing, useColorScheme, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/lib/constants';
import { useReducedMotion } from '@/components/ui/Motion';

// Content-shaped loading placeholder matching the real Home layout (Hero,
// Shloka fold, Smart Sadhana CTA, Practices row, Sankalpa row, Dharm Veer row)
// to prevent any vertical layout shift upon data arrival.
// Uses one single opacity-based shimmer loop driver across all placeholders.

function Block({ style, dark }: { style: StyleProp<ViewStyle>; dark: boolean }) {
  const color = dark ? COLORS.homeSkeletonPlaceholderDark : COLORS.homeSkeletonPlaceholderLight;
  return <View style={[{ backgroundColor: color, borderRadius: 8 }, style]} />;
}

const HERO_MIN_HEIGHT = 420;
const HERO_SHLOKA_TOP_SPACE = 42;

export function HomeSkeleton({ tradition: _tradition }: { tradition?: string | null } = {}) {
  const isDark = useColorScheme() === 'dark';
  const background = isDark ? COLORS.darkBg : COLORS.creamBg;
  const hero = isDark ? COLORS.homeHeroDark : COLORS.homeHeroLight;
  const card = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;

  const reducedMotion = useReducedMotion();
  const shimmer = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (reducedMotion) {
      shimmer.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.5,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [reducedMotion, shimmer]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: background }}
      edges={['top']}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading Home"
      aria-busy={true}
    >
      <View style={{ flex: 1 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {/* Hero */}
        <View style={{ minHeight: HERO_MIN_HEIGHT, width: '100%', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 34, backgroundColor: hero, justifyContent: 'flex-start' }}>
          <Animated.View style={{ opacity: shimmer }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Block dark={isDark} style={{ width: 44, height: 44, borderRadius: 22 }} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Block dark={isDark} style={{ width: 60, height: 44, borderRadius: 22 }} />
                <Block dark={isDark} style={{ width: 48, height: 48, borderRadius: 24 }} />
              </View>
            </View>
            <View style={{ marginTop: 18 }}>
              <Block dark={isDark} style={{ width: '64%', height: 24, borderRadius: 8 }} />
              <Block dark={isDark} style={{ marginTop: 8, width: '45%', height: 12, borderRadius: 6 }} />
              <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
                <Block dark={isDark} style={{ width: 140, height: 40, borderRadius: 20 }} />
                <Block dark={isDark} style={{ width: 110, height: 40, borderRadius: 20 }} />
              </View>
            </View>
          </Animated.View>

          {/* Shloka fold */}
          <View
            style={{
              marginTop: HERO_SHLOKA_TOP_SPACE,
              marginHorizontal: -20,
              marginBottom: -34,
              paddingHorizontal: 24,
              paddingTop: 12,
              paddingBottom: 34,
              alignItems: 'center',
              backgroundColor: background,
            }}
          >
            <Animated.View style={{ width: '100%', alignItems: 'center', opacity: shimmer }}>
              <Block dark={isDark} style={{ width: 110, height: 11, borderRadius: 6 }} />
              <Block dark={isDark} style={{ marginTop: 12, width: '76%', height: 20, borderRadius: 8 }} />
              <Block dark={isDark} style={{ marginTop: 10, width: '60%', height: 14, borderRadius: 6 }} />
            </Animated.View>
          </View>
        </View>

        {/* Below fold: Content-shaped cards matching real Home components */}
        <Animated.View style={{ opacity: shimmer, paddingHorizontal: 20, marginTop: 12, gap: 12 }}>
          {/* Smart daily Sadhana CTA */}
          <View
            style={{
              borderRadius: 22,
              paddingHorizontal: 14,
              paddingVertical: 11,
              backgroundColor: card,
              borderWidth: 1,
              borderColor: border,
              gap: 9,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Block dark={isDark} style={{ width: 42, height: 42, borderRadius: 14 }} />
              <View style={{ flex: 1, gap: 5 }}>
                <Block dark={isDark} style={{ width: '55%', height: 16, borderRadius: 6 }} />
                <Block dark={isDark} style={{ width: '40%', height: 12, borderRadius: 5 }} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Block dark={isDark} style={{ width: 115, height: 12, borderRadius: 5 }} />
              <Block dark={isDark} style={{ width: 88, height: 32, borderRadius: 16 }} />
            </View>
          </View>

          {/* Practices ("View all practices") row */}
          <View
            style={{
              minHeight: 44,
              borderRadius: 22,
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: card,
              borderWidth: 1,
              borderColor: border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Block dark={isDark} style={{ width: 120, height: 13, borderRadius: 6 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Block dark={isDark} style={{ width: 32, height: 12, borderRadius: 5 }} />
              <Block dark={isDark} style={{ width: 14, height: 14, borderRadius: 7 }} />
            </View>
          </View>

          {/* Sankalpa row */}
          <View
            style={{
              minHeight: 64,
              borderRadius: 22,
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: card,
              borderWidth: 1,
              borderColor: border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Block dark={isDark} style={{ width: 40, height: 40, borderRadius: 14 }} />
            <View style={{ flex: 1, gap: 5 }}>
              <Block dark={isDark} style={{ width: '68%', height: 14, borderRadius: 6 }} />
              <Block dark={isDark} style={{ width: '42%', height: 11, borderRadius: 5 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Block dark={isDark} style={{ width: 24, height: 24, borderRadius: 12 }} />
              <Block dark={isDark} style={{ width: 32, height: 32, borderRadius: 16 }} />
            </View>
          </View>

          {/* Dharm Veer row */}
          <View
            style={{
              minHeight: 70,
              borderRadius: 22,
              paddingHorizontal: 16,
              paddingVertical: 11,
              backgroundColor: card,
              borderWidth: 1,
              borderColor: border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
              <Block dark={isDark} style={{ width: 40, height: 40, borderRadius: 14 }} />
              <View style={{ flex: 1, gap: 4 }}>
                <Block dark={isDark} style={{ width: 75, height: 10, borderRadius: 5 }} />
                <Block dark={isDark} style={{ width: '55%', height: 14, borderRadius: 6 }} />
                <Block dark={isDark} style={{ width: '42%', height: 11, borderRadius: 5 }} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Block dark={isDark} style={{ width: 54, height: 22, borderRadius: 11 }} />
              <Block dark={isDark} style={{ width: 14, height: 14, borderRadius: 7 }} />
            </View>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
