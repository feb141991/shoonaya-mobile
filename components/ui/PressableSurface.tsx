import { useEffect, useState, type PropsWithChildren } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { MIN_TOUCH_TARGET } from '@/lib/constants';

type HapticKind = 'impact' | 'selection' | 'none';

type PressableSurfaceProps = PropsWithChildren<Omit<PressableProps, 'style' | 'children'>> & {
  style?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
  haptic?: HapticKind;
};

// Reusable tappable surface for cards/rows/chips. It keeps the app's native
// feedback consistent without introducing a new animation dependency:
// transform/opacity only, haptics on intent, 44dp minimum target, and no scale
// when the OS reduced-motion setting is enabled.
export function PressableSurface({
  children,
  style,
  pressedStyle,
  haptic = 'impact',
  disabled,
  onPress,
  accessibilityRole = 'button',
  accessibilityState,
  ...props
}: PressableSurfaceProps) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityState={{ ...accessibilityState, disabled: disabled || accessibilityState?.disabled }}
      disabled={disabled}
      onPress={(event) => {
        if (!disabled) {
          if (haptic === 'selection') {
            void Haptics.selectionAsync().catch(() => {});
          } else if (haptic === 'impact') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
        }
        onPress?.(event);
      }}
      style={({ pressed }) =>
        StyleSheet.flatten([
          {
            minHeight: MIN_TOUCH_TARGET,
            opacity: disabled ? 0.55 : pressed ? 0.88 : 1,
            transform: [{ scale: pressed && !disabled && !reduceMotion ? 0.985 : 1 }],
          },
          style,
          pressed && !disabled ? pressedStyle : null,
        ])
      }
      {...props}
    >
      {children}
    </Pressable>
  );
}
