import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FEATURE_COLORS, OVERLAYS, FONTS, themeColor } from '@/lib/constants';

interface HairlineWeekThreadProps {
  days: { date: string; japa: boolean; nitya: boolean }[];
  isDark: boolean;
  theme: ReturnType<typeof themeColor>;
}

export function HairlineWeekThread({ days, isDark, theme }: HairlineWeekThreadProps) {
  const dayMap = useMemo(() => {
    const map: Record<string, { japa: boolean; nitya: boolean }> = {};
    days.forEach((d) => {
      map[d.date] = { japa: d.japa, nitya: d.nitya };
    });
    return map;
  }, [days]);

  const { weekDays, completedCount, todayIndex } = useMemo(() => {
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    // Find Monday of current week (ISO week: 1=Mon, ..., 7=Sun)
    const currentDay = today.getDay(); // 0 is Sun, 1 is Mon...
    const distanceToMonday = (currentDay + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday);

    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    let completed = 0;
    let tIdx = -1;

    const list = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const isToday = iso === todayIso;
      if (isToday) tIdx = i;

      const record = dayMap[iso];
      const isDone = Boolean(record?.japa || record?.nitya);
      if (isDone) completed++;

      return {
        iso,
        label: labels[i],
        isToday,
        isDone,
        isFuture: iso > todayIso,
      };
    });

    return { weekDays: list, completedCount: completed, todayIndex: tIdx };
  }, [dayMap]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerLabel, { color: theme.dim }]}>
          Weekly Sādhana Thread
        </Text>
        <Text style={[styles.headerCount, { color: theme.brand }]}>
          {completedCount} of 7 completed
        </Text>
      </View>

      <View style={styles.threadWrapper}>
        {/* Continuous 1px background hairline */}
        <View style={[styles.hairlineBg, { backgroundColor: theme.borderSoft }]} />

        {/* Progress overlay hairline up to today */}
        {todayIndex >= 0 && (
          <View
            style={[
              styles.hairlineProgress,
              {
                backgroundColor: theme.brand,
                width: `${Math.min(100, Math.max(10, (todayIndex / 6) * 100))}%`,
              },
            ]}
          />
        )}

        {/* 7 Daily Nodes */}
        {weekDays.map((item, idx) => {
          let nodeContent = null;
          if (item.isToday) {
            nodeContent = (
              <View
                style={[
                  styles.nodeTodayRing,
                  {
                    borderColor: theme.brand,
                    backgroundColor: theme.bg,
                  },
                ]}
              >
                <View
                  style={[
                    styles.nodeTodayDot,
                    { backgroundColor: item.isDone ? theme.brand : 'transparent' },
                  ]}
                />
              </View>
            );
          } else if (item.isDone) {
            nodeContent = (
              <View
                style={[
                  styles.nodeCompletedDot,
                  { backgroundColor: theme.brand },
                ]}
              />
            );
          } else {
            nodeContent = (
              <View
                style={[
                  styles.nodeEmptyDot,
                  {
                    backgroundColor: isDark
                      ? OVERLAYS.ivory[0.14]
                      : FEATURE_COLORS.hairlineWeekThread.surfaceLight,
                  },
                ]}
              />
            );
          }

          return (
            <View key={item.iso} style={styles.nodeColumn}>
              <View style={styles.nodeAnchor}>{nodeContent}</View>
              <Text
                style={[
                  styles.dayLabel,
                  {
                    color: item.isToday
                      ? theme.brand
                      : item.isDone
                      ? theme.text
                      : theme.dim,
                    fontFamily: item.isToday ? FONTS.sansSemiBold : FONTS.sans,
                  },
                ]}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  headerLabel: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    lineHeight: 14,
  },
  headerCount: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
    lineHeight: 14,
  },
  threadWrapper: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  hairlineBg: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 15,
    height: 1,
  },
  hairlineProgress: {
    position: 'absolute',
    left: 12,
    top: 15,
    height: 1.5,
  },
  nodeColumn: {
    alignItems: 'center',
    width: 32,
    zIndex: 2,
  },
  nodeAnchor: {
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCompletedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nodeTodayRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeTodayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  nodeEmptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dayLabel: {
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 12,
  },
});
