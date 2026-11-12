import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { FEATURE_COLORS, OVERLAYS, COLORS, FONTS, themeColor } from '@/lib/constants';

interface SlenderNeedlesChartProps {
  dowCounts: number[];
  totalBeads: number;
  isDark: boolean;
  theme: ReturnType<typeof themeColor>;
}

export function SlenderNeedlesChart({
  dowCounts,
  totalBeads,
  isDark,
  theme,
}: SlenderNeedlesChartProps) {
  const [selectedFilter, setSelectedFilter] = useState<'WEEK' | 'MONTH' | 'MASA'>('WEEK');

  // Map Sunday-first counts to Monday-first (0=Sun, 1=Mon, ..., 6=Sat)
  // Monday-first order: 1, 2, 3, 4, 5, 6, 0
  const mondayOrdered = [
    dowCounts[1] || 0,
    dowCounts[2] || 0,
    dowCounts[3] || 0,
    dowCounts[4] || 0,
    dowCounts[5] || 0,
    dowCounts[6] || 0,
    dowCounts[0] || 0,
  ];

  const maxVal = Math.max(...mondayOrdered, 1);
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const todayDow = new Date().getDay(); // 0 is Sun, 1 is Mon...
  const todayMondayIdx = (todayDow + 6) % 7;

  return (
    <View style={styles.container}>
      {/* Whisper Filter Bar */}
      <View style={[styles.filterBar, { borderBottomColor: theme.borderSoft }]}>
        {(['WEEK', 'MONTH', 'MASA'] as const).map((filter) => {
          const isActive = selectedFilter === filter;
          return (
            <PressableSurface
              key={filter}
              accessibilityLabel={`Filter by ${filter}`}
              haptic="selection"
              onPress={() => setSelectedFilter(filter)}
              style={styles.filterItem}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color: isActive ? theme.brand : theme.dim,
                    fontFamily: isActive ? FONTS.sansSemiBold : FONTS.sansMedium,
                  },
                ]}
              >
                {filter}
              </Text>
              {isActive && (
                <View style={[styles.filterIndicator, { backgroundColor: theme.brand }]} />
              )}
            </PressableSurface>
          );
        })}
      </View>

      {/* Metric Headline */}
      <View style={styles.metricHeader}>
        <Text style={[styles.metricBig, { color: theme.text }]}>
          {totalBeads.toLocaleString()}
        </Text>
        <View style={styles.diffRow}>
          <Text style={[styles.diffSpark, { color: COLORS.success }]}>
            ▲ 14%
          </Text>
          <Text style={[styles.diffText, { color: theme.dim }]}>
            steady rhythm in daily repetition
          </Text>
        </View>
      </View>

      {/* Slender Needles Chart */}
      <View style={styles.chartWrapper}>
        <View style={[styles.needlesFrame, { borderBottomColor: theme.borderSoft }]}>
          {mondayOrdered.map((val, idx) => {
            const isToday = idx === todayMondayIdx;
            const pct = Math.max(16, Math.round((val / maxVal) * 100));
            const needleColor = isToday
              ? theme.brand
              : val > 0
              ? isDark
                ? OVERLAYS.ivory[0.45]
                : FEATURE_COLORS.slenderNeedlesChart.needleColorLight
              : isDark
              ? OVERLAYS.ivory[0.14]
              : FEATURE_COLORS.slenderNeedlesChart.needleColorLight2;

            return (
              <View key={idx} style={styles.needleCol}>
                <View style={styles.needleTrack}>
                  <View
                    style={[
                      styles.needleStalk,
                      {
                        height: `${pct}%`,
                        backgroundColor: needleColor,
                        width: isToday ? 3 : 2,
                      },
                    ]}
                  >
                    {/* Glowing jewel at top */}
                    <View
                      style={[
                        styles.needleJewel,
                        {
                          backgroundColor: isToday ? theme.brand : needleColor,
                          width: isToday ? 7 : 5,
                          height: isToday ? 7 : 5,
                          borderRadius: isToday ? 3.5 : 2.5,
                        },
                      ]}
                    />
                  </View>
                </View>
                <Text
                  style={[
                    styles.dayLabel,
                    {
                      color: isToday ? theme.brand : theme.dim,
                      fontFamily: isToday ? FONTS.sansSemiBold : FONTS.sans,
                    },
                  ]}
                >
                  {labels[idx]}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 22,
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 18,
  },
  filterItem: {
    position: 'relative',
    paddingVertical: 4,
  },
  filterText: {
    fontSize: 10,
    letterSpacing: 2,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  filterIndicator: {
    position: 'absolute',
    bottom: -11,
    left: 0,
    right: 0,
    height: 1.5,
  },
  metricHeader: {
    marginBottom: 16,
  },
  metricBig: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -1,
  },
  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  diffSpark: {
    fontSize: 11,
    fontFamily: FONTS.sansSemiBold,
    lineHeight: 14,
  },
  diffText: {
    fontSize: 11,
    fontFamily: FONTS.sans,
    lineHeight: 14,
  },
  chartWrapper: {
    marginTop: 8,
  },
  needlesFrame: {
    height: 140,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingBottom: 4,
  },
  needleCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  needleTrack: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  needleStalk: {
    borderRadius: 1.5,
    alignItems: 'center',
    position: 'relative',
  },
  needleJewel: {
    position: 'absolute',
    top: -3,
  },
  dayLabel: {
    fontSize: 10,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 12,
  },
});
