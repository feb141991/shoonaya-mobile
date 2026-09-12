import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Feather from '@expo/vector-icons/Feather';
import { BackButton } from '@/components/ui/BackButton';
import { useReducedMotion } from '@/components/ui/Motion';
import { SacredIcon, type SacredIconName } from '@/components/ui/SacredIcon';

const FALLBACK_GLYPHS: Record<SacredIconName, keyof typeof Feather.glyphMap> = {
  japa: 'disc',
  bhakti: 'heart',
  pathshala: 'book-open',
  mandali: 'users',
  nitya: 'sun',
  panchang: 'calendar',
  vrat: 'moon',
  shloka: 'book',
  dharmveer: 'shield',
  quiz: 'help-circle',
  mood: 'smile',
  profile: 'user',
  'live-darshan': 'video',
  progress: 'trending-up',
  'ai-guide': 'compass',
  tirtha: 'map-pin',
  seva: 'gift',
  rashiphala: 'star',
  kundali: 'compass',
};
import { COLORS, FONTS, SHADOWS, themeColor } from '@/lib/constants';

export type SacredLoaderProps = {
  /** Title shown under the breathing aura (e.g. "Invoking Today's Shloka") */
  title?: string;
  /** Subtitle / contemplative reflection (e.g. "Entering timeless contemplation...") */
  subtitle?: string;
  /** Named sacred 3D clay icon or custom fallback */
  icon?: SacredIconName;
  /** Custom glyph if not using a predefined SacredIcon (e.g. 'ॐ', '🪔', '✨') */
  customGlyph?: string;
  /** Whether to show a safe BackButton at the top left so user is never trapped */
  showBack?: boolean;
  /** Custom container style */
  style?: ViewStyle;
};

/**
 * SacredLoader — elevated, calming loading experience for Shoonaya.
 * Replaces stark, empty system spinners with a breathing golden aura,
 * sacred iconography, and contemplative typography.
 */
export function SacredLoader({
  title = 'Invoking Sacred Wisdom',
  subtitle = 'Connecting with timeless contemplation...',
  icon,
  customGlyph,
  showBack = false,
  style,
}: SacredLoaderProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  // ── Breathing Aura Animation ──────────────────────────────────────────────
  const auraAnim = useRef(new Animated.Value(0)).current;
  // ── Shimmering Progress Bar ───────────────────────────────────────────────
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      auraAnim.setValue(0.5);
      shimmerAnim.setValue(0.5);
      return;
    }

    // 1. Organic Breathing Aura Loop (4.2-second cycle)
    const auraLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(auraAnim, {
          toValue: 1,
          duration: 2100,
          useNativeDriver: true,
        }),
        Animated.timing(auraAnim, {
          toValue: 0,
          duration: 2100,
          useNativeDriver: true,
        }),
      ])
    );

    // 2. Continuous Shimmer Loop for progress beam (1.6-second cycle)
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    auraLoop.start();
    shimmerLoop.start();

    return () => {
      auraLoop.stop();
      shimmerLoop.stop();
    };
  }, [auraAnim, shimmerAnim, reducedMotion]);

  const outerScale = auraAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.93, 1.07],
  });

  const outerOpacity = auraAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.38],
  });

  const innerScale = auraAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.04],
  });

  const innerOpacity = auraAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.60],
  });

  const beamTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 60],
  });

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={[styles.container, style]}
    >
      {/* Optional Top Back Button */}
      {showBack ? (
        <View style={[styles.backButtonWrap, { top: Math.max(insets.top, 16) + 8 }]}>
          <BackButton variant="glass" />
        </View>
      ) : null}

      {/* ── Central Sacred Aura ── */}
      <View style={styles.auraCenter}>
        {/* Ambient Soft Glow Behind Aura */}
        <View
          pointerEvents="none"
          style={[
            styles.ambientGlow,
            { backgroundColor: theme.brandSoft, opacity: isDark ? 0.45 : 0.25 },
          ]}
        />

        {/* Outer Breathing Ring */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ringOuter,
            {
              borderColor: theme.brand,
              opacity: reducedMotion ? 0.22 : outerOpacity,
              transform: [{ scale: reducedMotion ? 1 : outerScale }],
            },
          ]}
        />

        {/* Inner Breathing Ring */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ringInner,
            {
              borderColor: theme.brand,
              opacity: reducedMotion ? 0.35 : innerOpacity,
              transform: [{ scale: reducedMotion ? 1 : innerScale }],
            },
          ]}
        />

        {/* Central Icon Well */}
        <View
          style={[
            styles.iconWell,
            {
              backgroundColor: isDark ? 'rgba(28, 24, 20, 0.85)' : 'rgba(255, 253, 248, 0.95)',
              borderColor: theme.premiumBorder,
              boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
            },
          ]}
        >
          {icon ? (
            <SacredIcon
              name={icon}
              size={36}
              fallbackGlyph={FALLBACK_GLYPHS[icon] ?? 'star'}
              color={theme.brand}
            />
          ) : customGlyph ? (
            <Text style={[styles.glyphText, { color: theme.brand }]}>{customGlyph}</Text>
          ) : (
            <Text style={[styles.glyphText, { color: theme.brand }]}>ॐ</Text>
          )}
        </View>
      </View>

      {/* ── Contemplative Typography ── */}
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.dim }]}>{subtitle}</Text>
        ) : null}

        {/* Elegant Minimalist Shimmer Beam */}
        <View style={[styles.shimmerTrack, { backgroundColor: theme.borderSoft }]}>
          <Animated.View
            style={[
              styles.shimmerBeam,
              {
                backgroundColor: theme.brand,
                transform: [{ translateX: reducedMotion ? 0 : beamTranslateX }],
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * SacredScreenLoader — full-screen drop-in replacement for bare ActivityIndicator.
 * Wraps in a themed ambient gradient background with edge-to-edge support.
 */
export function SacredScreenLoader(props: SacredLoaderProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <View style={styles.fullscreen}>
      <LinearGradient
        colors={
          isDark
            ? [COLORS.heroBgDark, COLORS.darkBg, COLORS.homeHeroDark]
            : [COLORS.brandAccentLight, COLORS.creamBg, COLORS.homeHeroLight]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SacredLoader {...props} showBack={props.showBack ?? true} />
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    position: 'relative',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  backButtonWrap: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
  },
  auraCenter: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ambientGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  ringOuter: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.2,
  },
  ringInner: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 1,
  },
  iconWell: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  glyphText: {
    fontFamily: FONTS.serif,
    fontSize: 32,
    lineHeight: 38,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 28,
    gap: 8,
  },
  title: {
    fontFamily: FONTS.serif,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.sans,
    fontSize: 13.5,
    lineHeight: 20,
    letterSpacing: 0.4,
    textAlign: 'center',
    maxWidth: 290,
  },
  shimmerTrack: {
    width: 120,
    height: 3,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 18,
    position: 'relative',
  },
  shimmerBeam: {
    width: 50,
    height: '100%',
    borderRadius: 999,
  },
});
