import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Card } from '@/components/ui/Card';
import { COLORS, FONTS, TYPE, themeColor } from '@/lib/constants';

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
            backgroundColor: isDark ? 'rgba(50, 35, 15, 0.4)' : 'rgba(255, 248, 235, 0.95)',
            borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(217, 119, 6, 0.35)',
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(254, 243, 199, 1)',
                borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : 'rgba(245, 158, 11, 0.6)',
              },
            ]}
          >
            <Feather
              name="alert-circle"
              size={13}
              color={isDark ? '#FBBF24' : '#D97706'}
            />
            <Text
              style={[
                styles.badgeText,
                { color: isDark ? '#FBBF24' : '#B45309' },
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
          backgroundColor: isDark ? 'rgba(20, 35, 25, 0.35)' : 'rgba(240, 253, 244, 0.95)',
          borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.35)',
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(220, 252, 231, 1)',
              borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.6)',
            },
          ]}
        >
          <Feather
            name="check-circle"
            size={13}
            color={isDark ? '#34D399' : '#059669'}
          />
          <Text
            style={[
              styles.badgeText,
              { color: isDark ? '#34D399' : '#047857' },
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
