import React, { useState } from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, themeColor } from '@/lib/constants';
import type { HandoverStage } from '@/lib/sanskaraHandover';
import { handoverBannerCopy } from '@/lib/sanskaraHandoverCopy';

export function SanskaraHandoverBanner({
  dependentName,
  stage,
  onStart,
}: {
  dependentName: string;
  stage: HandoverStage;
  onStart: () => void;
}) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const copy = handoverBannerCopy(dependentName, stage);
  // Collapsed to one row so it never crowds the tree below it on a short screen. The closing stages open by default.
  const [expanded, setExpanded] = useState(copy?.tone === 'warning');
  if (!copy) return null;

  const warning = copy.tone === 'warning';
  const accent = warning ? (isDark ? COLORS.warningDark : COLORS.warningLight) : theme.brand;

  return (
    <Card
      tone="auto"
      style={[
        styles.card,
        {
          backgroundColor: warning ? (isDark ? COLORS.warningBgDark : COLORS.warningBgLight) : theme.brandSoft,
          borderColor: warning ? (isDark ? COLORS.warningBorderDark : COLORS.warningBorderLight) : theme.border,
        },
      ]}
    >
      <PressableSurface
        haptic="selection"
        onPress={() => setExpanded((open) => !open)}
        accessibilityLabel={copy.title}
        accessibilityHint={expanded ? 'Hides the details' : 'Shows the details'}
        accessibilityState={{ expanded }}
        style={styles.row}
      >
        <Feather name={copy.icon} size={18} color={accent} />
        <Text style={[styles.title, { color: theme.text }]}>{copy.title}</Text>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.dim} />
      </PressableSurface>
      {expanded ? (
        <View style={styles.details}>
          <Text style={[styles.body, { color: theme.dim }]}>{copy.body}</Text>
          {copy.cta ? (
            <PressableSurface
              onPress={onStart}
              accessibilityLabel={`${copy.cta}: ${dependentName}'s timeline`}
              style={[styles.cta, { backgroundColor: theme.brand }]}
            >
              <Text style={[styles.ctaText, { color: theme.textOnBrand }]}>{copy.cta}</Text>
            </PressableSurface>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: MIN_TOUCH_TARGET,
  },
  title: {
    flex: 1,
    fontFamily: FONTS.serifBold,
    fontSize: 16,
    lineHeight: 22,
  },
  details: {
    gap: 12,
    paddingBottom: 10,
  },
  body: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  cta: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  ctaText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
    lineHeight: 18,
  },
});
