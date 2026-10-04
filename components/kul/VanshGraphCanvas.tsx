import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle as SvgCircle } from 'react-native-svg';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import type { KulFamilyMember } from '@/lib/kul';
import {
  LayoutVanshNode,
  LayoutVanshEdge,
  VanshLayoutResult,
  computeVanshFitScale,
} from '@/lib/vanshLayout';
import {
  COLORS,
  FONTS,
  MIN_TOUCH_TARGET,
  RADII,
  themeColor,
} from '@/lib/constants';

interface VanshGraphCanvasProps {
  layout: VanshLayoutResult;
  selectedMemberId?: string | null;
  onSelectMember?: (member: KulFamilyMember) => void;
  isGuardian?: boolean;
}

export function VanshGraphCanvas({
  layout,
  selectedMemberId,
  onSelectMember,
  isGuardian = false,
}: VanshGraphCanvasProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const { width: windowWidth } = useWindowDimensions();
  const [viewportSize, setViewportSize] = useState({ width: windowWidth - 32, height: 480 });
  const fitScale = computeVanshFitScale(
    layout.canvasWidth,
    layout.canvasHeight,
    viewportSize.width,
    viewportSize.height
  );
  const minimumScale = Math.min(0.12, fitScale);

  // Reanimated 2D Canvas Transform State
  const scale = useSharedValue(fitScale);
  const savedScale = useSharedValue(fitScale);
  const translateX = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(fitScale, { duration: 180 });
    savedScale.value = fitScale;
    translateX.value = withTiming(0, { duration: 180 });
    savedTranslateX.value = 0;
    translateY.value = withTiming(0, { duration: 180 });
    savedTranslateY.value = 0;
  }, [fitScale, savedScale, scale, translateX, translateY, savedTranslateX, savedTranslateY]);

  // Pan (Drag to explore)
  const panGesture = Gesture.Pan()
    .maxPointers(2)
    .onUpdate((e) => {
      'worklet';
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Pinch (Pinch to zoom)
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      'worklet';
      scale.value = Math.min(Math.max(savedScale.value * e.scale, minimumScale), 2.5);
    })
    .onEnd(() => {
      'worklet';
      savedScale.value = scale.value;
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedCanvasStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleZoomIn = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = Math.min(scale.value + 0.25, 2.5);
    scale.value = withTiming(next, { duration: 220 });
    savedScale.value = next;
  };

  const handleZoomOut = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = Math.max(scale.value - 0.25, minimumScale);
    scale.value = withTiming(next, { duration: 220 });
    savedScale.value = next;
  };

  const handleResetZoom = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(fitScale);
    savedScale.value = fitScale;
    translateX.value = withSpring(0);
    savedTranslateX.value = 0;
    translateY.value = withSpring(0);
    savedTranslateY.value = 0;
  };

  const handleMemberPress = (member: KulFamilyMember) => {
    void Haptics.selectionAsync();
    onSelectMember?.(member);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Interactive Gesture Viewport */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={styles.viewport}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setViewportSize((current) =>
              current.width === width && current.height === height
                ? current
                : { width, height }
            );
          }}
        >
          <Animated.View
            style={[
              animatedCanvasStyle,
              {
                width: layout.canvasWidth,
                height: layout.canvasHeight,
                alignSelf: 'center',
              },
            ]}
          >
            {/* Background SVG Connectors (Ancestral Threads) */}
            <Svg
              style={StyleSheet.absoluteFill}
              width={layout.canvasWidth}
              height={layout.canvasHeight}
            >
              <Defs>
                <LinearGradient id="vanshGoldGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={theme.brand} stopOpacity="0.9" />
                  <Stop offset="1" stopColor={theme.brandStrong} stopOpacity="0.45" />
                </LinearGradient>
              </Defs>

              {layout.edges.map((edge: LayoutVanshEdge) => (
                <React.Fragment key={edge.id}>
                  {/* Subtle golden ambient glow path */}
                  <Path
                    d={edge.pathD}
                    fill="none"
                    stroke={isDark ? COLORS.navGlowGoldDark : COLORS.navGlowGoldLight}
                    strokeWidth={edge.type === 'spouse' ? 3.5 : 5.5}
                    strokeLinecap="round"
                    strokeDasharray={edge.type === 'spouse' ? '5,5' : undefined}
                  />
                  {/* Main golden sacred thread */}
                  <Path
                    d={edge.pathD}
                    fill="none"
                    stroke="url(#vanshGoldGradient)"
                    strokeWidth={edge.type === 'spouse' ? 1.8 : 2.2}
                    strokeLinecap="round"
                    strokeDasharray={edge.type === 'spouse' ? '4,4' : undefined}
                  />
                  {/* Node attachment endpoints */}
                  <SvgCircle
                    cx={edge.startX}
                    cy={edge.startY}
                    r={2.8}
                    fill={theme.brand}
                  />
                  <SvgCircle
                    cx={edge.endX}
                    cy={edge.endY}
                    r={3.2}
                    fill={theme.brand}
                  />
                </React.Fragment>
              ))}
            </Svg>

            {/* Top Kuldevi & Gotra Sacred Crest */}
            {layout.crest ? (
              <View
                style={[
                  styles.crestCard,
                  {
                    left: layout.crest.x,
                    top: layout.crest.y,
                    width: layout.crest.width,
                    height: layout.crest.height,
                    backgroundColor: theme.card,
                    borderColor: theme.brand,
                  },
                ]}
              >
                <View style={styles.crestHeaderRow}>
                  <View style={[styles.crestIconCircle, { backgroundColor: theme.brandSoft }]}>
                    <Feather name="shield" size={16} color={theme.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.crestGotraText, { color: theme.brandStrong }]}>
                      {layout.crest.gotra ? `${layout.crest.gotra} Gotra` : 'Kul Parampara'}
                      {layout.crest.pravara ? ` · ${layout.crest.pravara}` : ''}
                    </Text>
                    <Text style={[styles.crestDeityText, { color: theme.text }]} numberOfLines={1}>
                      {layout.crest.kuldeviName ? `Kuldevi: ${layout.crest.kuldeviName}` : ''}
                      {layout.crest.kuldeviName && layout.crest.kuldevtaName ? ' · ' : ''}
                      {layout.crest.kuldevtaName ? `Kuldevta: ${layout.crest.kuldevtaName}` : ''}
                    </Text>
                  </View>
                </View>
                {layout.crest.ancestralOrigin ? (
                  <View style={styles.originRow}>
                    <Feather name="map-pin" size={11} color={theme.dim} />
                    <Text style={[styles.originText, { color: theme.dim }]} numberOfLines={1}>
                      Ancestral Origin: {layout.crest.ancestralOrigin}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Generational Member Cards */}
            {layout.nodes.map((node: LayoutVanshNode) => {
              const member = node.data;
              const isSelected = selectedMemberId === member.id;

              return (
                <Pressable
                  key={member.id}
                  onPress={() => handleMemberPress(member)}
                  style={[
                    styles.memberCard,
                    {
                      left: node.x,
                      top: node.y,
                      width: node.width,
                      height: node.height,
                      backgroundColor: node.isRemembered ? theme.cardSoft : theme.card,
                      borderColor: isSelected
                        ? theme.brand
                        : node.isRemembered
                        ? theme.borderSoft
                        : theme.border,
                      borderWidth: isSelected ? 2 : 1,
                      shadowColor: isSelected ? theme.brand : COLORS.darkBg,
                      shadowOpacity: isSelected ? 0.35 : 0.08,
                      shadowRadius: isSelected ? 10 : 4,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${member.name}, ${member.role || 'Family member'}, generation ${node.generation}, ${node.isRemembered ? 'remembered' : 'living'}`}
                  accessibilityHint={isGuardian
                    ? 'Select to view details and family record actions.'
                    : 'Select to view family details.'}
                  accessibilityState={{ selected: isSelected }}
                >
                  {/* Top Badge: Gen pill & Smriti/Living status */}
                  <View style={styles.cardHeaderRow}>
                    <View
                      style={[
                        styles.genPill,
                        {
                            backgroundColor: theme.brandSoft,
                        },
                      ]}
                    >
                      <Text style={[styles.genPillText, { color: theme.brand }]}>
                        Gen {node.generation}
                      </Text>
                    </View>

                    {node.isRemembered ? (
                      <View style={styles.smritiPill}>
                        <Text style={styles.diyaIcon}>🪔</Text>
                        <Text style={[styles.smritiText, { color: theme.brandStrong }]}>
                          स्मृति
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
                    )}
                  </View>

                  {/* Member Name & Role */}
                  <View style={styles.memberBody}>
                    <Text
                      style={[
                        styles.memberName,
                        { color: theme.text, fontFamily: FONTS.serif },
                      ]}
                      numberOfLines={1}
                    >
                      {member.name}
                    </Text>
                    <Text style={[styles.memberRole, { color: theme.dim }]} numberOfLines={1}>
                      {member.role || 'Family member'}
                    </Text>
                  </View>

                </Pressable>
              );
            })}
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* Floating Canvas Controls */}
      <View style={styles.controlsDock}>
        <Pressable
          onPress={handleZoomIn}
          style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          accessibilityRole="button"
          accessibilityLabel="Zoom in lineage tree"
          accessibilityHint="Increase the tree size."
        >
          <Feather name="plus" size={17} color={theme.text} />
        </Pressable>
        <Pressable
          onPress={handleZoomOut}
          style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          accessibilityRole="button"
          accessibilityLabel="Zoom out lineage tree"
          accessibilityHint="Decrease the tree size."
        >
          <Feather name="minus" size={17} color={theme.text} />
        </Pressable>
        <Pressable
          onPress={handleResetZoom}
          style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          accessibilityRole="button"
          accessibilityLabel="Recenter lineage tree"
          accessibilityHint="Fit the tree to the available space and reset its position."
        >
          <Feather name="maximize-2" size={14} color={theme.brand} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 480,
    borderRadius: RADII.xl,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 8,
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 72,
  },
  crestCard: {
    position: 'absolute',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 12,
    justifyContent: 'center',
    gap: 6,
    elevation: 3,
    shadowColor: COLORS.darkBg,
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  crestHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  crestIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestGotraText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  crestDeityText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  originRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 44,
  },
  originText: {
    fontSize: 11,
  },
  memberCard: {
    position: 'absolute',
    borderRadius: 16,
    padding: 10,
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: COLORS.darkBg,
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  genPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  genPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  smritiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  diyaIcon: {
    fontSize: 11,
  },
  smritiText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  memberBody: {
    gap: 2,
    marginTop: 4,
  },
  memberName: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
  memberRole: {
    fontSize: 11,
  },
  controlsDock: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    flexDirection: 'row',
    gap: 8,
  },
  controlBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: COLORS.darkBg,
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
});
