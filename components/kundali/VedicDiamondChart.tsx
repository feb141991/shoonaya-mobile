import { useMemo, useState } from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import Svg, { G, Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import Feather from '@expo/vector-icons/Feather';

import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, SPACING, TYPE, themeColor } from '@/lib/constants';
import {
  AstroChart,
  CANONICAL_GRAHA_ORDER,
  GRAHA_ABBREVIATIONS,
  RASHI_NAMES_SA,
  formatDegreeMinutes,
} from '@/lib/kundali-contract';

export type ChartLanguage = 'en' | 'hi';

interface VedicDiamondChartProps {
  chart: AstroChart;
  isDark: boolean;
  size?: number;
  initialLanguage?: ChartLanguage;
}

// Canonical Sanskrit/Hindi 1-2 character abbreviations matching Janam Patri booklets
const GRAHA_ABBREVIATIONS_HI: Record<string, string> = {
  Asc: 'लग्न',
  Surya: 'सू',
  Chandra: 'चं',
  Mangala: 'मं',
  Mangal: 'मं',
  Budha: 'बु',
  Guru: 'गु',
  Shukra: 'शु',
  Shani: 'श',
  Rahu: 'रा',
  Ketu: 'के',
};

// Hindi numerals १ to १२
const DEVANAGARI_NUMERALS: Record<number, string> = {
  1: '१',
  2: '२',
  3: '३',
  4: '४',
  5: '५',
  6: '६',
  7: '७',
  8: '८',
  9: '९',
  10: '१०',
  11: '११',
  12: '१२',
};

// Rashi Names Hindi / Devanagari
const RASHI_NAMES_HI: Record<number, string> = {
  0: 'मेष',
  1: 'वृषभ',
  2: 'मिथुन',
  3: 'कर्क',
  4: 'सिंह',
  5: 'कन्या',
  6: 'तुला',
  7: 'वृश्चिक',
  8: 'धनु',
  9: 'मकर',
  10: 'कुंभ',
  11: 'मीन',
};

// Coordinates for Rashi number text and Planet items per house (in a 340x340 viewBox)
const HOUSE_COORDINATES: Record<
  number,
  { rashiX: number; rashiY: number; planetX: number; planetStartY: number; deltaY: number }
> = {
  // House 1 (Top Center Diamond)
  1: { rashiX: 170, rashiY: 135, planetX: 170, planetStartY: 58, deltaY: 17 },
  // House 2 (Top Left Triangle)
  2: { rashiX: 95, rashiY: 55, planetX: 65, planetStartY: 28, deltaY: 15 },
  // House 3 (Left Top Triangle)
  3: { rashiX: 55, rashiY: 95, planetX: 30, planetStartY: 65, deltaY: 15 },
  // House 4 (Left Diamond)
  4: { rashiX: 135, rashiY: 170, planetX: 65, planetStartY: 170, deltaY: 17 },
  // House 5 (Left Bottom Triangle)
  5: { rashiX: 55, rashiY: 245, planetX: 30, planetStartY: 275, deltaY: 15 },
  // House 6 (Bottom Left Triangle)
  6: { rashiX: 95, rashiY: 285, planetX: 65, planetStartY: 315, deltaY: 15 },
  // House 7 (Bottom Center Diamond)
  7: { rashiX: 170, rashiY: 205, planetX: 170, planetStartY: 270, deltaY: 17 },
  // House 8 (Bottom Right Triangle)
  8: { rashiX: 245, rashiY: 285, planetX: 275, planetStartY: 315, deltaY: 15 },
  // House 9 (Right Bottom Triangle)
  9: { rashiX: 285, rashiY: 245, planetX: 310, planetStartY: 275, deltaY: 15 },
  // House 10 (Right Diamond)
  10: { rashiX: 205, rashiY: 170, planetX: 275, planetStartY: 170, deltaY: 17 },
  // House 11 (Right Top Triangle)
  11: { rashiX: 285, rashiY: 95, planetX: 310, planetStartY: 65, deltaY: 15 },
  // House 12 (Top Right Triangle)
  12: { rashiX: 245, rashiY: 55, planetX: 275, planetStartY: 28, deltaY: 15 },
};

