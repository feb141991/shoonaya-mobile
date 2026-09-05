import { useEffect, useRef } from 'react';
import { Animated, useColorScheme, View, type ViewStyle } from 'react-native';
import { RADII, SHADOWS, themeColor } from '@/lib/constants';
import { useReducedMotion } from '@/components/ui/Motion';

// ── Shared shimmer animation ──────────────────────────────────────────────────

function useShimmer() {
  const anim = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      anim.setValue(0.62);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, reducedMotion]);

  return reducedMotion ? 0.62 : anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });
}

// ── Base shimmer block ────────────────────────────────────────────────────────

export function ShimmerBlock({ style }: { style?: ViewStyle }) {
  const isDark = useColorScheme() === 'dark';
  const opacity = useShimmer();
  const theme = themeColor(isDark);

  return (
    <Animated.View
      style={[{ backgroundColor: theme.brandSoft, borderRadius: 8, opacity }, style]}
    />
  );
}

// ── SkeletonCard — full card shimmer ─────────────────────────────────────────

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  return (
    <View
      style={[
        {
          borderRadius: RADII.lg,
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 18,
          gap: 12,
          boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
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
  const theme = themeColor(isDark);

  return (
    <View
      style={[
        {
          borderRadius: RADII.md,
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border,
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
  const theme = themeColor(isDark);
  const opacity = useShimmer();

  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.brandSoft, opacity },
        style,
      ]}
    />
  );
}
