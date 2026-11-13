import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { MIN_TOUCH_TARGET, themeColor } from '@/lib/constants';

interface VanshControlsDockProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  isDark: boolean;
}

export function VanshControlsDock({
  onZoomIn,
  onZoomOut,
  onResetZoom,
  isDark,
}: VanshControlsDockProps) {
  const theme = themeColor(isDark);

  return (
    <View style={styles.controlsDock}>
      <Pressable
        onPress={onZoomIn}
        style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel="Zoom in lineage tree"
        accessibilityHint="Increases 3D perspective camera zoom"
      >
        <Feather name="plus" size={16} color={theme.text} />
      </Pressable>
      <Pressable
        onPress={onZoomOut}
        style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel="Zoom out lineage tree"
        accessibilityHint="Decreases 3D perspective camera zoom"
      >
        <Feather name="minus" size={16} color={theme.text} />
      </Pressable>
      <Pressable
        onPress={onResetZoom}
        style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel="Recenter lineage tree"
        accessibilityHint="Resets 3D camera to current preset angle and default zoom"
      >
        <Feather name="maximize-2" size={14} color={theme.brand} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  controlsDock: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    zIndex: 100,
    flexDirection: 'column',
    gap: 8,
  },
  controlBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
