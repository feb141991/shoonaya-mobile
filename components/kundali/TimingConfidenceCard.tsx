import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Card } from '@/components/ui/Card';
import { FEATURE_COLORS, COLORS, FONTS, TYPE, themeColor } from '@/lib/constants';

interface TimingConfidenceCardProps {
  timeUnknown: boolean;
  isDark: boolean;
  timeOfBirth?: string | null;
  birthCity?: string | null;
}

export function TimingConfidenceCard({
  timeUnknown,
  isDark,
  timeOfBirth,
  birthCity,
}: TimingConfidenceCardProps) {
  const theme = themeColor(isDark);

  if (timeUnknown) {
    return (
      <Card
        tone="auto"
        style={[
          styles.container,
          {
            backgroundColor: isDark ? FEATURE_COLORS.timingConfidenceCard.cardSurfaceDark : FEATURE_COLORS.timingConfidenceCard.cardSurfaceLight,
            borderColor: isDark ? FEATURE_COLORS.timingConfidenceCard.cardBorderDark : FEATURE_COLORS.timingConfidenceCard.cardBorderLight,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isDark ? FEATURE_COLORS.timingConfidenceCard.surfaceDark : FEATURE_COLORS.timingConfidenceCard.surfaceLight,
                borderColor: isDark ? FEATURE_COLORS.timingConfidenceCard.borderDark : FEATURE_COLORS.timingConfidenceCard.borderLight,
              },
            ]}
          >
            <Feather
              name="alert-circle"
              size={13}
              color={isDark ? FEATURE_COLORS.timingConfidenceCard.alertCircleTextDark : COLORS.warningLight}
            />
            <Text
              style={[
                styles.badgeText,
                { color: isDark ? FEATURE_COLORS.timingConfidenceCard.alertCircleTextDark : FEATURE_COLORS.timingConfidenceCard.textLight },
              ]}
            >
              Timing Confidence: Partial
            </Text>
          </View>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          Birth Time Unknown (Noon Reference Used)
        </Text>

        <Text style={[styles.body, { color: theme.dim }]}>
          Because exact birth time was not provided, noon (12:00) was used solely as a
          reference. Your Moon sign (Chandra Rashi), Nakshatra, and broad Vimshottari
          Dasha remain reliable, while the Lagna (Ascendant), house divisions, and
          diamond chart are withheld to avoid false precision.
        </Text>
      </Card>
    );
  }

  return (
    <Card
      tone="auto"
      style={[
        styles.container,
        {
          backgroundColor: isDark ? FEATURE_COLORS.timingConfidenceCard.cardSurfaceDark2 : FEATURE_COLORS.timingConfidenceCard.cardSurfaceLight2,
          borderColor: isDark ? FEATURE_COLORS.timingConfidenceCard.cardBorderDark2 : FEATURE_COLORS.timingConfidenceCard.cardBorderLight2,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isDark ? FEATURE_COLORS.timingConfidenceCard.surfaceDark2 : FEATURE_COLORS.timingConfidenceCard.surfaceLight2,
              borderColor: isDark ? FEATURE_COLORS.timingConfidenceCard.borderDark2 : FEATURE_COLORS.timingConfidenceCard.borderLight2,
            },
          ]}
        >
          <Feather
            name="check-circle"
            size={13}
            color={isDark ? FEATURE_COLORS.timingConfidenceCard.checkCircleTextDark : FEATURE_COLORS.timingConfidenceCard.checkCircleTextLight}
          />
          <Text
            style={[
              styles.badgeText,
              { color: isDark ? FEATURE_COLORS.timingConfidenceCard.checkCircleTextDark : FEATURE_COLORS.timingConfidenceCard.textLight2 },
            ]}
          >
            Timing Confidence: High
          </Text>
        </View>
      </View>

      <Text style={[styles.title, { color: theme.text }]}>
        Precise Birth Chart Generated
      </Text>

      <Text style={[styles.body, { color: theme.dim }]}>
        Calculated using your specific birth moment
        {timeOfBirth ? ` (${timeOfBirth})` : ''}
        {birthCity ? ` in ${birthCity}` : ''}. Lagna, house cusps, and planetary
        dignities are mapped to full precision.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    ...TYPE.chip,
    fontSize: 11,
    fontFamily: FONTS.sansSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    ...TYPE.cardHeading,
    fontSize: 16,
    lineHeight: 20,
    marginTop: 2,
  },
  body: {
    ...TYPE.caption,
    fontSize: 12,
    lineHeight: 17,
  },
});
