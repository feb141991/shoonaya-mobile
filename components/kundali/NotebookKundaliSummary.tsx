import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { FONTS, RADII, SHADOWS, SPACING, TYPE, themeColor } from '@/lib/constants';
import { BirthProfileDetail } from '@/lib/kundali-contract';
import { buildKundaliSummaryModel } from '@/lib/kundali-presentation';
import { RASHI_MAP } from '@/lib/jyotish';

interface NotebookKundaliSummaryProps {
  profile: BirthProfileDetail;
  isDark: boolean;
  textScaleMultiplier?: number;
}

function displayRashi(value: string | null, language: 'sa' | 'en'): string {
  if (!value) return '—';
  return RASHI_MAP[value.toLowerCase()]?.[language] ?? value;
}

export function NotebookKundaliSummary({ profile, isDark, textScaleMultiplier = 1 }: NotebookKundaliSummaryProps) {
  const theme = themeColor(isDark);
  const model = useMemo(() => buildKundaliSummaryModel(profile), [profile]);
  const shadow = isDark ? SHADOWS.md.dark : SHADOWS.md.light;
  const sourceLine = model.engineVersion && model.precision
    ? `Engine ${model.engineVersion} · ${model.precision} precision`
    : model.qualityGrade
      ? `${model.qualityGrade} chart quality`
      : 'Validated Kundali chart data';

  const rows = [
    { sa: 'लग्नम्', hi: 'लग्न', en: 'Ascendant', value: model.lagna ? displayRashi(model.lagna, 'sa') : 'Withheld' },
    { sa: 'चन्द्र-राशिः', hi: 'चन्द्र राशि', en: 'Moon sign', value: displayRashi(model.moonSign, 'sa') },
    { sa: 'सूर्य-राशिः', hi: 'सूर्य राशि', en: 'Sun sign', value: displayRashi(model.sunSign, 'sa') },
    { sa: 'जन्म-नक्षत्रम्', hi: 'जन्म नक्षत्र', en: 'Lunar mansion', value: model.nakshatra ? `${model.nakshatra}${model.pada ? ` · Pada ${model.pada}` : ''}` : '—' },
    { sa: 'जन्म-तिथिः', hi: 'जन्म तिथि', en: 'Birth tithi', value: model.tithi ? `${model.tithi}${model.paksha ? ` · ${model.paksha}` : ''}` : 'Withheld' },
  ];

  return (
    <View
      style={[styles.notebookContainer, { backgroundColor: theme.card, borderColor: theme.brand, boxShadow: shadow }]}
      accessibilityLabel="Kundali chart summary"
    >
      <View style={[styles.innerFrame, { borderColor: theme.premiumBorder }]}>
        <View style={styles.invocationHeader}>
          <Text style={[styles.invocation, { color: theme.brandStrong, fontSize: 22 * textScaleMultiplier }]}>ॐ श्री गणेशाय नमः</Text>
          <Text style={[styles.sanskritTitle, { color: theme.text, fontSize: 18 * textScaleMultiplier }]}>जन्म कुण्डली सारांशः</Text>
          <Text style={[styles.englishSubtitle, { color: theme.dim }]}>BIRTH CHART SUMMARY</Text>
        </View>

        <View style={styles.motifRow} accessibilityElementsHidden>
          <View style={[styles.motifLine, { backgroundColor: theme.premiumBorder }]} />
          <Text style={[styles.motifText, { color: theme.brand }]}>❖</Text>
          <View style={[styles.motifLine, { backgroundColor: theme.premiumBorder }]} />
        </View>

        {model.timeUnknown ? (
          <View style={[styles.notice, { backgroundColor: theme.brandSoft, borderColor: theme.premiumBorder }]}>
            <Feather name="alert-circle" size={17} color={theme.brand} />
            <Text style={[styles.noticeText, { color: theme.text, fontSize: 13 * textScaleMultiplier }]}>
              Exact-time fields are withheld. Moon sign and Nakshatra may use the chart&apos;s documented reference calculation.
            </Text>
          </View>
        ) : null}

        <View style={[styles.identitySection, { backgroundColor: theme.glass, borderColor: theme.premiumBorder }]}>
          <Text style={[styles.sectionTag, { color: theme.brandStrong }]}>जन्म विवरणम् · जन्म विवरण · Birth details</Text>
          <Text style={[styles.name, { color: theme.text, fontSize: 20 * textScaleMultiplier }]}>{model.displayName}</Text>
          <Text style={[styles.bodyText, { color: theme.dim, fontSize: 14 * textScaleMultiplier }]}>
            {model.birthDate}{model.birthTime ? ` · ${model.birthTime}` : ''}
          </Text>
          <Text style={[styles.bodyText, { color: theme.dim, fontSize: 14 * textScaleMultiplier }]}>{model.birthplace}</Text>
        </View>

        <View style={styles.factList}>
          {rows.map((row) => (
            <View key={row.en} style={[styles.factRow, { borderColor: theme.borderSoft }]}>
              <View style={styles.factLabelGroup}>
                <Text style={[styles.sanskritLabel, { color: theme.text, fontSize: 15 * textScaleMultiplier }]}>{row.sa}</Text>
                <Text style={[styles.hindiLabel, { color: theme.dim, fontSize: 13 * textScaleMultiplier }]}>{row.hi}</Text>
                <Text style={[styles.englishLabel, { color: theme.dim }]}>{row.en}</Text>
              </View>
              <Text style={[styles.factValue, { color: theme.brandStrong, fontSize: 15 * textScaleMultiplier }]}>{row.value}</Text>
            </View>
          ))}
        </View>

        {!model.timeUnknown ? (
          <View style={[styles.panchangSection, { backgroundColor: theme.glass, borderColor: theme.premiumBorder }]}>
            <Text style={[styles.sectionTag, { color: theme.brandStrong }]}>पञ्चाङ्ग · Panchang</Text>
            <Text style={[styles.bodyText, { color: theme.text, fontSize: 14 * textScaleMultiplier }]}>
              Vara: {model.vara ?? '—'} · Yoga: {model.yoga ?? '—'} · Karana: {model.karana ?? '—'}
            </Text>
          </View>
        ) : null}

        <View style={[styles.footerRow, { borderTopColor: theme.borderSoft }]}>
          <Feather name="shield" size={14} color={theme.brand} />
          <Text style={[styles.footerText, { color: theme.dim }]}>{sourceLine}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notebookContainer: { borderWidth: 2, borderRadius: RADII.lg, padding: SPACING.sm, marginVertical: SPACING.sm },
  innerFrame: { borderWidth: 1, borderStyle: 'dashed', borderRadius: RADII.md, padding: SPACING.lg, gap: SPACING.md },
  invocationHeader: { alignItems: 'center', gap: SPACING.xs },
  invocation: { fontFamily: FONTS.devanagariBold, lineHeight: 30 },
  sanskritTitle: { fontFamily: FONTS.devanagariBold, lineHeight: 26 },
  englishSubtitle: { ...TYPE.chip, letterSpacing: 1.2 },
  motifRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  motifLine: { flex: 1, height: 1 },
  motifText: { fontSize: 13 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, borderWidth: 1, borderRadius: RADII.sm, padding: SPACING.md },
  noticeText: { ...TYPE.caption, flex: 1 },
  identitySection: { borderWidth: 1, borderRadius: RADII.sm, padding: SPACING.md, gap: SPACING.xs },
  panchangSection: { borderWidth: 1, borderRadius: RADII.sm, padding: SPACING.md, gap: SPACING.sm },
  sectionTag: { ...TYPE.chip, textTransform: 'uppercase', letterSpacing: 0.8 },
  name: { fontFamily: FONTS.serifBold, lineHeight: 26 },
  bodyText: { ...TYPE.body },
  factList: { gap: 0 },
  factRow: { borderBottomWidth: 1, paddingVertical: SPACING.md, gap: SPACING.sm },
  factLabelGroup: { gap: 2 },
  sanskritLabel: { fontFamily: FONTS.devanagariBold, lineHeight: 22 },
  hindiLabel: { fontFamily: FONTS.devanagari, lineHeight: 19 },
  englishLabel: { ...TYPE.caption },
  factValue: { fontFamily: FONTS.sansSemiBold, lineHeight: 22 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingTop: SPACING.md, borderTopWidth: 1 },
  footerText: { ...TYPE.caption, flexShrink: 1, textAlign: 'center' },
});
