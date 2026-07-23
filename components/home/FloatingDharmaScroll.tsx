import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE } from '@/lib/constants';
import { useReducedMotion } from '@/components/ui/Motion';

const SCROLL_ASSET = require('@/assets/icons/ai-guide-scroll.png');
const ANCHOR_SIZE = 74;
const PANEL_WIDTH = 248;
const PANEL_HEIGHT = 112;

type FloatingDharmaScrollProps = {
  onOpenChat: () => void;
};

export function FloatingDharmaScroll({ onOpenChat }: FloatingDharmaScrollProps) {
  const isDark = useColorScheme() === 'dark';
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: Math.max(18, width - 112), y: Math.max(170, height - 280) });
  const openProgress = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY({ x: Math.max(18, width - 112), y: Math.max(170, height - 280) })).current;
  const lastPosition = useRef({ x: Math.max(18, width - 112), y: Math.max(170, height - 280) });

  useEffect(() => {
    const next = {
      x: Math.min(lastPosition.current.x, Math.max(18, width - 112)),
      y: Math.min(lastPosition.current.y, Math.max(150, height - 244)),
    };
    lastPosition.current = next;
    setPosition(next);
    pan.setValue(next);
  }, [height, pan, width]);

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

  useEffect(() => {
    Animated.timing(openProgress, {
      toValue: open ? 1 : 0,
      duration: reducedMotion ? 0 : open ? 240 : 170,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, openProgress, reducedMotion]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 7 || Math.abs(gesture.dy) > 7,
        onPanResponderGrant: () => {
          setDragging(true);
          setOpen(false);
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
          const maxY = Math.max(140, height - ANCHOR_SIZE - 112);
          const next = {
            x: Math.min(Math.max(18, lastPosition.current.x + gesture.dx), maxX),
            y: Math.min(Math.max(120, lastPosition.current.y + gesture.dy), maxY),
          };
          lastPosition.current = next;
          setPosition(next);
          pan.setValue(next);
          setDragging(false);
        },
        onPanResponderTerminate: () => setDragging(false),
      }),
    [height, pan, width]
  );

  const theme = {
    panel: isDark ? COLORS.premiumGlassDark : COLORS.premiumGlassLight,
    border: isDark ? COLORS.premiumBorderDark : COLORS.premiumBorderLight,
    text: isDark ? COLORS.brandAccentLight : COLORS.ink,
    dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
    brand: isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight,
    soft: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight,
  };

  const translateY = reducedMotion
    ? 0
    : float.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -5],
      });
  const panelOpacity = openProgress;
  const panelScaleY = openProgress.interpolate({ inputRange: [0, 1], outputRange: [0.18, 1] });
  const opensLeft = position.x > width / 2;
  const rootTranslateX = Animated.add(pan.x, opensLeft ? -(PANEL_WIDTH - ANCHOR_SIZE) : 0);
  const panelTranslateY = openProgress.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
  const iconScale = dragging ? 1.04 : openProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.root,
        {
          transform: [{ translateX: rootTranslateX }, { translateY: pan.y }, { translateY }],
        },
      ]}
    >
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[
          styles.panel,
          {
            opacity: panelOpacity,
            backgroundColor: theme.panel,
            borderColor: theme.border,
            boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
            transform: [{ translateY: panelTranslateY }, { scaleY: panelScaleY }],
          },
        ]}
      >
        <View style={[styles.rollCap, styles.rollTop, { backgroundColor: theme.soft, borderColor: theme.border }]} />
        <View style={styles.panelCopy}>
          <Text style={[styles.eyebrow, { color: theme.brand }]}>Dharma Mitra</Text>
          <Text style={[styles.title, { color: theme.text }]}>Ask gently</Text>
          <Text style={[styles.body, { color: theme.dim }]} numberOfLines={2}>
            Unroll a question, verse, or next step.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Dharma Mitra AI guide"
          onPress={() => {
            void Haptics.selectionAsync().catch(() => {});
            onOpenChat();
          }}
          style={[styles.chatButton, { backgroundColor: theme.brand }]}
        >
          <Feather name="message-circle" size={17} color={COLORS.onMediaWhite} />
        </Pressable>
        <View style={[styles.rollCap, styles.rollBottom, { backgroundColor: theme.soft, borderColor: theme.border }]} />
      </Animated.View>

      <Pressable
        {...panResponder.panHandlers}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Close Dharma Mitra scroll' : 'Open Dharma Mitra scroll'}
        accessibilityHint="Drag to move it around the Home screen."
        onPress={() => {
          void Haptics.selectionAsync().catch(() => {});
          setOpen((value) => !value);
        }}
        style={({ pressed }) => [
          styles.anchor,
          {
            opacity: pressed ? 0.84 : 0.88,
            backgroundColor: theme.soft,
            borderColor: theme.border,
            boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
            left: opensLeft ? PANEL_WIDTH - ANCHOR_SIZE : 0,
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          <Image source={SCROLL_ASSET} style={styles.scrollIcon} contentFit="contain" accessibilityIgnoresInvertColors />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT + ANCHOR_SIZE + 8,
    zIndex: 30,
  },
  anchor: {
    position: 'absolute',
    bottom: 0,
    width: ANCHOR_SIZE,
    height: ANCHOR_SIZE,
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollIcon: {
    width: 68,
    height: 68,
  },
  panel: {
    position: 'absolute',
    bottom: ANCHOR_SIZE + 8,
    width: PANEL_WIDTH,
    minHeight: PANEL_HEIGHT,
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 17,
    paddingHorizontal: 15,
    paddingRight: 62,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  panelCopy: {
    gap: 2,
  },
  rollCap: {
    position: 'absolute',
    left: 18,
    right: 18,
    height: 7,
    borderRadius: 999,
    borderWidth: 1,
    opacity: 0.55,
  },
  rollTop: {
    top: 8,
  },
  rollBottom: {
    bottom: 8,
  },
  eyebrow: {
    ...TYPE.micro,
    fontFamily: FONTS.sansSemiBold,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    ...TYPE.cardHeading,
    fontFamily: FONTS.serifBold,
  },
  body: {
    ...TYPE.caption,
  },
  chatButton: {
    position: 'absolute',
    right: 13,
    top: 35,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
