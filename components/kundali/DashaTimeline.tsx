import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, TYPE, themeColor } from '@/lib/constants';
import {
  AstroChart,
  calculateDashaProgress,
  DashaEntry,
} from '@/lib/kundali-contract';

interface DashaTimelineProps {
  chart: AstroChart;
  isDark: boolean;
}

const DASHA_ORDER = [
  'Ketu', 'Shukra', 'Surya', 'Chandra', 'Mangal', 'Rahu', 'Guru', 'Shani', 'Budha',
];

const DASHA_YEARS: Record<string, number> = {
  Ketu: 6, Shukra: 20, Surya: 6, Chandra: 10, Mangal: 7, Rahu: 18, Guru: 16, Shani: 19, Budha: 17,
};

function getSubAntardashaDates(dashaEntry: DashaEntry): Array<{ planet: string; startDate: string; endDate: string }> {
  const startMs = new Date(dashaEntry.startDate).getTime();
  const endMs = new Date(dashaEntry.endDate).getTime();
  const durMs = endMs - startMs;
  const order = DASHA_ORDER.indexOf(dashaEntry.planet);
  if (order === -1 || isNaN(durMs) || durMs <= 0) return [];

  let cursor = startMs;
  return DASHA_ORDER.map((_, i) => {
    const sub = DASHA_ORDER[(order + i) % 9];
    const dur = (DASHA_YEARS[sub] / 120) * durMs;
    const subEnd = Math.min(cursor + dur, endMs);
    const entry = {
      planet: sub,
      startDate: new Date(cursor).toISOString().split('T')[0],
      endDate: new Date(subEnd).toISOString().split('T')[0],
    };
    cursor = subEnd;
    return entry;
  });
}

function formatDate(isoStr: string | undefined | null): string {
  if (!isoStr) return '—';
  try {
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return isoStr;
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return isoStr;
  }
}

