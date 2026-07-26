import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, useColorScheme, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, MIN_TOUCH_TARGET, SHADOWS } from '@/lib/constants';
import { HERO_MIN_HEIGHT, NAV_BAR_CLEARANCE } from '@/lib/nav-bar';
import { useReducedMotion } from '@/components/ui/Motion';

const SCROLL_ASSET = require('@/assets/icons/ai-guide-scroll.png');
const ANCHOR_SIZE = 74;
// Default resting spot: on the hero image, right side, just below the
// hero's top icon row (bell/mood/avatar, which end around y=66) and above
// where the Today's Verse card begins to overlap the hero's bottom edge.
// Fixed (not screen-size-derived) since it's anchored to the hero, which
// is itself a fixed height.
const HERO_ANCHOR_Y = HERO_MIN_HEIGHT - ANCHOR_SIZE - 30;
function defaultAnchorY() {
  return HERO_ANCHOR_Y;
}
// The furthest down (and still fully on-screen, clear of the bottom nav)
// the icon is ever allowed to sit — used both to clamp an in-progress
// drag on release and to re-validate the current position after a screen
// resize (e.g. rotation). Distinct from defaultAnchorY: that's where the
// icon starts at rest; this is just the outer bound it can never cross.
function maxAnchorY(height: number, insetBottom: number) {
  return Math.max(140, height - ANCHOR_SIZE - insetBottom - NAV_BAR_CLEARANCE);
}

type FloatingDharmaScrollProps = {
  onOpenChat: (origin: { x: number; y: number }) => void;
};

export function FloatingDharmaScroll({ onOpenChat }: FloatingDharmaScrollProps) {
  const isDark = useColorScheme() === 'dark';
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: Math.max(18, width - 112), y: defaultAnchorY() });
  const float = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY({ x: Math.max(18, width - 112), y: defaultAnchorY() })).current;
  const lastPosition = useRef({ x: Math.max(18, width - 112), y: defaultAnchorY() });

  useEffect(() => {
    const next = {
      x: Math.min(lastPosition.current.x, Math.max(18, width - 112)),
      y: Math.min(lastPosition.current.y, maxAnchorY(height, insets.bottom)),
    };
    lastPosition.current = next;
    setPosition(next);
    pan.setValue(next);
  }, [height, insets.bottom, pan, width]);

  useEffect(() => {
    if (reducedMotion) {
      float.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [float, reducedMotion]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 7 || Math.abs(gesture.dy) > 7,
        onPanResponderGrant: () => {
          setDragging(true);
        },
        onPanResponderMove: (_, gesture) => {
          const next = {
            x: lastPosition.current.x + gesture.dx,
            y: lastPosition.current.y + gesture.dy,
          };
          pan.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const maxX = Math.max(18, width - ANCHOR_SIZE - 18);
          const maxY = maxAnchorY(height, insets.bottom);
          const next = {
            x: Math.min(Math.max(18, lastPosition.current.x + gesture.dx), maxX),
            y: Math.min(Math.max(120, lastPosition.current.y + gesture.dy), maxY),
          };
          lastPosition.current = next;
          setPosition(next);
          pan.setValue(next);
          setDragging(false);
        },
        onPanResponderTerminate: () => {
          pan.setValue(lastPosition.current);
          setDragging(false);
        },
      }),
    [height, insets.bottom, pan, width]
  );

  const theme = {
    border: isDark ? COLORS.premiumBorderDark : COLORS.premiumBorderLight,
    soft: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight,
  };

  const translateY = reducedMotion
    ? 0
    : float.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -5],
      });
  const iconScale = dragging ? 1.04 : 1;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.root,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { translateY }],
        },
      ]}
    >
      <View {...panResponder.panHandlers} style={styles.anchor}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Dharma Mitra AI guide"
          accessibilityHint="Drag to move it around the Home screen."
          onPress={() => {
            void Haptics.selectionAsync().catch(() => {});
            onOpenChat(position);
          }}
          style={({ pressed }) => [
            styles.anchorInner,
            {
              opacity: pressed ? 0.84 : 0.88,
              backgroundColor: theme.soft,
              borderColor: theme.border,
              boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
            },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            <Image source={SCROLL_ASSET} style={styles.scrollIcon} contentFit="contain" accessibilityIgnoresInvertColors />
          </Animated.View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: ANCHOR_SIZE,
    height: ANCHOR_SIZE,
    zIndex: 99,
  },
  anchor: {
    position: 'absolute',
    top: 0,
    width: ANCHOR_SIZE,
    height: ANCHOR_SIZE,
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
  },
  anchorInner: {
    flex: 1,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollIcon: {
    width: 68,
    height: 68,
  },
});
