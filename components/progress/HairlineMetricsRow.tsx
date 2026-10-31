import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { FONTS, themeColor } from '@/lib/constants';

interface HairlineMetricsRowProps {
  beads: number;
  streak: number;
  shieldsCount: number;
  theme: ReturnType<typeof themeColor>;
  onPressShields?: () => void;
}

export function HairlineMetricsRow({
  beads,
  streak,
  shieldsCount,
  theme,
  onPressShields,
}: HairlineMetricsRowProps) {
  const beadsFormatted =
    beads >= 1000 ? `${(beads / 1000).toFixed(1)}k` : String(beads);

  return (
    <View style={[styles.container, { borderColor: theme.borderSoft }]}>
      {/* Col 1: Beads */}
      <View style={styles.metricCol}>
        <Text style={[styles.metricVal, { color: theme.text }]}>
          {beadsFormatted}
        </Text>
        <Text style={[styles.metricSub, { color: theme.dim }]}>
          MĀLĀ BEADS
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.borderSoft }]} />

      {/* Col 2: Tapas Streak */}
      <View style={styles.metricCol}>
        <Text style={[styles.metricVal, { color: theme.text }]}>
          {streak > 0 ? `${streak}d` : '1d'}
        </Text>
        <Text style={[styles.metricSub, { color: theme.dim }]}>
          TAPAS STREAK
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.borderSoft }]} />

      {/* Col 3: Shields */}
      {onPressShields ? (
        <PressableSurface
          accessibilityLabel={`Sanctuary shields, ${shieldsCount} of 13 unlocked`}
          haptic="selection"
          onPress={onPressShields}
          style={styles.metricCol}
        >
          <Text style={[styles.metricVal, { color: theme.brand }]}>
            {shieldsCount}/13
          </Text>
          <Text style={[styles.metricSub, { color: theme.dim }]}>
            SHIELDS ›
          </Text>
        </PressableSurface>
      ) : (
        <View style={styles.metricCol}>
          <Text style={[styles.metricVal, { color: theme.brand }]}>
            {shieldsCount}/13
          </Text>
          <Text style={[styles.metricSub, { color: theme.dim }]}>
            SHIELDS
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 14,
    marginHorizontal: 20,
    marginVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  divider: {
    width: 1,
    height: 28,
  },
  metricVal: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  metricSub: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
    lineHeight: 12,
    textAlign: 'center',
  },
});
