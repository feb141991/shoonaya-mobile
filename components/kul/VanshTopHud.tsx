import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FONTS, MIN_TOUCH_TARGET, RADII, themeColor } from '@/lib/constants';
import { type VanshViewMode, VIEW_PRESETS } from '@/lib/vansh3d';

interface VanshTopHudProps {
  viewMode: VanshViewMode;
  autoOrbit: boolean;
  onSelectPreset: (mode: VanshViewMode) => void;
  onToggleOrbit: () => void;
  isDark: boolean;
  reducedMotion?: boolean;
}

export function VanshTopHud({
  viewMode,
  autoOrbit,
  onSelectPreset,
  onToggleOrbit,
  isDark,
  reducedMotion = false,
}: VanshTopHudProps) {
  const theme = themeColor(true);

  return (
    <View style={styles.topHudBar}>
      <View style={styles.presetGroup}>
        {(['orbit', 'constellation', 'generations'] as VanshViewMode[]).map((mode) => {
          const isActive = viewMode === mode;
          const preset = VIEW_PRESETS[mode];
          return (
            <Pressable
              key={mode}
              onPress={() => onSelectPreset(mode)}
              style={[
                styles.presetPill,
                {
                  backgroundColor: isActive ? theme.brand : theme.cardSoft,
                  borderColor: isActive ? theme.brand : theme.border,
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${preset.label} view`}
              accessibilityHint={`Switch lineage camera to ${preset.hindiLabel} view`}
            >
              <Text
                style={[
                  styles.presetText,
                  {
                    color: isActive ? theme.bg : theme.text,
                    fontFamily: isActive ? FONTS.sansSemiBold : FONTS.sans,
                  },
                ]}
              >
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!reducedMotion ? (
        <Pressable
          onPress={onToggleOrbit}
          style={[
            styles.orbitButton,
            {
              backgroundColor: autoOrbit ? theme.brandSoft : theme.card,
              borderColor: autoOrbit ? theme.brand : theme.border,
            },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityState={{ checked: autoOrbit }}
          accessibilityLabel={autoOrbit ? 'Pause automatic 3D rotation' : 'Enable automatic 3D rotation'}
          accessibilityHint="Toggles continuous slow orbital rotation of the family tree"
        >
          <View
            style={[
              styles.orbitStatusDot,
              { backgroundColor: autoOrbit ? theme.brand : theme.dim },
            ]}
          />
          <Text
            style={[
              styles.orbitButtonText,
              { color: autoOrbit ? theme.brand : theme.text, fontFamily: FONTS.sansSemiBold },
            ]}
          >
            {autoOrbit ? 'Orbiting' : 'Orbit'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topHudBar: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 10,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MIN_TOUCH_TARGET,
  },
  presetGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  presetPill: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADII.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: {
    fontSize: 11,
  },
  orbitButton: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  orbitStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  orbitButtonText: {
    fontSize: 11,
  },
});
