import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, BackHandler, Easing, Pressable, StyleSheet, useColorScheme, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, SHADOWS, themeColor } from '@/lib/constants';
import { NAV_BAR_CLEARANCE } from '@/lib/nav-bar';
import { useReducedMotion } from '@/components/ui/Motion';

// A near-fullscreen overlay that unrolls from a point on screen (the
// FloatingDharmaScroll anchor's position) like a paper scroll — a shaded
// cylinder appears at that point and unfurls (shrinking + traveling away)
// while the panel content grows behind it, either downward or upward
// depending on which direction has more room. Once mostly open, the
// traveling cylinder crossfades into a pair of persistent rod-style caps
// bookending the content (top and bottom) so it keeps reading as a scroll
// once fully open, not just during the transition. This is a stylized 2D
// illusion built from gradients/transforms (no react-native-skia), the
// same family of trick as this app's existing rollTop/rollBottom scroll
// caps, just scaled up — not a literal rendered 3D cylinder.
//
// Follows this repo's existing full-screen-overlay idiom
// (SankalpaCompletionCeremony.tsx: position:absolute inset:0, animate then
// unmount on close, backdrop tap-to-dismiss) rather than React Native's
// Modal API, since Modal can't be driven by this custom reveal transform.

const ANCHOR_SIZE = 74;
const PANEL_MARGIN = 16;
const BASE_DIAMETER = 40;
const CAP_HEIGHT = 16;
const CAP_OVERHANG = 14;
const CAP_KNOB = 22;

type ScrollUnrollPanelProps = {
  visible: boolean;
  origin: { x: number; y: number };
  onClose: () => void;
  children: ReactNode;
};

