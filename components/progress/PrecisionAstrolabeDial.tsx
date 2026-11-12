import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { FEATURE_COLORS, OVERLAYS, COLORS, FONTS, themeColor } from '@/lib/constants';

interface PrecisionAstrolabeDialProps {
  harmonyScore: number;
  isDark: boolean;
  theme: ReturnType<typeof themeColor>;
}

export function PrecisionAstrolabeDial({
  harmonyScore,
  isDark,
  theme,
}: PrecisionAstrolabeDialProps) {
  const totalTicks = 35;
  // Scaled active ticks based on score (e.g. 108 is 100% = 35 ticks)
  const activeTicks = Math.min(
    totalTicks,
    Math.max(12, Math.round((harmonyScore / 108) * totalTicks))
  );

  const ticks = useMemo(() => {
    const cx = 120;
    const cy = 110;
    const r1 = 82;
    const r2 = 94;
    const list = [];

    for (let i = 0; i < totalTicks; i++) {
      const angleDeg = 180 - (i / (totalTicks - 1)) * 180;
      const rad = (angleDeg * Math.PI) / 180;
      const x1 = cx + r1 * Math.cos(rad);
      const y1 = cy - r1 * Math.sin(rad);
      const x2 = cx + r2 * Math.cos(rad);
      const y2 = cy - r2 * Math.sin(rad);

      const isActive = i <= activeTicks;
      list.push({
        x1: x1.toFixed(1),
        y1: y1.toFixed(1),
        x2: x2.toFixed(1),
        y2: y2.toFixed(1),
        isActive,
        isTip: i === activeTicks,
      });
    }
    return list;
  }, [activeTicks]);

  const activeColor = theme.brand;
  const inactiveColor = isDark
    ? OVERLAYS.ivory[0.1]
    : FEATURE_COLORS.precisionAstrolabeDial.inactiveColorLight;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: theme.dim }]}>
          Atma-Vichara Harmony
        </Text>
        <Text style={[styles.headerBadge, { color: COLORS.success }]}>
          Steady Calm
        </Text>
      </View>

      <View style={styles.dialWrapper}>
        <Svg width={240} height={120} viewBox="0 0 240 120">
          <Defs>
            <LinearGradient id="astrolabeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={COLORS.tilePurple} stopOpacity="0.6" />
              <Stop offset="50%" stopColor={theme.brand} />
              <Stop offset="100%" stopColor={COLORS.deityRose} />
            </LinearGradient>
          </Defs>

          {/* Precision Tick Needles */}
          {ticks.map((t, idx) => (
            <Line
              key={idx}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.isActive ? 'url(#astrolabeGradient)' : inactiveColor}
              strokeWidth={t.isTip ? 2.4 : 1.2}
              strokeLinecap="round"
            />
          ))}

          {/* Hairline baseline arc */}
          <Path
            d="M 38 110 A 82 82 0 0 1 202 110"
            fill="none"
            stroke={isDark ? OVERLAYS.ivory[0.08] : FEATURE_COLORS.precisionAstrolabeDial.strokeLight}
            strokeWidth={0.8}
          />
        </Svg>

        {/* Center Numbers */}
        <View style={styles.centerContent}>
          <Text style={[styles.scoreNumber, { color: theme.text }]}>
            {harmonyScore}
          </Text>
          <Text style={[styles.scoreLabel, { color: theme.brand }]}>
            HARMONY INDEX
          </Text>
        </View>
      </View>

      <Text style={[styles.insightQuote, { color: theme.dim, borderTopColor: theme.borderSoft }]}>
        “Daily Japa at dawn brings 42% higher mental stillness across the day.”
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    lineHeight: 14,
  },
  headerBadge: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  dialWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 125,
  },
  centerContent: {
    position: 'absolute',
    bottom: 8,
    alignItems: 'center',
  },
  scoreNumber: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -1,
  },
  scoreLabel: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 9,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    lineHeight: 12,
    marginTop: 2,
  },
  insightQuote: {
    fontFamily: FONTS.serif,
    fontStyle: 'italic',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
});
