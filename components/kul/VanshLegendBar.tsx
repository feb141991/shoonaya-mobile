import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADII } from '@/lib/constants';

interface VanshLegendBarProps {
  theme: {
    card: string;
    border: string;
    text: string;
  };
}

export function VanshLegendBar({ theme }: VanshLegendBarProps) {
  return (
    <View style={[styles.legendBar, { backgroundColor: COLORS.cardBgDark, borderColor: COLORS.borderDark }]}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: COLORS.tileGold }]} />
        <Text style={[styles.legendText, { color: COLORS.onMediaWhite }]}>Pitri</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: COLORS.deityRose }]} />
        <Text style={[styles.legendText, { color: COLORS.onMediaWhite }]}>Matri</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: COLORS.tileGreen }]} />
        <Text style={[styles.legendText, { color: COLORS.onMediaWhite }]}>You</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: COLORS.tileBlue }]} />
        <Text style={[styles.legendText, { color: COLORS.onMediaWhite }]}>Next</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legendBar: {
    position: 'absolute',
    right: 12,
    top: 54,
    zIndex: 95,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADII.pill,
    borderWidth: 0.5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 9,
    fontFamily: FONTS.sansSemiBold,
  },
});
