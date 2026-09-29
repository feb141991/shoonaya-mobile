import { useReducedMotion } from "@/components/ui/Motion";
import { useState, type PropsWithChildren } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
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
  onPressIn,
  onPressOut,
  accessibilityRole = 'button',
  accessibilityState,
  ...props
}: PressableSurfaceProps) {
  const reduceMotion = useReducedMotion();
  const [pressed, setPressed] = useState(false);

  const isPressed = pressed && !disabled;
  const flattenedStyle = StyleSheet.flatten(style) ?? {};
  const contentLayoutStyle: ViewStyle = {
    flexDirection: flattenedStyle.flexDirection,
    alignItems: flattenedStyle.alignItems,
    justifyContent: flattenedStyle.justifyContent,
    gap: flattenedStyle.gap,
    rowGap: flattenedStyle.rowGap,
    columnGap: flattenedStyle.columnGap,
    flexWrap: flattenedStyle.flexWrap,
  };

  return (
    <View
      style={StyleSheet.flatten([
        { minHeight: MIN_TOUCH_TARGET },
        style,
      ])}
    >
      <View
        pointerEvents="none"
        style={StyleSheet.flatten([
          contentLayoutStyle,
          {
            // Previously forced to 1 unless the caller passed the exact
            // literal `minHeight: 0` -- meaning a caller with ANY other
            // minHeight (44, or none at all) got an unrequested flex:1 on
            // this inner wrapper. Confirmed on a real Android device: a
            // caller with no `flex`/`height` of its own (a plain padded
            // button meant to hug its content, e.g. app/dharm-veer/[id].tsx's
            // "Ask Dharma Mitra" button, app/(tabs)/profile.tsx's "Invite"
            // button) got stretched into a large, mostly-empty colored
            // block, pushing unrelated content below it off-screen -- iOS
            // happened not to show it, Android did.
            // Centering still works without this: callers that need their
            // icon/text centered within a fixed-size button (the many
            // ReaderShell-style 44x44 icon buttons) already set
            // alignItems/justifyContent themselves, which contentLayoutStyle
            // carries onto this same inner wrapper, AND the identical
            // properties land on the outer View too (style is spread onto
            // it directly) -- centering was never actually dependent on this
            // inner wrapper's own flex value, only on those alignment props.
            // Now the inner wrapper's flex is simply whatever the caller
            // asked for -- undefined (natural content size) if they didn't.
            flex: flattenedStyle.flex,
            height: flattenedStyle.height !== undefined ? '100%' : undefined,
            opacity: disabled ? 0.55 : isPressed ? 0.88 : 1,
            transform: [{ scale: isPressed && !reduceMotion ? 0.985 : 1 }],
          },
          isPressed ? pressedStyle : null,
        ])}
      >
        {children}
      </View>
      <Pressable
        accessibilityRole={accessibilityRole}
        accessibilityState={{ ...accessibilityState, disabled: disabled || accessibilityState?.disabled }}
        disabled={disabled}
        onPressIn={(event) => {
          setPressed(true);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          setPressed(false);
          onPressOut?.(event);
        }}
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
        style={StyleSheet.absoluteFill}
        {...props}
      />
    </View>
  );
}
