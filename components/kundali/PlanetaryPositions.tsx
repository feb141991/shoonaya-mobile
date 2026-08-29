import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { COLORS, FONTS, TYPE, themeColor } from '@/lib/constants';
import {
  AstroChart,
  CANONICAL_GRAHA_ORDER,
  formatDegreeMinutes,
} from '@/lib/kundali-contract';
import { RASHI_MAP } from '@/lib/jyotish';

interface PlanetaryPositionsProps {
  chart: AstroChart;
  isDark: boolean;
}

const GRAHA_DISPLAY: Record<string, { en: string; symbol: string }> = {
  Surya: { en: 'Sun', symbol: '☀️' },
  Chandra: { en: 'Moon', symbol: '🌙' },
  Mangal: { en: 'Mars', symbol: '🔴' },
  Budha: { en: 'Mercury', symbol: '🟢' },
  Guru: { en: 'Jupiter', symbol: '🟡' },
  Shukra: { en: 'Venus', symbol: '⚪' },
  Shani: { en: 'Saturn', symbol: '🪐' },
  Rahu: { en: 'North Node', symbol: '🐉' },
  Ketu: { en: 'South Node', symbol: '☄️' },
};

const DIGNITY_LABELS: Record<string, { label: string; bgLight: string; textLight: string; bgDark: string; textDark: string }> = {
  exalted: {
    label: 'Exalted (Uccha)',
    bgLight: 'rgba(16, 185, 129, 0.15)',
    textLight: '#047857',
    bgDark: 'rgba(16, 185, 129, 0.25)',
    textDark: '#34D399',
  },
  debilitated: {
    label: 'Debilitated (Neecha)',
    bgLight: 'rgba(239, 68, 68, 0.15)',
    textLight: '#B91C1C',
    bgDark: 'rgba(239, 68, 68, 0.25)',
    textDark: '#F87171',
  },
  own: {
    label: 'Own Sign (Swakshetra)',
    bgLight: 'rgba(59, 130, 246, 0.15)',
    textLight: '#1D4ED8',
    bgDark: 'rgba(59, 130, 246, 0.25)',
    textDark: '#60A5FA',
  },
  neutral: {
    label: 'Neutral',
    bgLight: 'rgba(156, 163, 175, 0.15)',
    textLight: '#4B5563',
    bgDark: 'rgba(156, 163, 175, 0.25)',
    textDark: '#9CA3AF',
  },
};

export function PlanetaryPositions({ chart, isDark }: PlanetaryPositionsProps) {
  const theme = themeColor(isDark);
  const isTimeUnknown = chart.timeUnknown;

  return (
    <View style={styles.container}>
      <Card tone="auto" style={[styles.card, { backgroundColor: theme.card, borderColor: theme.premiumBorder }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Navagraha Planetary Positions</Text>
          <Text style={[styles.subtitle, { color: theme.dim }]}>
            Sidereal Nirayana Longitudes (Lahiri Ayanamsha)
          </Text>
        </View>

        {/* Table Header */}
        <View style={[styles.tableHeader, { borderBottomColor: theme.premiumBorder }]}>
          <Text style={[styles.colHeader, { flex: 2.2, color: theme.dim }]}>Graha</Text>
          <Text style={[styles.colHeader, { flex: 2.5, color: theme.dim }]}>Rashi & Degree</Text>
          <Text style={[styles.colHeader, { flex: 1.2, textAlign: 'center', color: theme.dim }]}>House</Text>
          <Text style={[styles.colHeader, { flex: 2, textAlign: 'right', color: theme.dim }]}>Status</Text>
        </View>

        {/* Graha Rows */}
        {CANONICAL_GRAHA_ORDER.map((name, idx) => {
          const pos = chart.planets[name];
          if (!pos) return null;

          const meta = GRAHA_DISPLAY[name] ?? { en: name, symbol: '✨' };
          const rashiKey = pos.rashiName?.toLowerCase() ?? '';
          const rashiMeta = RASHI_MAP[rashiKey];
          const isRetro = Boolean(pos.isRetrograde);
          const isCombust = Boolean(pos.isCombust);
          const dignityInfo = pos.dignity ? DIGNITY_LABELS[pos.dignity] : null;

          return (
            <View
              key={name}
              style={[
                styles.row,
                idx < CANONICAL_GRAHA_ORDER.length - 1
                  ? { borderBottomWidth: 1, borderBottomColor: theme.border }
                  : null,
              ]}
            >
              {/* Graha Name & Symbol */}
              <View style={[styles.cell, { flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                <Text style={styles.grahaSymbol}>{meta.symbol}</Text>
                <View>
                  <Text style={[styles.grahaName, { color: theme.text }]}>{name}</Text>
                  <Text style={[styles.grahaEn, { color: theme.dim }]}>{meta.en}</Text>
                </View>
              </View>

              {/* Rashi & Degree */}
              <View style={[styles.cell, { flex: 2.5 }]}>
                <Text style={[styles.rashiName, { color: theme.brandStrong }]} numberOfLines={1}>
                  {pos.rashiName} {rashiMeta?.symbol ?? ''}
                </Text>
                <Text style={[styles.degreeText, { color: theme.dim }]}>
                  {formatDegreeMinutes(pos.degreeInRashi)}
                </Text>
              </View>

              {/* House Number */}
              <View style={[styles.cell, { flex: 1.2, alignItems: 'center' }]}>
                <Text style={[styles.houseText, { color: isTimeUnknown ? theme.dim : theme.text }]}>
                  {isTimeUnknown ? '—' : `H${pos.house}`}
                </Text>
              </View>

              {/* Status Chips (Retro, Combust, Dignity) */}
              <View style={[styles.cell, { flex: 2, alignItems: 'flex-end', gap: 4 }]}>
                {isRetro && (
                  <View
                    accessibilityLabel="Retrograde"
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(254, 243, 199, 1)',
                        borderColor: isDark ? 'rgba(245, 158, 11, 0.5)' : 'rgba(245, 158, 11, 0.6)',
                      },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: isDark ? '#FBBF24' : '#B45309' }]}>
                      Retrograde (R)
                    </Text>
                  </View>
                )}

                {isCombust && (
                  <View
                    accessibilityLabel="Combust with Sun"
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(254, 226, 226, 1)',
                        borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.5)',
                      },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: isDark ? '#F87171' : '#B91C1C' }]}>
                      Combust (C)
                    </Text>
                  </View>
                )}

                {dignityInfo && (
                  <View
                    accessibilityLabel={dignityInfo.label}
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor: isDark ? dignityInfo.bgDark : dignityInfo.bgLight,
                      },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: isDark ? dignityInfo.textDark : dignityInfo.textLight }]}>
                      {dignityInfo.label.split(' ')[0]}
                    </Text>
                  </View>
                )}

                {!isRetro && !isCombust && !dignityInfo && (
                  <Text style={[styles.statusText, { color: theme.dim }]}>Direct</Text>
                )}
              </View>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  header: {
    gap: 2,
  },
  title: {
    ...TYPE.cardHeading,
    fontSize: 16,
  },
  subtitle: {
    ...TYPE.caption,
    fontSize: 11,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginTop: 4,
  },
  colHeader: {
    ...TYPE.caption,
    fontSize: 10,
    fontFamily: FONTS.sansSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  cell: {
    justifyContent: 'center',
  },
  grahaSymbol: {
    fontSize: 16,
  },
  grahaName: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
  },
  grahaEn: {
    ...TYPE.caption,
    fontSize: 10,
  },
  rashiName: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
  },
  degreeText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
  },
  houseText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
  },
  statusChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'transparent',
  },
  statusText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 9.5,
  },
});
