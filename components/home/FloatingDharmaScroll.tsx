import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, useColorScheme, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, MIN_TOUCH_TARGET, SHADOWS } from '@/lib/constants';
import { NAV_BAR_CLEARANCE } from '@/lib/nav-bar';
import {
  HERO_SIZE_CONFIG,
  clampFloatingScrollPosition,
  getFloatingScrollPosition,
  resolveDefaultFloatingScrollPosition,
  setFloatingScrollPosition,
} from '@/lib/heroLayoutPreference';
import { useReducedMotion } from '@/components/ui/Motion';

const SCROLL_ASSET = require('@/assets/icons/ai-guide-scroll.png');
const ANCHOR_SIZE = 74;

type FloatingDharmaScrollProps = {
  onOpenChat: (origin: { x: number; y: number }) => void;
  heroHeight?: number;
};

export function FloatingDharmaScroll({
  onOpenChat,
  heroHeight = HERO_SIZE_CONFIG.standard.height,
}: FloatingDharmaScrollProps) {
  const isDark = useColorScheme() === 'dark';
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [dragging, setDragging] = useState(false);

  const hasUserMoved = useRef(false);
  const initialPosition = resolveDefaultFloatingScrollPosition({
    heroHeight,
    screenWidth: width,
    screenHeight: height,
    insetBottom: insets.bottom,
    navClearance: NAV_BAR_CLEARANCE,
    anchorSize: ANCHOR_SIZE,
  });
  const [position, setPosition] = useState(initialPosition);
  const float = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY(initialPosition)).current;
  const lastPosition = useRef(initialPosition);

  useEffect(() => {
    let active = true;
    void getFloatingScrollPosition().then((saved) => {
      if (!active || !saved) return;
      const next = clampFloatingScrollPosition(
        saved,
        width,
        height,
        insets.bottom,
        NAV_BAR_CLEARANCE,
        ANCHOR_SIZE,
      );
      hasUserMoved.current = true;
      lastPosition.current = next;
      setPosition(next);
      pan.setValue(next);
    });
    return () => {
      active = false;
    };
  }, [height, insets.bottom, pan, width]);

  useEffect(() => {
    const next = hasUserMoved.current
      ? clampFloatingScrollPosition(
          lastPosition.current,
          width,
          height,
          insets.bottom,
          NAV_BAR_CLEARANCE,
          ANCHOR_SIZE,
        )
      : resolveDefaultFloatingScrollPosition({
          heroHeight,
          screenWidth: width,
          screenHeight: height,
          insetBottom: insets.bottom,
          navClearance: NAV_BAR_CLEARANCE,
          anchorSize: ANCHOR_SIZE,
        });
    lastPosition.current = next;
    setPosition(next);
    pan.setValue(next);
  }, [height, heroHeight, insets.bottom, pan, width]);

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
          hasUserMoved.current = true;
          const next = clampFloatingScrollPosition(
            {
              x: lastPosition.current.x + gesture.dx,
              y: lastPosition.current.y + gesture.dy,
            },
            width,
            height,
            insets.bottom,
            NAV_BAR_CLEARANCE,
            ANCHOR_SIZE,
          );
          lastPosition.current = next;
          setPosition(next);
          pan.setValue(next);
          void setFloatingScrollPosition(next);
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
