import { useMemo } from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import Svg, { G, Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import { Card } from '@/components/ui/Card';
import { COLORS, FONTS, TYPE, themeColor } from '@/lib/constants';
import {
  AstroChart,
  CANONICAL_GRAHA_ORDER,
  GRAHA_ABBREVIATIONS,
  RASHI_NAMES_SA,
} from '@/lib/kundali-contract';

interface VedicDiamondChartProps {
  chart: AstroChart;
  isDark: boolean;
  size?: number;
}

// Coordinates for Rashi number text and Planet items per house (in a 340x340 viewBox)
const HOUSE_COORDINATES: Record<
  number,
  { rashiX: number; rashiY: number; planetX: number; planetStartY: number; deltaY: number }
> = {
  // House 1 (Top Center Diamond)
  1: { rashiX: 170, rashiY: 135, planetX: 170, planetStartY: 65, deltaY: 15 },
  // House 2 (Top Left Triangle)
  2: { rashiX: 95, rashiY: 55, planetX: 65, planetStartY: 30, deltaY: 14 },
  // House 3 (Left Top Triangle)
  3: { rashiX: 55, rashiY: 95, planetX: 30, planetStartY: 65, deltaY: 14 },
  // House 4 (Left Diamond)
  4: { rashiX: 135, rashiY: 170, planetX: 65, planetStartY: 170, deltaY: 15 },
  // House 5 (Left Bottom Triangle)
  5: { rashiX: 55, rashiY: 245, planetX: 30, planetStartY: 275, deltaY: 14 },
  // House 6 (Bottom Left Triangle)
  6: { rashiX: 95, rashiY: 285, planetX: 65, planetStartY: 315, deltaY: 14 },
  // House 7 (Bottom Center Diamond)
  7: { rashiX: 170, rashiY: 205, planetX: 170, planetStartY: 275, deltaY: 15 },
  // House 8 (Bottom Right Triangle)
  8: { rashiX: 245, rashiY: 285, planetX: 275, planetStartY: 315, deltaY: 14 },
  // House 9 (Right Bottom Triangle)
  9: { rashiX: 285, rashiY: 245, planetX: 310, planetStartY: 275, deltaY: 14 },
  // House 10 (Right Diamond)
  10: { rashiX: 205, rashiY: 170, planetX: 275, planetStartY: 170, deltaY: 15 },
  // House 11 (Right Top Triangle)
  11: { rashiX: 285, rashiY: 95, planetX: 310, planetStartY: 65, deltaY: 14 },
  // House 12 (Top Right Triangle)
  12: { rashiX: 245, rashiY: 55, planetX: 275, planetStartY: 30, deltaY: 14 },
};

export function VedicDiamondChart({ chart, isDark, size = 340 }: VedicDiamondChartProps) {
  const theme = themeColor(isDark);

  const lagnaIndex = chart.lagna?.rashiIndex ?? 0;
  const isTimeUnknown = chart.timeUnknown;

  // Group planets by their assigned house (1–12)
  const planetsByHouse = useMemo(() => {
    const map: Record<number, Array<{ abbr: string; isRetro: boolean; isCombust: boolean; dignity?: string }>> = {
      1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
      7: [], 8: [], 9: [], 10: [], 11: [], 12: [],
    };

    if (isTimeUnknown) return map;

    // Add Lagna indicator in House 1
    map[1].push({
      abbr: 'Asc',
      isRetro: false,
      isCombust: false,
    });

    for (const name of CANONICAL_GRAHA_ORDER) {
      const pos = chart.planets[name];
      if (!pos || typeof pos.house !== 'number') continue;
      const h = Math.max(1, Math.min(12, pos.house));
      const abbr = GRAHA_ABBREVIATIONS[name] ?? name.slice(0, 2);
      map[h].push({
        abbr,
        isRetro: Boolean(pos.isRetrograde),
        isCombust: Boolean(pos.isCombust),
        dignity: pos.dignity,
      });
    }

    return map;
  }, [chart, isTimeUnknown]);

  if (isTimeUnknown) {
    return (
      <Card tone="auto" style={[styles.card, { backgroundColor: theme.card, borderColor: theme.premiumBorder }]}>
        <View style={styles.withheldContainer}>
          <RNText style={[styles.withheldTitle, { color: theme.brandStrong }]}>
            Chart Withheld
          </RNText>
          <RNText style={[styles.withheldBody, { color: theme.dim }]}>
            North Indian Diamond chart houses and Lagna divisions require a known birth time.
            Explore your Moon sign, Nakshatra, and Dasha in the Identity and Dasha tabs.
          </RNText>
        </View>
      </Card>
    );
  }

  // Theme colors for SVG
  const strokeColor = isDark ? 'rgba(197, 160, 89, 0.45)' : 'rgba(180, 130, 60, 0.55)';
  const innerDiamondStroke = isDark ? 'rgba(212, 175, 55, 0.75)' : 'rgba(160, 110, 40, 0.85)';
  const rashiNumberColor = isDark ? 'rgba(255, 240, 200, 0.45)' : 'rgba(130, 100, 50, 0.6)';
  const planetTextColor = isDark ? '#FFF9E6' : '#2A1A0A';
  const retroColor = isDark ? '#F59E0B' : '#D97706';
  const ascColor = isDark ? '#60A5FA' : '#2563EB';

  const VIEW_SIZE = 340;

  return (
    <Card tone="auto" style={[styles.card, { backgroundColor: theme.card, borderColor: theme.premiumBorder }]}>
      <View style={styles.chartHeader}>
        <RNText style={[styles.chartTitle, { color: theme.text }]}>Lagna Kundali (D-1)</RNText>
        <RNText style={[styles.chartSubtitle, { color: theme.dim }]}>
          Ascendant: {RASHI_NAMES_SA[lagnaIndex]} ({lagnaIndex + 1}) · Whole Sign
        </RNText>
      </View>

      <View style={styles.svgWrapper}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}>
          {/* Outer Border */}
          <Rect
            x="2"
            y="2"
            width={VIEW_SIZE - 4}
            height={VIEW_SIZE - 4}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.8"
            rx="4"
          />

          {/* Diagonals */}
          <Line x1="2" y1="2" x2={VIEW_SIZE - 2} y2={VIEW_SIZE - 2} stroke={strokeColor} strokeWidth="1.2" />
          <Line x1="2" y1={VIEW_SIZE - 2} x2={VIEW_SIZE - 2} y2="2" stroke={strokeColor} strokeWidth="1.2" />

          {/* Inner Diamond */}
          <Polygon
            points={`${VIEW_SIZE / 2},2 2,${VIEW_SIZE / 2} ${VIEW_SIZE / 2},${VIEW_SIZE - 2} ${VIEW_SIZE - 2},${VIEW_SIZE / 2}`}
            fill="none"
            stroke={innerDiamondStroke}
            strokeWidth="1.6"
          />

          {/* Houses Render */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((houseNum) => {
            const coords = HOUSE_COORDINATES[houseNum];
            // Rashi number in this house (1-indexed, starting from Lagna)
            const rashiNum = ((lagnaIndex + (houseNum - 1)) % 12) + 1;
            const planets = planetsByHouse[houseNum] ?? [];

            // Calculate vertical offsets for multiple planets to prevent collision
            const count = planets.length;
            const startY = coords.planetStartY - (count > 2 ? (count - 1) * 6 : 0);

            return (
              <G key={`house-${houseNum}`}>
                {/* Rashi Number in House */}
                <SvgText
                  x={coords.rashiX}
                  y={coords.rashiY}
                  fill={rashiNumberColor}
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {rashiNum}
                </SvgText>

                {/* Planets placed in this house */}
                {planets.map((p, idx) => {
                  const posY = startY + idx * coords.deltaY;
                  const isAsc = p.abbr === 'Asc';
                  const displayText = p.isRetro ? `${p.abbr}ᴿ` : p.abbr;

                  return (
                    <SvgText
                      key={`h${houseNum}-p${idx}-${p.abbr}`}
                      x={coords.planetX}
                      y={posY}
                      fill={isAsc ? ascColor : p.isRetro ? retroColor : planetTextColor}
                      fontSize={count > 3 ? '10' : '11.5'}
                      fontWeight={isAsc ? '700' : '600'}
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      {displayText}
                    </SvgText>
                  );
                })}
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Legend & Guide */}
      <View style={[styles.legendContainer, { borderTopColor: theme.premiumBorder }]}>
        <View style={styles.legendRow}>
          <RNText style={[styles.legendItem, { color: theme.dim }]}>
            <RNText style={{ color: ascColor, fontWeight: '700' }}>Asc</RNText>: Lagna
          </RNText>
          <RNText style={[styles.legendItem, { color: theme.dim }]}>
            <RNText style={{ color: retroColor, fontWeight: '700' }}>ᴿ</RNText>: Retrograde
          </RNText>
          <RNText style={[styles.legendItem, { color: theme.dim }]}>
            Su, Mo, Ma, Me, Ju, Ve, Sa, Ra, Ke
          </RNText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    alignItems: 'center',
  },
  chartHeader: {
    width: '100%',
    alignItems: 'flex-start',
    gap: 2,
  },
  chartTitle: {
    ...TYPE.cardHeading,
    fontSize: 18,
  },
  chartSubtitle: {
    ...TYPE.caption,
    fontSize: 12,
  },
  svgWrapper: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 360,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  legendContainer: {
    width: '100%',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  legendItem: {
    ...TYPE.caption,
    fontSize: 11,
  },
  withheldContainer: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  withheldTitle: {
    ...TYPE.cardHeading,
    fontSize: 18,
    textAlign: 'center',
  },
  withheldBody: {
    ...TYPE.body,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
