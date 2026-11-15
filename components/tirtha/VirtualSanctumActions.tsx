import { StyleSheet, Text, View } from 'react-native';

import { FEATURE_COLORS, OVERLAYS, FONTS, type themeColor } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';

type VirtualSanctumActionsProps = {
  bellRungCount: number;
  diyaLit: boolean;
  flowersCount: number;
  goldAccent: string;
  handleLightDiya: () => void;
  handleOfferFlower: () => void;
  handleParikrama: () => void;
  handleRingBell: () => void;
  isDark: boolean;
  parikramaCount: number;
  theme: ReturnType<typeof themeColor>;
};

export function VirtualSanctumActions({
  bellRungCount,
  diyaLit,
  flowersCount,
  goldAccent,
  handleLightDiya,
  handleOfferFlower,
  handleParikrama,
  handleRingBell,
  isDark,
  parikramaCount,
  theme,
}: VirtualSanctumActionsProps) {
  return (
    <View style={styles.actionPillsGrid}>
      {/* Light Diya */}
      <PressableSurface
        onPress={handleLightDiya}
        style={[
          styles.sanctumActionBtn,
          {
            backgroundColor: diyaLit
              ? isDark
                ? FEATURE_COLORS.virtualSanctumModal.pressableSurfaceDark
                : FEATURE_COLORS.virtualSanctumModal.pressableSurfaceLight
              : isDark
              ? OVERLAYS.white[0.05]
              : OVERLAYS.black[0.03],
            borderColor: diyaLit ? goldAccent : isDark ? OVERLAYS.white[0.1] : OVERLAYS.black[0.08],
          },
        ]}
        accessibilityLabel="Light Ghee Diya"
      >
        <Text style={styles.actionIcon}>{diyaLit ? '🔥' : '🪔'}</Text>
        <Text style={[styles.actionBtnText, { color: diyaLit ? goldAccent : theme.text }]}>
          {diyaLit ? 'Diya Lit' : 'Light Diya'}
        </Text>
      </PressableSurface>

      {/* Offer Pushpam */}
      <PressableSurface
        onPress={handleOfferFlower}
        style={[
          styles.sanctumActionBtn,
          {
            backgroundColor: isDark ? OVERLAYS.white[0.05] : OVERLAYS.black[0.03],
            borderColor: flowersCount > 0 ? FEATURE_COLORS.virtualSanctumModal.flowerActiveBorder : isDark ? OVERLAYS.white[0.1] : OVERLAYS.black[0.08],
          },
        ]}
        accessibilityLabel="Offer Sacred Flowers"
      >
        <Text style={styles.actionIcon}>🌸</Text>
        <Text style={[styles.actionBtnText, { color: theme.text }]}>
          Offer Pushpam {flowersCount > 0 ? `(${flowersCount})` : ''}
        </Text>
      </PressableSurface>

      {/* Ring Bell */}
      <PressableSurface
        onPress={handleRingBell}
        style={[
          styles.sanctumActionBtn,
          {
            backgroundColor: isDark ? OVERLAYS.white[0.05] : OVERLAYS.black[0.03],
            borderColor: bellRungCount > 0 ? goldAccent : isDark ? OVERLAYS.white[0.1] : OVERLAYS.black[0.08],
          },
        ]}
        accessibilityLabel="Ring Temple Bell"
      >
        <Text style={styles.actionIcon}>🔔</Text>
        <Text style={[styles.actionBtnText, { color: theme.text }]}>
          Ring Bell {bellRungCount > 0 ? `(${bellRungCount})` : ''}
        </Text>
      </PressableSurface>

      {/* Parikrama */}
      <PressableSurface
        onPress={handleParikrama}
        style={[
          styles.sanctumActionBtn,
          {
            backgroundColor: isDark ? OVERLAYS.white[0.05] : OVERLAYS.black[0.03],
            borderColor: parikramaCount > 0 ? FEATURE_COLORS.virtualSanctumModal.parikramaActiveBorder : isDark ? OVERLAYS.white[0.1] : OVERLAYS.black[0.08],
          },
        ]}
        accessibilityLabel="Perform Sacred Parikrama"
      >
        <Text style={styles.actionIcon}>🔄</Text>
        <Text style={[styles.actionBtnText, { color: theme.text }]}>
          +1 Parikrama
        </Text>
      </PressableSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  actionPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  sanctumActionBtn: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 44,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionBtnText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
  },
});
