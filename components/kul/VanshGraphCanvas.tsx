import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
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
import { getKinshipTier, type KinshipTier } from '@/lib/kinship';

interface VanshGraphCanvasProps {
  layout: VanshLayoutResult;
  selectedMemberId?: string | null;
  onSelectMember?: (member: KulFamilyMember) => void;
  isGuardian?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function VanshGraphCanvas({
  layout,
  selectedMemberId,
  onSelectMember,
  isGuardian = false,
  style,
}: VanshGraphCanvasProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [viewportSize, setViewportSize] = useState({
    width: windowWidth - 32,
    height: Math.max(windowHeight - 200, 480),
  });
  const [activeKinshipTier, setActiveKinshipTier] = useState<KinshipTier | null>(null);
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
    <View style={[styles.container, { backgroundColor: theme.bg }, style]}>
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
                    shadowColor: theme.brand,
                    shadowOpacity: isDark ? 0.22 : 0.1,
                    shadowRadius: 8,
                  },
                ]}
              >
                <View style={styles.crestHeaderRow}>
                  <View style={[styles.crestIconCircle, { backgroundColor: theme.brandSoft }]}>
                    <Feather name="shield" size={16} color={theme.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.crestGotraText, { color: theme.brandStrong, fontFamily: FONTS.serifBold }]}>
                      {layout.crest.gotra ? `${layout.crest.gotra} Gotra` : 'Kul Parampara'}
                      {layout.crest.pravara ? ` · ${layout.crest.pravara}` : ''}
                    </Text>
                    <Text style={[styles.crestDeityText, { color: theme.text, fontFamily: FONTS.sans }]} numberOfLines={1}>
                      {layout.crest.kuldeviName ? `Kuldevi: ${layout.crest.kuldeviName}` : ''}
                      {layout.crest.kuldeviName && layout.crest.kuldevtaName ? ' · ' : ''}
                      {layout.crest.kuldevtaName ? `Kuldevta: ${layout.crest.kuldevtaName}` : ''}
                    </Text>
                  </View>
                </View>
                {layout.crest.ancestralOrigin ? (
                  <View style={styles.originRow}>
                    <Feather name="map-pin" size={11} color={theme.dim} />
                    <Text style={[styles.originText, { color: theme.dim, fontFamily: FONTS.sans }]} numberOfLines={1}>
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
              const kinshipTier = getKinshipTier(node.generation);

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
                      shadowOpacity: isSelected ? 0.42 : 0.08,
                      shadowRadius: isSelected ? 12 : 4,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${member.name}, ${member.role || 'Family member'}, ${kinshipTier.label}, generation ${node.generation}, ${node.isRemembered ? 'remembered' : 'living'}`}
                  accessibilityHint={isGuardian
                    ? 'Select to view details and family record actions.'
                    : 'Select to view family details.'}
                  accessibilityState={{ selected: isSelected }}
                >
                  {/* Selection Highlight Ring */}
                  {isSelected ? (
                    <View
                      pointerEvents="none"
                      style={[styles.selectionRing, { borderColor: theme.brand }]}
                    />
                  ) : null}

                  {/* Top Header: Kinship Badge (left) & Diya/status indicator (right) */}
                  <View style={styles.cardHeaderRow}>
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        void Haptics.selectionAsync();
                        setActiveKinshipTier(kinshipTier);
                      }}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`${kinshipTier.label}, generation ${node.generation}. Tap for kinship explanation.`}
                      style={[
                        styles.kinshipPill,
                        {
                          borderColor: theme.borderSoft,
                          backgroundColor: theme.brandSoft,
                        },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[styles.kinshipPillText, { color: theme.brand }]}
                      >
                        {kinshipTier.label}
                      </Text>
                    </Pressable>

                    {node.isRemembered ? (
                      <View
                        style={[
                          styles.smritiPill,
                          {
                            borderColor: theme.borderSoft,
                            backgroundColor: theme.brandSoft,
                          },
                        ]}
                      >
                        <Text style={styles.diyaIcon}>🪔</Text>
                      </View>
                    ) : node.data.linked_user_id ? (
                      <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
                    ) : (
                      <View style={{ width: 6 }} />
                    )}
                  </View>

                  {/* Centered Sacred Avatar Circle */}
                  <View style={[styles.avatarCircle, { backgroundColor: theme.brandSoft }]}>
                    <Text style={{ fontFamily: FONTS.serifBold, fontSize: 15, color: theme.brand }}>
                      {member.name.trim().charAt(0).toUpperCase() || 'ॐ'}
                    </Text>
                  </View>

                  {/* Member Name & Role */}
                  <View style={styles.memberBody}>
                    <Text
                      style={[
                        styles.memberName,
                        { color: theme.text, fontFamily: FONTS.serifBold, textAlign: 'center' },
                      ]}
                      numberOfLines={1}
                    >
                      {member.name}
                    </Text>
                    <Text style={[styles.memberRole, { color: theme.dim, fontFamily: FONTS.sans, textAlign: 'center' }]} numberOfLines={1}>
                      {member.role || 'Family member'}
                    </Text>
                    {member.linked_user_id ? (
                      <View style={[styles.linkedBadgeRow, { justifyContent: 'center' }]}>
                        <Feather name="check-circle" size={9} color={theme.brand} />
                        <Text numberOfLines={1} style={[styles.linkedBadgeText, { color: theme.brand, fontFamily: FONTS.sansSemiBold }]}>
                          On Shoonaya
                        </Text>
                      </View>
                    ) : null}
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

      {/* Kinship Explainer Tooltip Modal */}
      {activeKinshipTier ? (
        <Modal
          transparent
          animationType="fade"
          visible={Boolean(activeKinshipTier)}
          onRequestClose={() => setActiveKinshipTier(null)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setActiveKinshipTier(null)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={[
                styles.tooltipCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.tooltipHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Text style={[styles.tooltipTitle, { color: theme.text, fontFamily: FONTS.serifBold }]}>
                    {activeKinshipTier.label}
                  </Text>
                  <View style={[styles.genTag, { backgroundColor: theme.brandSoft }]}>
                    <Text style={[styles.genTagText, { color: theme.brand }]}>
                      Gen {activeKinshipTier.generation}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setActiveKinshipTier(null)}
                  hitSlop={10}
                  accessibilityLabel="Close kinship explanation"
                >
                  <Feather name="x" size={18} color={theme.dim} />
                </Pressable>
              </View>

              <Text style={[styles.tooltipSubtitle, { color: theme.brand, fontFamily: FONTS.sansSemiBold }]}>
                {activeKinshipTier.hindiLabel} · {activeKinshipTier.description}
              </Text>

              <Text style={[styles.tooltipBody, { color: theme.text, fontFamily: FONTS.sans }]}>
                {activeKinshipTier.tooltip}
              </Text>

              <View style={[styles.tooltipDivider, { borderTopColor: theme.borderSoft }]}>
                <Text style={[styles.tooltipNote, { color: theme.dim, fontFamily: FONTS.sans }]}>
                  In Kutumb Vansh, generations trace your sacred roots from foundational elders down to future descendants.
                </Text>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 480,
    borderRadius: RADII.xl,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 0,
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
  selectionRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 19,
    borderWidth: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 18,
  },
  kinshipPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 1,
    maxWidth: 84,
  },
  kinshipPillText: {
    fontSize: 9,
    fontFamily: FONTS.sansSemiBold,
    lineHeight: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#0C0A07BB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tooltipCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  tooltipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tooltipTitle: {
    fontSize: 17,
    lineHeight: 22,
  },
  genTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  genTagText: {
    fontSize: 10,
    fontFamily: FONTS.sansSemiBold,
  },
  tooltipSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  tooltipBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  tooltipDivider: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  tooltipNote: {
    fontSize: 11,
    lineHeight: 16,
  },
  genPill: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 7,
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
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 7,
    borderWidth: 1,
  },
  diyaIcon: {
    fontSize: 10,
  },
  smritiText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 2,
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
  linkedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  linkedBadgeText: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  controlsDock: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    flexDirection: 'column',
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
