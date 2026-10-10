import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Card } from '@/components/ui/Card';
import { FONTS, RADII, SHADOWS, SPACING, TYPE, themeColor } from '@/lib/constants';
import { BirthProfileDetail } from '@/lib/kundali-contract';
import { buildKundaliInsightModel, formatKundaliDate } from '@/lib/kundali-presentation';

interface KundaliPredictionsProps {
  profile: BirthProfileDetail;
  isDark: boolean;
  textScaleMultiplier?: number;
}

export function KundaliPredictions({ profile, isDark, textScaleMultiplier = 1 }: KundaliPredictionsProps) {
  const theme = themeColor(isDark);
  const model = useMemo(() => buildKundaliInsightModel(profile), [profile]);
  const shadow = isDark ? SHADOWS.sm.dark : SHADOWS.sm.light;

  if (model.timeUnknown) {
    return (
      <Card tone="auto" style={[styles.noticeCard, { backgroundColor: theme.card, borderColor: theme.premiumBorder }]}>
        <View style={[styles.iconWell, { backgroundColor: theme.brandSoft }]}>
          <Feather name="shield" size={20} color={theme.brand} />
        </View>
        <View style={styles.noticeCopy}>
          <Text style={[styles.noticeTitle, { color: theme.text, fontSize: 17 * textScaleMultiplier }]}>
            Predictions withheld without an exact birth time
          </Text>
          <Text style={[styles.body, { color: theme.dim, fontSize: 14 * textScaleMultiplier }]}>
            House placements and time-dependent readings are not shown because they could imply false precision. Add a verified birth time to calculate them.
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <Card
        tone="auto"
        style={[styles.dashaCard, { backgroundColor: theme.card, borderColor: theme.premiumBorder, boxShadow: shadow }]}
      >
        <View style={styles.headingRow}>
          <View style={[styles.iconWell, { backgroundColor: theme.brandSoft }]}>
            <Feather name="clock" size={18} color={theme.brand} />
          </View>
          <View style={styles.headingCopy}>
            <Text style={[styles.cardTitle, { color: theme.text, fontSize: 17 * textScaleMultiplier }]}>
              Calculated Vimshottari period
            </Text>
            <Text style={[styles.caption, { color: theme.dim, fontSize: 12 * textScaleMultiplier }]}>
              Values supplied by the validated chart payload
            </Text>
          </View>
        </View>

        {model.currentDasha ? (
          <View style={styles.periodList}>
            <View style={[styles.periodRow, { borderColor: theme.borderSoft }]}>
              <Text style={[styles.periodLabel, { color: theme.dim }]}>Mahadasha</Text>
              <Text style={[styles.periodValue, { color: theme.text, fontSize: 14 * textScaleMultiplier }]}>
                {model.currentDasha.planet}
              </Text>
              <Text style={[styles.periodDates, { color: theme.dim }]}>
                {formatKundaliDate(model.currentDasha.startDate)} – {formatKundaliDate(model.currentDasha.endDate)}
              </Text>
            </View>

            {model.currentAntardasha ? (
              <View style={[styles.periodRow, { borderColor: theme.borderSoft }]}>
                <Text style={[styles.periodLabel, { color: theme.dim }]}>Antardasha</Text>
                <Text style={[styles.periodValue, { color: theme.text, fontSize: 14 * textScaleMultiplier }]}>
                  {model.currentAntardasha.planet}
                </Text>
                <Text style={[styles.periodDates, { color: theme.dim }]}>
                  {formatKundaliDate(model.currentAntardasha.startDate)} – {formatKundaliDate(model.currentAntardasha.endDate)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <Text style={[styles.body, { color: theme.dim, fontSize: 14 * textScaleMultiplier }]}>
            No active Dasha period was supplied with this chart.
          </Text>
        )}
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 18 * textScaleMultiplier }]}>
          Verified chart factors
        </Text>
        <Text style={[styles.body, { color: theme.dim, fontSize: 14 * textScaleMultiplier }]}>
          These are calculated placements only. They are not promises or life predictions.
        </Text>
      </View>

      {model.factors.length > 0 ? model.factors.map((factor) => (
        <Card key={factor.id} tone="auto" style={[styles.factorCard, { backgroundColor: theme.card, borderColor: theme.premiumBorder }]}>
          <View style={styles.factorHeader}>
            <Text style={[styles.factorTitle, { color: theme.text, fontSize: 15 * textScaleMultiplier }]}>{factor.title}</Text>
            <View style={[styles.badge, { backgroundColor: theme.brandSoft, borderColor: theme.premiumBorder }]}>
              <Text style={[styles.badgeText, { color: theme.brandStrong }]}>{factor.classification}</Text>
            </View>
          </View>
          <Text style={[styles.body, { color: theme.dim, fontSize: 14 * textScaleMultiplier }]}>{factor.detail}</Text>
        </Card>
      )) : (
        <Card tone="auto" style={[styles.factorCard, { backgroundColor: theme.card, borderColor: theme.premiumBorder }]}>
          <Text style={[styles.body, { color: theme.dim, fontSize: 14 * textScaleMultiplier }]}>
            No exalted or own-sign placements were supplied with this chart.
          </Text>
        </Card>
      )}

      <View style={[styles.reviewNotice, { backgroundColor: theme.brandSoft, borderColor: theme.premiumBorder }]}>
        <Feather name="book-open" size={17} color={theme.brand} />
        <Text style={[styles.reviewText, { color: theme.text, fontSize: 13 * textScaleMultiplier }]}>
          Yoga meanings and predictive guidance are withheld until each rule has named source provenance, a versioned calculation and human review.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.lg },
  dashaCard: { padding: SPACING.lg, borderRadius: RADII.lg, borderWidth: 1, gap: SPACING.lg },
  noticeCard: { padding: SPACING.lg, borderRadius: RADII.lg, borderWidth: 1, flexDirection: 'row', gap: SPACING.md },
  noticeCopy: { flex: 1, gap: SPACING.xs },
  noticeTitle: { ...TYPE.cardHeading },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  headingCopy: { flex: 1, gap: SPACING.xs },
  iconWell: { width: 44, height: 44, borderRadius: RADII.sm, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...TYPE.cardHeading },
  caption: { ...TYPE.caption },
  periodList: { gap: SPACING.sm },
  periodRow: { borderTopWidth: 1, paddingTop: SPACING.md, gap: SPACING.xs },
  periodLabel: { ...TYPE.chip, textTransform: 'uppercase' },
  periodValue: { fontFamily: FONTS.sansSemiBold },
  periodDates: { ...TYPE.caption, fontVariant: ['tabular-nums'] },
  sectionHeader: { gap: SPACING.xs },
  sectionTitle: { ...TYPE.cardHeading },
  factorCard: { padding: SPACING.lg, borderRadius: RADII.lg, borderWidth: 1, gap: SPACING.sm },
  factorHeader: { gap: SPACING.sm },
  factorTitle: { fontFamily: FONTS.sansSemiBold },
  badge: { alignSelf: 'flex-start', borderRadius: RADII.pill, borderWidth: 1, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  badgeText: { ...TYPE.chip },
  body: { ...TYPE.body },
  reviewNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, borderWidth: 1, borderRadius: RADII.md, padding: SPACING.md },
  reviewText: { ...TYPE.caption, flex: 1 },
});
