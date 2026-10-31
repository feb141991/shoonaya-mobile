import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET, themeColor } from '@/lib/constants';

interface FeatherweightSheetProps {
  onEnterJapa: () => void;
  onOpenShields: () => void;
  onOpenLedger: () => void;
  onOpenMood: () => void;
  karmaTotal: number;
  shieldsUnlocked: number;
  isDark: boolean;
  theme: ReturnType<typeof themeColor>;
}

export function FeatherweightSheet({
  onEnterJapa,
  onOpenShields,
  onOpenLedger,
  onOpenMood,
  karmaTotal,
  shieldsUnlocked,
  isDark,
  theme,
}: FeatherweightSheetProps) {
  return (
    <View style={styles.container}>
      {/* Primary Japa Drawer Card */}
      <View
        style={[
          styles.drawerCard,
          {
            backgroundColor: isDark
              ? 'rgba(20, 18, 16, 0.78)'
              : 'rgba(255, 253, 249, 0.88)',
            borderColor: theme.borderSoft,
          },
        ]}
      >
        <View style={styles.sheetHandle} />

        <View style={styles.drawerRow}>
          <View style={styles.textCol}>
            <Text style={[styles.drawerTitle, { color: theme.text }]}>
              Morning Sandhya Japa
            </Text>
            <Text style={[styles.drawerCaption, { color: theme.dim }]}>
              108 beads recommended · Brahma Muhurta active
            </Text>
          </View>

          <PressableSurface
            accessibilityLabel="Enter daily Japa session"
            haptic="impact"
            onPress={onEnterJapa}
            style={[
              styles.actionPill,
              {
                backgroundColor: theme.brandSoft,
                borderColor: theme.premiumBorder,
              },
            ]}
          >
            <Text style={[styles.actionPillText, { color: theme.brand }]}>
              Enter Japa ›
            </Text>
          </PressableSurface>
        </View>
      </View>

      {/* Sub-routes Links Row */}
      <View style={styles.subRoutesRow}>
        {/* Shields Link */}
        <PressableSurface
          accessibilityLabel="Open sanctuary shields"
          haptic="selection"
          onPress={onOpenShields}
          style={[
            styles.subRouteItem,
            {
              backgroundColor: isDark
                ? 'rgba(20, 18, 16, 0.60)'
                : 'rgba(255, 253, 249, 0.70)',
              borderColor: theme.borderSoft,
            },
          ]}
        >
          <View style={styles.subRouteIcon}>
            <Feather name="shield" size={14} color={theme.brand} />
          </View>
          <View style={styles.subRouteTextCol}>
            <Text style={[styles.subRouteTitle, { color: theme.text }]}>
              Shields
            </Text>
            <Text style={[styles.subRouteCount, { color: theme.dim }]}>
              {shieldsUnlocked}/13
            </Text>
          </View>
          <Feather name="chevron-right" size={13} color={theme.dim} />
        </PressableSurface>

        {/* Karma Ledger Link */}
        <PressableSurface
          accessibilityLabel="Open karma ledger"
          haptic="selection"
          onPress={onOpenLedger}
          style={[
            styles.subRouteItem,
            {
              backgroundColor: isDark
                ? 'rgba(20, 18, 16, 0.60)'
                : 'rgba(255, 253, 249, 0.70)',
              borderColor: theme.borderSoft,
            },
          ]}
        >
          <View style={styles.subRouteIcon}>
            <Feather name="book" size={14} color={theme.brand} />
          </View>
          <View style={styles.subRouteTextCol}>
            <Text style={[styles.subRouteTitle, { color: theme.text }]}>
              Karma
            </Text>
            <Text style={[styles.subRouteCount, { color: theme.dim }]}>
              +{karmaTotal}
            </Text>
          </View>
          <Feather name="chevron-right" size={13} color={theme.dim} />
        </PressableSurface>

        {/* Mood Insights Link */}
        <PressableSurface
          accessibilityLabel="Open mood insights"
          haptic="selection"
          onPress={onOpenMood}
          style={[
            styles.subRouteItem,
            {
              backgroundColor: isDark
                ? 'rgba(20, 18, 16, 0.60)'
                : 'rgba(255, 253, 249, 0.70)',
              borderColor: theme.borderSoft,
            },
          ]}
        >
          <View style={styles.subRouteIcon}>
            <Feather name="smile" size={14} color={theme.brand} />
          </View>
          <View style={styles.subRouteTextCol}>
            <Text style={[styles.subRouteTitle, { color: theme.text }]}>
              Mood
            </Text>
            <Text style={[styles.subRouteCount, { color: theme.dim }]}>
              View
            </Text>
          </View>
          <Feather name="chevron-right" size={13} color={theme.dim} />
        </PressableSurface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  drawerCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    marginBottom: 14,
  },
  sheetHandle: {
    width: 32,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(128, 128, 128, 0.25)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  drawerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  textCol: {
    flex: 1,
  },
  drawerTitle: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
  },
  drawerCaption: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  actionPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPillText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    lineHeight: 14,
  },
  subRoutesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  subRouteItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: MIN_TOUCH_TARGET,
  },
  subRouteIcon: {
    marginRight: 6,
  },
  subRouteTextCol: {
    flex: 1,
  },
  subRouteTitle: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    lineHeight: 14,
  },
  subRouteCount: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    lineHeight: 12,
  },
});
