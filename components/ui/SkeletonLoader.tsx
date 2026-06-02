import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, useColorScheme, View, type ViewStyle } from 'react-native';
import { COLORS } from '@/lib/constants';

// ── Shared shimmer animation ──────────────────────────────────────────────────

function useShimmer() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });
  return opacity;
}

// ── Base shimmer block ────────────────────────────────────────────────────────

function ShimmerBlock({ style }: { style?: ViewStyle }) {
  const isDark = useColorScheme() === 'dark';
  const opacity = useShimmer();
  const baseColor = isDark ? COLORS.borderDark : COLORS.borderLight;

  return (
    <Animated.View
      style={[{ backgroundColor: baseColor, borderRadius: 8, opacity }, style]}
    />
  );
}

// ── SkeletonCard — full card shimmer ─────────────────────────────────────────

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  const isDark = useColorScheme() === 'dark';
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;

  return (
    <View
      style={[
        {
          borderRadius: 22,
          backgroundColor: cardBg,
          borderWidth: 1,
          borderColor: border,
          padding: 18,
          gap: 12,
        },
        style,
      ]}
    >
      <ShimmerBlock style={{ height: 10, width: '40%' }} />
      <ShimmerBlock style={{ height: 22, width: '85%', borderRadius: 6 }} />
      <ShimmerBlock style={{ height: 14, width: '100%' }} />
      <ShimmerBlock style={{ height: 14, width: '70%' }} />
    </View>
  );
}

// ── SkeletonRow — list row shimmer ────────────────────────────────────────────

export function SkeletonRow({ style }: { style?: ViewStyle }) {
  const isDark = useColorScheme() === 'dark';
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;

  return (
    <View
      style={[
        {
          borderRadius: 18,
          backgroundColor: cardBg,
          borderWidth: 1,
          borderColor: border,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
        style,
      ]}
    >
      <ShimmerBlock style={{ width: 44, height: 44, borderRadius: 22 }} />
      <View style={{ flex: 1, gap: 8 }}>
        <ShimmerBlock style={{ height: 14, width: '60%' }} />
        <ShimmerBlock style={{ height: 11, width: '40%' }} />
      </View>
    </View>
  );
}

// ── SkeletonCircle ────────────────────────────────────────────────────────────

export function SkeletonCircle({ size = 48, style }: { size?: number; style?: ViewStyle }) {
  const isDark = useColorScheme() === 'dark';
  const baseColor = isDark ? COLORS.borderDark : COLORS.borderLight;
  const opacity = useShimmer();

  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: baseColor, opacity },
        style,
      ]}
    />
  );
}