export function DashaTimeline({ chart, isDark }: DashaTimelineProps) {
  const theme = themeColor(isDark);
  const dashaInfo = chart.dasha;
  const currentDasha = dashaInfo?.current;
  const currentAntardasha = dashaInfo?.currentAntardasha;

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const progressPercent = calculateDashaProgress(
    currentDasha?.startDate,
    currentDasha?.endDate
  );

  return (
    <View style={styles.container}>
      {/* Active Dasha Hero Card */}
      {currentDasha ? (
        <Card tone="auto" style={[styles.activeCard, { backgroundColor: theme.card, borderColor: theme.premiumBorder }]}>
          <View style={styles.activeHeader}>
            <View style={[styles.activeBadge, { backgroundColor: theme.brandSoft, borderColor: theme.premiumBorder }]}>
              <Feather name="clock" size={13} color={theme.brand} />
              <Text style={[styles.activeBadgeText, { color: theme.brandStrong }]}>Active Mahadasha</Text>
            </View>
            <Text style={[styles.progressText, { color: theme.brandStrong }]}>{progressPercent}% Elapsed</Text>
          </View>

          <Text style={[styles.activePlanet, { color: theme.text }]}>
            {currentDasha.planet} Mahadasha
          </Text>

          {currentAntardasha ? (
            <Text style={[styles.activeSub, { color: theme.dim }]}>
              Sub-period: {currentAntardasha.planet} Antardasha ({formatDate(currentAntardasha.startDate)} – {formatDate(currentAntardasha.endDate)})
            </Text>
          ) : null}

          {/* Visual Progress Bar */}
          <View style={[styles.progressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%`, backgroundColor: theme.brand },
              ]}
            />
          </View>

          <View style={styles.dateRow}>
            <Text style={[styles.dateText, { color: theme.dim }]}>
              Begins: {formatDate(currentDasha.startDate)}
            </Text>
            <Text style={[styles.dateText, { color: theme.dim }]}>
              Ends: {formatDate(currentDasha.endDate)}
            </Text>
          </View>
        </Card>
      ) : null}

      {/* 9-Period Vimshottari Timeline Card */}
      <Card tone="auto" style={[styles.timelineCard, { backgroundColor: theme.card, borderColor: theme.premiumBorder }]}>
        <View style={styles.timelineHeader}>
          <Text style={[styles.timelineTitle, { color: theme.text }]}>Vimshottari Dasha Sequence</Text>
          <Text style={[styles.timelineSub, { color: theme.dim }]}>
            120-Year Planetary Life Timeline (Tap a cycle to expand sub-periods)
          </Text>
        </View>

        <View style={styles.timelineList}>
          {dashaInfo?.timeline?.map((entry, idx) => {
            const isCurrent = Boolean(entry.isCurrent);
            const isExpanded = expandedIndex === idx;
            const subPeriods = isExpanded ? getSubAntardashaDates(entry) : [];

            return (
              <View key={`dasha-${entry.planet}-${idx}`} style={styles.timelineEntry}>
                <PressableSurface
                  haptic="selection"
                  onPress={() => setExpandedIndex(isExpanded ? null : idx)}
                  style={[
                    styles.entryRow,
                    isCurrent
                      ? {
                          backgroundColor: theme.brandSoft,
                          borderColor: theme.brand,
                          borderWidth: 1,
                        }
                      : {
                          backgroundColor: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight,
                          borderColor: theme.border,
                          borderWidth: 1,
                        },
                  ]}
                >
                  <View style={styles.entryLeft}>
                    <Text style={[styles.entryPlanet, { color: isCurrent ? theme.brandStrong : theme.text }]}>
                      {entry.planet} ({entry.years}y)
                    </Text>
                    <Text style={[styles.entryDates, { color: theme.dim }]}>
                      {formatDate(entry.startDate)} – {formatDate(entry.endDate)}
                    </Text>
                  </View>

                  <View style={styles.entryRight}>
                    {isCurrent ? (
                      <View style={[styles.nowBadge, { backgroundColor: theme.brand }]}>
                        <Text style={[styles.nowBadgeText, { color: COLORS.ink }]}>NOW</Text>
                      </View>
                    ) : null}
                    <Feather
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={theme.dim}
                    />
                  </View>
                </PressableSurface>

                {/* Expanded Sub-periods (Antardasha) */}
                {isExpanded && subPeriods.length > 0 ? (
                  <View style={[styles.subPeriodContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', borderColor: theme.border }]}>
                    <Text style={[styles.subPeriodHeader, { color: theme.dim }]}>Antardashas within {entry.planet}:</Text>
                    {subPeriods.map((sub, sIdx) => (
                      <View key={`sub-${sub.planet}-${sIdx}`} style={styles.subPeriodRow}>
                        <Text style={[styles.subPlanet, { color: theme.text }]}>{sub.planet}</Text>
                        <Text style={[styles.subDates, { color: theme.dim }]}>
                          {formatDate(sub.startDate)} – {formatDate(sub.endDate)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  activeCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  activeBadgeText: {
    ...TYPE.chip,
    fontSize: 10.5,
    fontFamily: FONTS.sansSemiBold,
    textTransform: 'uppercase',
  },
  progressText: {
    ...TYPE.caption,
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
  },
  activePlanet: {
    ...TYPE.cardHeading,
    fontSize: 20,
  },
  activeSub: {
    ...TYPE.caption,
    fontSize: 12,
    marginTop: -4,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: {
    ...TYPE.caption,
    fontSize: 11,
  },
  timelineCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
  },
  timelineHeader: {
    gap: 2,
  },
  timelineTitle: {
    ...TYPE.cardHeading,
    fontSize: 16,
  },
  timelineSub: {
    ...TYPE.caption,
    fontSize: 11,
  },
  timelineList: {
    gap: 8,
  },
  timelineEntry: {
    gap: 4,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
  },
  entryLeft: {
    gap: 2,
  },
  entryPlanet: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
  },
  entryDates: {
    ...TYPE.caption,
    fontSize: 11,
  },
  entryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nowBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nowBadgeText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  subPeriodContainer: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginLeft: 12,
    marginTop: 2,
  },
  subPeriodHeader: {
    ...TYPE.caption,
    fontSize: 10.5,
    fontFamily: FONTS.sansSemiBold,
  },
  subPeriodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  subPlanet: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11.5,
  },
  subDates: {
    ...TYPE.caption,
    fontSize: 10.5,
  },
});
