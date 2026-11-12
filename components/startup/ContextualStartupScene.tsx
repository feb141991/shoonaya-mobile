import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppLanguage, SacredTimePeriod, StartupScene } from '@/lib/startup-scenes/types';
import { getStartupGreeting, resolveSacredTimePeriod } from '@/lib/startup-scenes/selector';
import { FEATURE_COLORS, OVERLAYS, COLORS, FONTS } from '@/lib/constants';

interface ContextualStartupSceneProps {
  scene: StartupScene;
  tradition?: string | null;
  timezone?: string | null;
  language?: AppLanguage;
  now?: Date;
  onArtworkReady?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Tonal sacred-time overlay washes.
 * Enhances contrast, depth, and sacred mood without requiring heavy bitmap duplicates.
 */
const TIME_WASH_GRADIENTS: Record<SacredTimePeriod, [string, string, string]> = {
  early_morning: [FEATURE_COLORS.contextualStartupScene.timeWashGradientsEarlyMorningStart, FEATURE_COLORS.contextualStartupScene.timeWashGradientsEarlyMorningMiddle, FEATURE_COLORS.contextualStartupScene.timeWashGradientsEarlyMorningEnd],
  daytime: [FEATURE_COLORS.contextualStartupScene.timeWashGradientsDaytimeStart, OVERLAYS.black[0.15], FEATURE_COLORS.contextualStartupScene.timeWashGradientsDaytimeEnd],
  evening: [FEATURE_COLORS.contextualStartupScene.timeWashGradientsEveningStart, FEATURE_COLORS.contextualStartupScene.timeWashGradientsEveningMiddle, FEATURE_COLORS.contextualStartupScene.timeWashGradientsEveningEnd],
  night: [FEATURE_COLORS.contextualStartupScene.timeWashGradientsNightStart, FEATURE_COLORS.contextualStartupScene.timeWashGradientsNightMiddle, FEATURE_COLORS.contextualStartupScene.timeWashGradientsNightEnd],
};

export const ContextualStartupScene: React.FC<ContextualStartupSceneProps> = ({
  scene,
  tradition,
  timezone,
  language = 'en',
  now = new Date(),
  onArtworkReady,
}) => {
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(false);

  const sacredPeriod = resolveSacredTimePeriod(timezone, now);
  const greeting = getStartupGreeting({ tradition, timezone, language, now });
  const timeWash = TIME_WASH_GRADIENTS[sacredPeriod] ?? TIME_WASH_GRADIENTS.early_morning;

  // Gentle breathing pulse animation for the sacred bindu
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) setReduceMotion(enabled);
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        setReduceMotion(enabled);
      }
    );

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      pulseAnim.setValue(0.5);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, reduceMotion]);

  const binduScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35],
  });

  const binduGlowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.85],
  });

  const isLightText = scene.textTreatment !== 'dark';
  const textColor = isLightText ? COLORS.cardBgLight : FEATURE_COLORS.contextualStartupScene.onLightText;
  const subtextColor = isLightText ? FEATURE_COLORS.contextualStartupScene.onDarkSubtext : FEATURE_COLORS.contextualStartupScene.onLightSubtext;
  const chipBg = isLightText ? OVERLAYS.white[0.14] : OVERLAYS.black[0.08];
  const chipBorder = isLightText ? OVERLAYS.white[0.24] : OVERLAYS.black[0.15];

  const accessibilityText = scene.accessibilityLabel[language] || scene.accessibilityLabel.en;

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={accessibilityText}
    >
      {/* 1. Edge-to-Edge Local Artwork with Focal Point Framing */}
      <Image
        source={scene.source}
        onLoad={onArtworkReady}
        onError={onArtworkReady}
        style={[
          StyleSheet.absoluteFill,
          {
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
            transform: [
              {
                translateX: (0.5 - (scene.focalPoint?.x ?? 0.5)) * SCREEN_WIDTH * 0.15,
              },
              {
                translateY: (0.5 - (scene.focalPoint?.y ?? 0.5)) * SCREEN_HEIGHT * 0.15,
              },
            ],
          },
        ]}
        resizeMode={scene.cropMode === 'contain' ? 'contain' : 'cover'}
      />

      {/* 2. Sacred-Time Tonal Wash & Readability Gradient */}
      <LinearGradient
        colors={timeWash}
        locations={[0.0, 0.45, 1.0]}
        style={StyleSheet.absoluteFill}
      />

      {/* 3. Top Sacred Header: Wordmark & Breathing Bindu */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 24) + 16 }]}>
        <View style={styles.brandRow}>
          <Text style={[styles.brandText, { color: textColor }]}>
            Sho<Text style={styles.brandInfinity}>∞</Text>naya
          </Text>
        </View>

        {/* Sacred Pulsing Bindu */}
        <View style={styles.binduContainer}>
          <Animated.View
            style={[
              styles.binduGlow,
              {
                opacity: binduGlowOpacity,
                transform: [{ scale: binduScale }],
              },
            ]}
          />
          <View style={styles.binduCore} />
        </View>
      </View>

      {/* 4. Bottom Devotional Greetings Section */}
      <View style={[styles.bottomContent, { paddingBottom: Math.max(insets.bottom, 24) + 36 }]}>
        {/* Sacred Period Chip */}
        <View style={[styles.periodChip, { backgroundColor: chipBg, borderColor: chipBorder }]}>
          <View style={styles.chipDot} />
          <Text style={[styles.periodText, { color: textColor }]}>
            {greeting.periodName.toUpperCase()}
          </Text>
        </View>

        {/* Localized Sacred Title */}
        <Text style={[styles.greetingTitle, { color: textColor }]}>
          {greeting.title}
        </Text>

        {/* Localized Subtitle */}
        <Text style={[styles.greetingSubtitle, { color: subtextColor }]}>
          {greeting.subtitle}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.darkBg,
    zIndex: 999,
    justifyContent: 'space-between',
  },
  topHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontFamily: FONTS.serif,
    fontSize: 26,
    letterSpacing: 1.5,
  },
  brandInfinity: {
    fontFamily: FONTS.serif,
    fontSize: 26,
    color: COLORS.brandGold,
  },
  binduContainer: {
    marginTop: 14,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  binduGlow: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.brandGold,
  },
  binduCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.cardBgLight,
  },
  bottomContent: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  periodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    marginBottom: 16,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.brandGold,
    marginRight: 8,
  },
  periodText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
    letterSpacing: 1.8,
  },
  greetingTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 32,
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 10,
  },
  greetingSubtitle: {
    fontFamily: FONTS.sans,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
});