export function ScrollUnrollPanel({ visible, origin, onClose, children }: ScrollUnrollPanelProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [mounted, setMounted] = useState(visible);
  // Two values driven in lockstep: progressNative stays on the native
  // driver (cylinder/backdrop transforms + opacity only); progressJS drives
  // the content box's literal `height`, which the native driver can't touch.
  const progressNative = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const progressJS = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const toValue = visible ? 1 : 0;
    const duration = reducedMotion ? 0 : visible ? 420 : 320;
    const easing = visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic);

    const animation = Animated.parallel([
      Animated.timing(progressNative, { toValue, duration, easing, useNativeDriver: true }),
      Animated.timing(progressJS, { toValue, duration, easing, useNativeDriver: false }),
    ]);
    animation.start(({ finished }) => {
      if (finished && !visible) {
        setMounted(false);
      }
    });

    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mounted, reducedMotion]);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [mounted, onClose]);

  // Frozen for this open cycle: recomputes only if the anchor/screen changes
  // (origin doesn't change while the sheet is visible in practice, since the
  // icon can't be dragged while it's open).
  const geometry = useMemo(() => {
    const panelWidth = width - PANEL_MARGIN * 2;
    // Reserves NAV_BAR_CLEARANCE so the composer at the bottom of the sheet
    // never lands under CollapsibleBottomNav's floating band (that bar is
    // mounted above this screen's own stacking context, so no zIndex here
    // can win against it — the only fix is to not overlap it at all).
    const panelHeight = height - insets.top - insets.bottom - PANEL_MARGIN * 2 - NAV_BAR_CLEARANCE;
    const minTop = insets.top + PANEL_MARGIN;
    const maxBottomEdge = height - insets.bottom - PANEL_MARGIN - NAV_BAR_CLEARANCE;

    const spaceBelow = height - origin.y;
    const spaceAbove = origin.y + ANCHOR_SIZE;
    const direction: 'down' | 'up' = spaceBelow >= spaceAbove ? 'down' : 'up';

    const iconCenterX = origin.x + ANCHOR_SIZE / 2;
    const panelCenterX = PANEL_MARGIN + panelWidth / 2;
    const startTranslateX = iconCenterX - panelCenterX;

    if (direction === 'down') {
      // Content box's top is pinned near the icon (clamped to stay fully
      // on screen); the cylinder starts exactly at the icon and travels
      // down to the box's far (bottom) edge as it unrolls.
      const anchoredTop = Math.min(Math.max(origin.y, minTop), maxBottomEdge - panelHeight);
      const cylinderBaseTop = origin.y;
      const cylinderTargetTop = anchoredTop + panelHeight - BASE_DIAMETER;
      return {
        direction,
        panelWidth,
        panelHeight,
        boxStyle: { top: anchoredTop, left: PANEL_MARGIN },
        innerStyle: { top: 0 as const },
        contentTop: anchoredTop,
        contentBottom: anchoredTop + panelHeight,
        cylinderBaseTop,
        cylinderTravelY: cylinderTargetTop - cylinderBaseTop,
        seamOffset: BASE_DIAMETER,
        startTranslateX,
      };
    }

    // Growing upward: content box's bottom is pinned near the icon's own
    // bottom edge; the cylinder starts aligned to the icon's bottom and
    // travels up to the box's far (top) edge as it unrolls.
    const desiredBottomEdge = origin.y + ANCHOR_SIZE;
    const clampedBottomEdge = Math.max(Math.min(desiredBottomEdge, maxBottomEdge), minTop + panelHeight);
    const cylinderBaseTop = origin.y + ANCHOR_SIZE - BASE_DIAMETER;
    const cylinderTargetTop = clampedBottomEdge - panelHeight;
    return {
      direction,
      panelWidth,
      panelHeight,
      boxStyle: { bottom: height - clampedBottomEdge, left: PANEL_MARGIN },
      innerStyle: { bottom: 0 as const },
      contentTop: clampedBottomEdge - panelHeight,
      contentBottom: clampedBottomEdge,
      cylinderBaseTop,
      cylinderTravelY: cylinderTargetTop - cylinderBaseTop,
      seamOffset: -12,
      startTranslateX,
    };
  }, [origin.x, origin.y, width, height, insets.top, insets.bottom]);

  if (!mounted) {
    return null;
  }

  const backdropOpacity = progressNative.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const contentHeight = progressJS.interpolate({ inputRange: [0, 1], outputRange: [0, geometry.panelHeight] });

  // Diameter: holds full thickness through the initial "widen" phase, then
  // thins as it finishes unrolling.
  const cylinderScaleY = progressNative.interpolate({
    inputRange: [0, 0.18, 0.6, 0.9],
    outputRange: [1, 1, 0.2, 0.05],
  });
  // Length: snaps from icon-width to full panel-width quickly — the least
  // physically honest part of a real scroll, kept fast so the icon
  // crossfade (in FloatingDharmaScroll) distracts from it.
  const cylinderScaleX = progressNative.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [ANCHOR_SIZE / geometry.panelWidth, 1, 1],
  });
  const cylinderTranslateX = progressNative.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [geometry.startTranslateX, 0, 0],
  });
  const cylinderTranslateY = progressNative.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0, 0, geometry.cylinderTravelY],
  });
  // The traveling roll dissolves gradually (not a late snap) into the
  // persistent caps below, which fade in over roughly the same stretch —
  // an overlapping crossfade rather than a hard handoff.
  const cylinderOpacity = progressNative.interpolate({ inputRange: [0, 0.5, 0.9, 1], outputRange: [1, 1, 0, 0] });
  const capOpacity = progressNative.interpolate({ inputRange: [0, 0.5, 0.85, 1], outputRange: [0, 0, 1, 1] });

  const capGradientColors: [string, string, string, string] = [
    COLORS.ink,
    isDark ? COLORS.premiumGlassDark : COLORS.premiumGlassLight,
    COLORS.brandGold,
    COLORS.ink,
  ];

  return (
    <View pointerEvents={visible ? 'auto' : 'box-none'} style={[StyleSheet.absoluteFill, { zIndex: 200 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.celebrationScrim, opacity: backdropOpacity }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close Dharma Mitra" onPress={onClose} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[
          styles.contentBox,
          geometry.boxStyle,
          {
            width: geometry.panelWidth,
            height: contentHeight,
            borderColor: theme.premiumBorder,
            boxShadow: isDark ? SHADOWS.lg.dark : SHADOWS.lg.light,
          },
        ]}
      >
        {/* Solid opaque base first — the gradient's accent stop below is
            deliberately semi-transparent (a tint, not a fill), so without
            this base it would let whatever is behind the whole overlay
            show through instead of blending with the card color. */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.card }]} />
        <LinearGradient
          colors={[theme.card, isDark ? COLORS.homeRaisedDark : COLORS.homeRaisedLight, `${theme.brand}10`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -60,
            right: -50,
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: theme.brandSoft,
          }}
        />
        {/* Subtle curled-edge vignette on both sides, suggesting rolled
            paper rather than a flat modern card. */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.10)', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 16 }}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.10)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 16 }}
        />
        <View style={[styles.innerContent, geometry.innerStyle, { width: geometry.panelWidth, height: geometry.panelHeight }]}>
          {children}
        </View>
      </Animated.View>

      {/* Persistent scroll-rod caps — appear once the panel has mostly
          finished growing and stay for the rest of the open state, framing
          the content like the rolled ends of a real scroll. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.capRow,
          { top: geometry.contentTop - CAP_HEIGHT / 2, left: PANEL_MARGIN - CAP_OVERHANG, opacity: capOpacity },
        ]}
      >
        <View style={[styles.capKnob, { backgroundColor: COLORS.ink }]} />
        <LinearGradient
          colors={capGradientColors}
          locations={[0, 0.32, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.capBar, { width: geometry.panelWidth + CAP_OVERHANG * 2 - CAP_KNOB * 2 }]}
        />
        <View style={[styles.capKnob, { backgroundColor: COLORS.ink }]} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.capRow,
          { top: geometry.contentBottom - CAP_HEIGHT / 2, left: PANEL_MARGIN - CAP_OVERHANG, opacity: capOpacity },
        ]}
      >
        <View style={[styles.capKnob, { backgroundColor: COLORS.ink }]} />
        <LinearGradient
          colors={capGradientColors}
          locations={[0, 0.32, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.capBar, { width: geometry.panelWidth + CAP_OVERHANG * 2 - CAP_KNOB * 2 }]}
        />
        <View style={[styles.capKnob, { backgroundColor: COLORS.ink }]} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.seam,
          {
            top: geometry.cylinderBaseTop + geometry.seamOffset,
            left: PANEL_MARGIN,
            width: geometry.panelWidth,
            opacity: cylinderOpacity,
            transform: [{ translateX: cylinderTranslateX }, { translateY: cylinderTranslateY }, { scaleX: cylinderScaleX }],
          },
        ]}
      >
        <LinearGradient colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0)']} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.cylinder,
          {
            top: geometry.cylinderBaseTop,
            left: PANEL_MARGIN,
            width: geometry.panelWidth,
            opacity: cylinderOpacity,
            transform: [
              { translateX: cylinderTranslateX },
              { translateY: cylinderTranslateY },
              { scaleX: cylinderScaleX },
              { scaleY: cylinderScaleY },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={capGradientColors}
          locations={[0, 0.32, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.cylinderFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentBox: {
    position: 'absolute',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  innerContent: {
    position: 'absolute',
    left: 0,
  },
  cylinder: {
    position: 'absolute',
    height: BASE_DIAMETER,
    borderRadius: BASE_DIAMETER / 2,
    overflow: 'hidden',
  },
  cylinderFill: {
    flex: 1,
  },
  seam: {
    position: 'absolute',
    height: 12,
  },
  capRow: {
    position: 'absolute',
    height: CAP_KNOB,
    flexDirection: 'row',
    alignItems: 'center',
  },
  capBar: {
    height: CAP_HEIGHT,
    borderRadius: CAP_HEIGHT / 2,
  },
  capKnob: {
    width: CAP_KNOB,
    height: CAP_KNOB,
    borderRadius: CAP_KNOB / 2,
  },
});
