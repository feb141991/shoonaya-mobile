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

import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS } from '@/lib/constants';
import { useReducedMotion } from '@/components/ui/Motion';

const SCROLL_ASSET = require('@/assets/icons/ai-guide-scroll.png');
const ANCHOR_SIZE = 74;
const PANEL_WIDTH = 310;
const PANEL_HEIGHT = 260;

type FloatingDharmaScrollProps = {
  onOpenChat: () => void;
};

export function FloatingDharmaScroll({ onOpenChat }: FloatingDharmaScrollProps) {
  const isDark = useColorScheme() === 'dark';
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: Math.max(18, width - 112), y: Math.max(170, height - 320) });
  const openProgress = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY({ x: Math.max(18, width - 112), y: Math.max(170, height - 320) })).current;
  const lastPosition = useRef({ x: Math.max(18, width - 112), y: Math.max(170, height - 320) });

  useEffect(() => {
    const next = {
      x: Math.min(lastPosition.current.x, Math.max(18, width - 112)),
      y: Math.min(lastPosition.current.y, Math.max(150, height - ANCHOR_SIZE - PANEL_HEIGHT - 8)),
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
          const maxY = Math.max(140, height - ANCHOR_SIZE - PANEL_HEIGHT - 8);
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
  const panelScaleY = openProgress.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  // The anchor always renders at its true drag position (pan.x, below), but
  // a 310px panel attached rigidly to a 74px anchor can't fit on either
  // side for many middle-of-screen positions. Instead, clamp the panel's
  // own left edge to the screen margins (independent of which side it
  // "attaches" to) and correct for the difference with a local translateX —
  // the anchor stays exactly where dragged; only the panel slides to hug
  // whichever margin it would otherwise overflow.
  const panelMargin = 18;
  const panelLeftMax = Math.max(panelMargin, width - PANEL_WIDTH - panelMargin);
  const clampedPanelLeft = Math.min(Math.max(position.x, panelMargin), panelLeftMax);
  const panelOffsetX = clampedPanelLeft - position.x;

  // Transform origin bottom approximation: (1 - 0.55) / 2 * PANEL_HEIGHT = 0.225 * 260 = 58.5
  const panelTranslateY = openProgress.interpolate({ inputRange: [0, 1], outputRange: [59, 0] });
  const iconScale = dragging ? 1.04 : openProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] });

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
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[
          styles.panel,
          {
            opacity: panelOpacity,
            backgroundColor: theme.panel,
            borderColor: theme.border,
            boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
            transform: [{ translateX: panelOffsetX }, { translateY: panelTranslateY }, { scaleY: panelScaleY }],
          },
        ]}
      >
        <View style={[styles.rollCap, styles.rollTop, { backgroundColor: theme.soft, borderColor: theme.border }]} />
        <View style={styles.panelCopy}>
          <Text style={[styles.eyebrow, { color: theme.brand }]}>Dharma Mitra</Text>
          <Text style={[styles.title, { color: theme.text }]}>Ask gently</Text>
          <Text style={[styles.body, { color: theme.dim }]}>
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
          style={({ pressed }) => [
            styles.chatButton,
            { backgroundColor: theme.brand, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={styles.chatButtonText}>Open Dharma Mitra</Text>
          <Feather name="arrow-right" size={16} color={COLORS.onMediaWhite} style={{ marginLeft: 4 }} />
        </Pressable>
        <View style={[styles.rollCap, styles.rollBottom, { backgroundColor: theme.soft, borderColor: theme.border }]} />
      </Animated.View>

      <View {...panResponder.panHandlers} style={styles.anchor}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={open ? 'Close Dharma Mitra scroll' : 'Open Dharma Mitra scroll'}
          accessibilityHint="Drag to move it around the Home screen."
          onPress={() => {
            void Haptics.selectionAsync().catch(() => {});
            setOpen((value) => !value);
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
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT + ANCHOR_SIZE + 8,
    zIndex: 99,
  },
  anchor: {
    position: 'absolute',
    top: PANEL_HEIGHT + 8,
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
  panel: {
    position: 'absolute',
    top: 0,
    width: PANEL_WIDTH,
    minHeight: PANEL_HEIGHT,
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  panelCopy: {
    gap: 4,
  },
  rollCap: {
    position: 'absolute',
    left: 20,
    right: 20,
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
    fontSize: 11,
    fontFamily: FONTS.sansSemiBold,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 19,
    fontFamily: FONTS.serifBold,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  chatButton: {
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  chatButtonText: {
    color: COLORS.onMediaWhite,
    fontSize: 14,
    fontFamily: FONTS.sansSemiBold,
  },
});
