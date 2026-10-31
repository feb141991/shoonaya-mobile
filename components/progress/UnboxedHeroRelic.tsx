import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { FONTS, themeColor } from '@/lib/constants';

interface UnboxedHeroRelicProps {
  streak: number;
  userName: string | null;
  isDark: boolean;
  theme: ReturnType<typeof themeColor>;
}

export function UnboxedHeroRelic({ streak, userName, isDark, theme }: UnboxedHeroRelicProps) {
  const displayNum = streak > 0 ? streak : 1;
  const relicSource = require('@/assets/relics/lotus-bloom.png');

  return (
    <View style={styles.container}>
      {/* Floating Sacred Relic with Soft Atmospheric Aura */}
      <View style={styles.relicWrapper}>
        <View
          style={[
            styles.ambientHalo,
            {
              backgroundColor: isDark
                ? 'rgba(197, 160, 89, 0.14)'
                : 'rgba(216, 138, 28, 0.12)',
            },
          ]}
        />
        <Image
          source={relicSource}
          style={styles.relicImage}
          resizeMode="contain"
          accessibilityLabel="Sacred Consecrated Lotus Relic"
        />
      </View>

      {/* Whisper-Thin Hero Numbers */}
      <View style={styles.metricBlock}>
        <Text style={[styles.heroNum, { color: theme.brand }]}>
          {displayNum}
        </Text>
        <Text style={[styles.heroLabel, { color: theme.dim }]}>
          D A Y S · O F · D E V O T I O N
        </Text>
        <Text style={[styles.quoteText, { color: theme.dim }]}>
          {streak === 0
            ? '“Begin today — every great sādhaka started with day one.”'
            : '“As the lotus rises above untouched by water, so does the mind in Japa.”'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 16,
  },
  relicWrapper: {
    width: 190,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 6,
  },
  ambientHalo: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    opacity: 0.9,
  },
  relicImage: {
    width: 150,
    height: 150,
    zIndex: 2,
  },
  metricBlock: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  heroNum: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 62,
    lineHeight: 68,
    fontWeight: '700',
    letterSpacing: -1.5,
  },
  heroLabel: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 4,
    lineHeight: 14,
  },
  quoteText: {
    fontFamily: FONTS.serif,
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 300,
  },
});