export function VedicDiamondChart({
  chart,
  isDark,
  initialLanguage = 'hi',
}: VedicDiamondChartProps) {
  const theme = themeColor(isDark);
  const [lang, setLang] = useState<ChartLanguage>(initialLanguage);
  const [showDegrees, setShowDegrees] = useState<boolean>(true);

  const lagnaIndex = chart.lagna?.rashiIndex ?? 0;
  const isTimeUnknown = chart.timeUnknown;

  // Group planets by their assigned house (1–12)
  const planetsByHouse = useMemo(() => {
    const map: Record<
      number,
      Array<{
        abbrEn: string;
        abbrHi: string;
        degText: string;
        isRetro: boolean;
        isCombust: boolean;
        dignity?: string;
      }>
    > = {
      1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
      7: [], 8: [], 9: [], 10: [], 11: [], 12: [],
    };

    if (isTimeUnknown) return map;

    // Add Lagna indicator in House 1
    map[1].push({
      abbrEn: 'Asc',
      abbrHi: 'लग्न',
      degText: chart.lagna?.degreeInRashi != null ? formatDegreeMinutes(chart.lagna.degreeInRashi) : '',
      isRetro: false,
      isCombust: false,
    });

    for (const name of CANONICAL_GRAHA_ORDER) {
      const pos = chart.planets[name];
      if (!pos || typeof pos.house !== 'number') continue;
      const h = Math.max(1, Math.min(12, pos.house));
      const abbrEn = GRAHA_ABBREVIATIONS[name] ?? name.slice(0, 2);
      const abbrHi = GRAHA_ABBREVIATIONS_HI[name] ?? abbrEn;
      const degText = pos.degreeInRashi != null ? formatDegreeMinutes(pos.degreeInRashi) : '';

      map[h].push({
        abbrEn,
        abbrHi,
        degText,
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
            {lang === 'hi' ? 'कुण्डली चक्र स्थगित (Withheld)' : 'Chart Withheld'}
          </RNText>
          <RNText style={[styles.withheldBody, { color: theme.dim }]}>
            {lang === 'hi'
              ? 'लग्न एवं भाव विभाजन हेतु सटीक जन्म समय आवश्यक है। चन्द्र राशि, नक्षत्र एवं दशा विवरण अगले अनुभागों में देखें।'
              : 'North Indian Diamond chart houses and Lagna divisions require a known birth time. Explore your Moon sign, Nakshatra, and Dasha in the Identity and Dasha tabs.'}
          </RNText>
        </View>
      </Card>
    );
  }

  // Sacred Janam Patri & Astronomical Color Scheme
  const terracottaBorder = isDark ? '#D97706' : '#991B1B'; // Deep sacred red / terracotta
  const celestialGold = isDark ? '#F59E0B' : '#D97706'; // Astronomical gold
  const parchmentBg = isDark ? '#1C1917' : '#FFFDF7'; // Sandalwood / parchment tone
  const frameBorder = isDark ? 'rgba(217, 119, 6, 0.45)' : 'rgba(153, 27, 27, 0.45)';
  const gridLines = isDark ? 'rgba(245, 158, 11, 0.5)' : 'rgba(180, 83, 9, 0.6)';
  const innerDiamondColor = isDark ? 'rgba(245, 158, 11, 0.85)' : 'rgba(153, 27, 27, 0.85)';
  const rashiNumberColor = isDark ? 'rgba(253, 230, 138, 0.65)' : 'rgba(153, 27, 27, 0.7)';
  const planetTextColor = isDark ? '#FEF3C7' : '#2A1A0A';
  const degreeTextColor = isDark ? 'rgba(254, 243, 199, 0.6)' : 'rgba(120, 53, 15, 0.75)';
  const retroColor = isDark ? '#FBBF24' : '#C2410C';
  const ascColor = isDark ? '#38BDF8' : '#0369A1';

  const VIEW_SIZE = 340;

  const ascDisplayName = lang === 'hi'
    ? `${RASHI_NAMES_HI[lagnaIndex]} (${DEVANAGARI_NUMERALS[lagnaIndex + 1]})`
    : `${RASHI_NAMES_SA[lagnaIndex]} (${lagnaIndex + 1})`;

  return (
    <Card
      tone="auto"
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: terracottaBorder,
        },
      ]}
    >
      {/* Top Controls: Traditional Sanskrit Title & Hindi/English Toggle */}
      <View style={styles.chartHeader}>
        <View style={styles.headerTitleCol}>
          <RNText style={[styles.invocation, { color: celestialGold }]}>
            {lang === 'hi' ? '॥ श्री गणेशाय नमः ॥' : '॥ Om Sri Ganeshay Namah ॥'}
          </RNText>
          <RNText style={[styles.chartTitle, { color: theme.text }]}>
            {lang === 'hi' ? 'लग्न कुण्डली चक्र (D-1)' : 'Lagna Kundali (D-1 Chart)'}
          </RNText>
          <RNText style={[styles.chartSubtitle, { color: theme.dim }]}>
            {lang === 'hi' ? 'लग्न:' : 'Ascendant:'} {ascDisplayName} · Lahiri Ayanamsha (Whole Sign)
          </RNText>
        </View>

        {/* Action Toggles: Language (En/हिं) and Degree Toggle */}
        <View style={styles.togglesRow}>
          <PressableSurface
            haptic="selection"
            onPress={() => setShowDegrees((prev) => !prev)}
            accessibilityLabel={`Toggle degree precision: currently ${showDegrees ? 'visible' : 'hidden'}`}
            style={[
              styles.toggleBtn,
              {
                backgroundColor: showDegrees ? (isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(254, 243, 199, 1)') : theme.card,
                borderColor: showDegrees ? celestialGold : theme.premiumBorder,
              },
            ]}
          >
            <RNText
              style={[
                styles.toggleBtnText,
                { color: showDegrees ? celestialGold : theme.dim },
              ]}
            >
              {showDegrees ? '° Min' : '° Off'}
            </RNText>
          </PressableSurface>

          <PressableSurface
            haptic="selection"
            onPress={() => setLang((curr) => (curr === 'hi' ? 'en' : 'hi'))}
            accessibilityLabel={`Language toggle: currently ${lang === 'hi' ? 'Hindi' : 'English'}`}
            style={[
              styles.toggleBtn,
              {
                backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : 'rgba(254, 226, 226, 0.9)',
                borderColor: terracottaBorder,
              },
            ]}
          >
            <RNText style={[styles.toggleBtnText, { color: terracottaBorder, fontWeight: '700' }]}>
              {lang === 'hi' ? 'हिन्दी' : 'EN'}
            </RNText>
          </PressableSurface>
        </View>
      </View>

      {/* Traditional Double-Border Framed SVG Vedic Diamond Chart */}
      <View
        style={[
          styles.svgContainer,
          {
            backgroundColor: parchmentBg,
            borderColor: frameBorder,
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}>
          {/* Outer Traditional Dashed/Double Border */}
          <Rect
            x="3"
            y="3"
            width={VIEW_SIZE - 6}
            height={VIEW_SIZE - 6}
            fill="none"
            stroke={frameBorder}
            strokeWidth="2"
            strokeDasharray="4,2"
            rx="2"
          />

          <Rect
            x="8"
            y="8"
            width={VIEW_SIZE - 16}
            height={VIEW_SIZE - 16}
            fill="none"
            stroke={gridLines}
            strokeWidth="1.4"
          />

          {/* Diagonals */}
          <Line x1="8" y1="8" x2={VIEW_SIZE - 8} y2={VIEW_SIZE - 8} stroke={gridLines} strokeWidth="1.2" />
          <Line x1="8" y1={VIEW_SIZE - 8} x2={VIEW_SIZE - 8} y2="8" stroke={gridLines} strokeWidth="1.2" />

          {/* Inner Diamond (Houses 1, 4, 7, 10 Kendra division) */}
          <Polygon
            points={`${VIEW_SIZE / 2},8 8,${VIEW_SIZE / 2} ${VIEW_SIZE / 2},${VIEW_SIZE - 8} ${VIEW_SIZE - 8},${VIEW_SIZE / 2}`}
            fill="none"
            stroke={innerDiamondColor}
            strokeWidth="1.8"
          />

          {/* Corner Traditional Motifs */}
          <SvgText x="16" y="24" fill={celestialGold} fontSize="11" opacity={0.6}>❖</SvgText>
          <SvgText x={VIEW_SIZE - 24} y="24" fill={celestialGold} fontSize="11" opacity={0.6}>❖</SvgText>
          <SvgText x="16" y={VIEW_SIZE - 14} fill={celestialGold} fontSize="11" opacity={0.6}>❖</SvgText>
          <SvgText x={VIEW_SIZE - 24} y={VIEW_SIZE - 14} fill={celestialGold} fontSize="11" opacity={0.6}>❖</SvgText>

          {/* Houses Render (1 to 12) */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((houseNum) => {
            const coords = HOUSE_COORDINATES[houseNum];
            // Rashi number in this house (1-indexed, starting from Lagna)
            const rawRashiNum = ((lagnaIndex + (houseNum - 1)) % 12) + 1;
            const rashiDisplay = lang === 'hi' ? DEVANAGARI_NUMERALS[rawRashiNum] : String(rawRashiNum);
            const planets = planetsByHouse[houseNum] ?? [];

            // Calculate vertical offsets for multiple planets to prevent collision
            const count = planets.length;
            const startY = coords.planetStartY - (count > 2 ? (count - 1) * 7 : 0);

            return (
              <G key={`house-${houseNum}`}>
                {/* Rashi Number in House */}
                <SvgText
                  x={coords.rashiX}
                  y={coords.rashiY}
                  fill={rashiNumberColor}
                  fontSize={lang === 'hi' ? '12' : '10'}
                  fontWeight="700"
                  fontFamily={lang === 'hi' ? FONTS.devanagariBold : FONTS.sansBold}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {rashiDisplay}
                </SvgText>

                {/* Planets placed in this house */}
                {planets.map((p, idx) => {
                  const posY = startY + idx * (showDegrees ? coords.deltaY + 2 : coords.deltaY);
                  const isAsc = p.abbrEn === 'Asc';
                  const baseName = lang === 'hi' ? p.abbrHi : p.abbrEn;
                  const retroMarker = p.isRetro ? (lang === 'hi' ? '(व)' : 'ᴿ') : '';
                  const displayText = `${baseName}${retroMarker}`;

                  return (
                    <G key={`h${houseNum}-p${idx}-${p.abbrEn}`}>
                      <SvgText
                        x={coords.planetX}
                        y={showDegrees && p.degText ? posY - 3 : posY}
                        fill={isAsc ? ascColor : p.isRetro ? retroColor : planetTextColor}
                        fontSize={count > 3 ? (lang === 'hi' ? '10' : '9.5') : (lang === 'hi' ? '11.5' : '11')}
                        fontWeight={isAsc ? '700' : '600'}
                        fontFamily={lang === 'hi' ? FONTS.devanagariBold : FONTS.sansSemiBold}
                        textAnchor="middle"
                        alignmentBaseline="middle"
                      >
                        {displayText}
                      </SvgText>

                      {/* Precision Arc-Degree text (if enabled and present) */}
                      {showDegrees && p.degText ? (
                        <SvgText
                          x={coords.planetX}
                          y={posY + 7}
                          fill={degreeTextColor}
                          fontSize="7.5"
                          fontFamily={FONTS.sans}
                          textAnchor="middle"
                          alignmentBaseline="middle"
                        >
                          {p.degText}
                        </SvgText>
                      ) : null}
                    </G>
                  );
                })}
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Legend & Traditional Planetary Index */}
      <View style={[styles.legendContainer, { borderTopColor: theme.premiumBorder }]}>
        <View style={styles.legendRow}>
          <RNText style={[styles.legendItem, { color: theme.dim }]}>
            <RNText style={{ color: ascColor, fontWeight: '700' }}>
              {lang === 'hi' ? 'लग्न' : 'Asc'}
            </RNText>
            : {lang === 'hi' ? 'उदय लग्न' : 'Ascendant'}
          </RNText>

          <RNText style={[styles.legendItem, { color: theme.dim }]}>
            <RNText style={{ color: retroColor, fontWeight: '700' }}>
              {lang === 'hi' ? '(व)' : 'ᴿ'}
            </RNText>
            : {lang === 'hi' ? 'वक्री (Retrograde)' : 'Retrograde'}
          </RNText>

          <RNText style={[styles.legendItem, { color: theme.dim }]}>
            {lang === 'hi'
              ? 'सू · चं · मं · बु · गु · शु · श · रा · के'
              : 'Su · Mo · Ma · Me · Ju · Ve · Sa · Ra · Ke'}
          </RNText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    borderRadius: RADII.lg,
    borderWidth: 1.5,
    gap: SPACING.sm,
    alignItems: 'center',
    marginVertical: SPACING.xs,
  },
  chartHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitleCol: {
    flex: 1,
    gap: 2,
  },
  invocation: {
    fontFamily: FONTS.devanagariBold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  chartTitle: {
    ...TYPE.cardHeading,
    fontSize: 17,
  },
  chartSubtitle: {
    ...TYPE.caption,
    fontSize: 11,
  },
  togglesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  toggleBtn: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: 44,
    paddingHorizontal: 10,
    borderRadius: RADII.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnText: {
    ...TYPE.caption,
    fontSize: 12,
  },
  svgContainer: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 350,
    borderRadius: RADII.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    marginVertical: SPACING.xs,
    overflow: 'hidden',
  },
  legendContainer: {
    width: '100%',
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  legendItem: {
    ...TYPE.caption,
    fontSize: 11,
  },
  withheldContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  withheldTitle: {
    ...TYPE.cardHeading,
    fontSize: 17,
    textAlign: 'center',
  },
  withheldBody: {
    ...TYPE.body,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
