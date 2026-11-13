import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useReducedMotion,
  runOnJS,
} from 'react-native-reanimated';
import { useIsFocused } from 'expo-router';

import type { KulFamilyMember } from '@/lib/kul';
import {
  type VanshLayoutResult,
} from '@/lib/vanshLayout';
import {
  COLORS,
  FONTS,
  RADII,
  themeColor,
} from '@/lib/constants';
import { getKinshipTier, type KinshipTier } from '@/lib/kinship';
import {
  type VanshViewMode,
  type Vansh3DNode,
  type Vansh3DCrest,
  VIEW_PRESETS,
  computeVansh3DLayout,
  computePanAngles,
  computePinchZoom,
  project3D,
  isAnyGestureActive,
  shouldAutoOrbitRun,
} from '@/lib/vansh3d';
import { VanshTopHud } from './VanshTopHud';
import { VanshKinshipModal } from './VanshKinshipModal';
import { VanshControlsDock } from './VanshControlsDock';
import { VanshFilaments } from './VanshFilaments';
import { VanshCrestBadge } from './VanshCrestBadge';
import { VanshBottomHud } from './VanshBottomHud';

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
  const isReducedMotion = Boolean(useReducedMotion());
  const isScreenFocused = useIsFocused();

  const [viewportSize, setViewportSize] = useState({
    width: windowWidth - 32,
    height: Math.max(windowHeight - 200, 480),
  });

  const [activeKinshipTier, setActiveKinshipTier] = useState<KinshipTier | null>(null);
  const [viewMode, setViewMode] = useState<VanshViewMode>('orbit');
  const [autoOrbit, setAutoOrbit] = useState<boolean>(false);
  const [isAppActive, setIsAppActive] = useState<boolean>(true);
  const [isInteractingState, setIsInteractingState] = useState<boolean>(false);

  // AppState background/foreground lifecycle tracking
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      setIsAppActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  // Compute 3D generational topology and adaptive fitScale from layout
  const layout3D = useMemo(() => {
    return computeVansh3DLayout(
      layout.nodes,
      layout.edges,
      layout.crest,
      viewportSize.width,
      viewportSize.height
    );
  }, [layout, viewportSize.width, viewportSize.height]);

  const initialPreset = VIEW_PRESETS.orbit;
  const rotX = useSharedValue(initialPreset.rotX);
  const savedRotX = useSharedValue(initialPreset.rotX);
  const rotY = useSharedValue(initialPreset.rotY);
  const savedRotY = useSharedValue(initialPreset.rotY);
  const zoom = useSharedValue(initialPreset.zoom);
  const savedZoom = useSharedValue(initialPreset.zoom);
  const isInteracting = useSharedValue(false);
  const panActive = useSharedValue(false);
  const pinchActive = useSharedValue(false);
  const lastSyncTime = useSharedValue(0);

  const [camera, setCamera] = useState({
    rotX: initialPreset.rotX,
    rotY: initialPreset.rotY,
    zoom: initialPreset.zoom,
  });

  const rafRef = useRef<number | null>(null);
  const pendingCameraRef = useRef<{ rotX: number; rotY: number; zoom: number } | null>(null);

  const scheduleSync = useCallback((rx: number, ry: number, z: number) => {
    pendingCameraRef.current = { rotX: rx, rotY: ry, zoom: z };
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (pendingCameraRef.current) {
          setCamera(pendingCameraRef.current);
          pendingCameraRef.current = null;
        }
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const handleInteractionStart = useCallback(() => {
    if (autoOrbit) setAutoOrbit(false);
  }, [autoOrbit]);

  // Gestures with baseline translation, scale math & bridge rate-limiting
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      isInteracting.value = true;
      panActive.value = true;
      savedRotX.value = rotX.value;
      savedRotY.value = rotY.value;
      runOnJS(setIsInteractingState)(true);
      runOnJS(handleInteractionStart)();
    })
    .onUpdate((e) => {
      'worklet';
      const next = computePanAngles(savedRotX.value, savedRotY.value, e.translationX, e.translationY);
      rotX.value = next.rotX;
      rotY.value = next.rotY;

      const now = Date.now();
      if (now - lastSyncTime.value >= 24) {
        lastSyncTime.value = now;
        runOnJS(scheduleSync)(next.rotX, next.rotY, zoom.value);
      }
    })
    .onEnd(() => {
      'worklet';
      savedRotX.value = rotX.value;
      savedRotY.value = rotY.value;
      runOnJS(scheduleSync)(rotX.value, rotY.value, zoom.value);
    })
    .onFinalize(() => {
      'worklet';
      panActive.value = false;
      const stillInteracting = isAnyGestureActive(panActive.value, pinchActive.value);
      isInteracting.value = stillInteracting;
      runOnJS(setIsInteractingState)(stillInteracting);
      if (!stillInteracting) {
        runOnJS(scheduleSync)(rotX.value, rotY.value, zoom.value);
      }
    });

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      'worklet';
      isInteracting.value = true;
      pinchActive.value = true;
      savedZoom.value = zoom.value;
      runOnJS(setIsInteractingState)(true);
      runOnJS(handleInteractionStart)();
    })
    .onUpdate((e) => {
      'worklet';
      const nextZoom = computePinchZoom(savedZoom.value, e.scale);
      zoom.value = nextZoom;

      const now = Date.now();
      if (now - lastSyncTime.value >= 24) {
        lastSyncTime.value = now;
        runOnJS(scheduleSync)(rotX.value, rotY.value, nextZoom);
      }
    })
    .onEnd(() => {
      'worklet';
      savedZoom.value = zoom.value;
      runOnJS(scheduleSync)(rotX.value, rotY.value, zoom.value);
    })
    .onFinalize(() => {
      'worklet';
      pinchActive.value = false;
      const stillInteracting = isAnyGestureActive(panActive.value, pinchActive.value);
      isInteracting.value = stillInteracting;
      runOnJS(setIsInteractingState)(stillInteracting);
      if (!stillInteracting) {
        runOnJS(scheduleSync)(rotX.value, rotY.value, zoom.value);
      }
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Auto-Orbit lifecycle: respects focus, app state, user interaction, and reduced motion
  const isAutoOrbitActive = shouldAutoOrbitRun({
    isEnabled: autoOrbit,
    isInteracting: isInteractingState,
    isFocused: isScreenFocused,
    isAppActive,
    isReducedMotion,
  });

  useEffect(() => {
    if (!isAutoOrbitActive || viewMode !== 'orbit') return;

    let animId: number;
    let lastTime = Date.now();
    let accumulatedTime = 0;

    const loop = () => {
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (!isInteracting.value) {
        accumulatedTime += dt;
        // Throttle React renders to ~25fps (every 40ms) instead of 60fps
        if (accumulatedTime >= 0.04) {
          const nextRotY = rotY.value + 0.15 * accumulatedTime;
          rotY.value = nextRotY;
          savedRotY.value = nextRotY;
          accumulatedTime = 0;
          scheduleSync(rotX.value, nextRotY, zoom.value);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isAutoOrbitActive, viewMode, rotX, rotY, zoom, savedRotY, scheduleSync, isInteracting]);

  const applyCameraPreset = (target: { rotX: number; rotY: number; zoom: number }) => {
    rotX.value = target.rotX;
    savedRotX.value = target.rotX;
    rotY.value = target.rotY;
    savedRotY.value = target.rotY;
    zoom.value = target.zoom;
    savedZoom.value = target.zoom;
    setCamera(target);
  };

  const handleSelectPreset = (preset: VanshViewMode) => {
    void Haptics.selectionAsync();
    setViewMode(preset);
    applyCameraPreset(VIEW_PRESETS[preset]);
    if (preset !== 'orbit') setAutoOrbit(false);
  };

  const handleToggleOrbit = () => {
    if (isReducedMotion) return;
    void Haptics.selectionAsync();
    setAutoOrbit((prev) => !prev);
    if (!autoOrbit) {
      setViewMode('orbit');
      rotX.value = VIEW_PRESETS.orbit.rotX;
      savedRotX.value = VIEW_PRESETS.orbit.rotX;
      setCamera((prev) => ({ ...prev, rotX: VIEW_PRESETS.orbit.rotX }));
    }
  };

  const adjustZoom = (delta: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = Math.max(0.4, Math.min(2.5, zoom.value + delta));
    zoom.value = next;
    savedZoom.value = next;
    setCamera((prev) => ({ ...prev, zoom: next }));
  };

  const handleResetZoom = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    applyCameraPreset(VIEW_PRESETS[viewMode]);
  };

  const handleMemberPress = useCallback((member: KulFamilyMember) => {
    void Haptics.selectionAsync();
    onSelectMember?.(member);
  }, [onSelectMember]);

  // Project 3D nodes into screen space incorporating fitScale
  const projectedNodes: Vansh3DNode[] = useMemo(() => {
    return layout3D.nodes.map((node) => ({
      ...node,
      proj: project3D(
        node.p3d,
        camera.rotX,
        camera.rotY,
        camera.zoom,
        viewportSize.width,
        viewportSize.height,
        layout3D.fitScale
      ),
    }));
  }, [layout3D.nodes, layout3D.fitScale, camera, viewportSize]);

  const projectedNodeMap = useMemo(() => {
    const map = new Map<string, Vansh3DNode>();
    for (const n of projectedNodes) map.set(n.data.id, n);
    return map;
  }, [projectedNodes]);

  // Project crest
  const projectedCrest: Vansh3DCrest | null = useMemo(() => {
    if (!layout3D.crest) return null;
    return {
      ...layout3D.crest,
      proj: project3D(
        layout3D.crest.p3d,
        camera.rotX,
        camera.rotY,
        camera.zoom,
        viewportSize.width,
        viewportSize.height,
        layout3D.fitScale
      ),
    };
  }, [layout3D.crest, layout3D.fitScale, camera, viewportSize]);

  // Sort nodes back-to-front by depth
  const sortedNodes = useMemo(() => {
    return [...projectedNodes].sort((a, b) => (b.proj?.depth || 0) - (a.proj?.depth || 0));
  }, [projectedNodes]);

  // Selected member
  const selectedNode = useMemo(() => {
    return projectedNodes.find((n) => n.data.id === selectedMemberId) ?? null;
  }, [projectedNodes, selectedMemberId]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }, style]}>
      {/* Top 3D Mode & Orbit Bar */}
      <VanshTopHud
        viewMode={viewMode}
        autoOrbit={autoOrbit}
        onSelectPreset={handleSelectPreset}
        onToggleOrbit={handleToggleOrbit}
        isDark={isDark}
        reducedMotion={isReducedMotion}
      />

      {/* Interactive 3D Gesture Viewport */}
      <GestureDetector gesture={composedGesture}>
        <View
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
          {/* Background SVG Connectors (3D Lineage Filaments) */}
          <VanshFilaments
            viewportSize={viewportSize}
            edges={layout3D.edges}
            projectedNodeMap={projectedNodeMap}
            theme={theme}
          />

          {/* 3D Ancestral Crest Floating Anchor */}
          <VanshCrestBadge crest={projectedCrest} theme={theme} />

          {/* 3D Spatial Member Nodes */}
          {sortedNodes.map((node: Vansh3DNode) => {
            const member = node.data;
            const isSelected = selectedMemberId === member.id;
            const kinshipTier = getKinshipTier(node.generation);
            const proj = node.proj;
            if (!proj) return null;

            const scale = Math.max(0.65, Math.min(1.25, proj.scale));
            const cardWidth = 118 * scale;
            const cardHeight = 94 * scale;

            return (
              <Pressable
                key={member.id}
                onPress={() => handleMemberPress(member)}
                style={[
                  styles.memberCard3D,
                  {
                    left: proj.sx - cardWidth / 2,
                    top: proj.sy - cardHeight / 2,
                    width: cardWidth,
                    height: cardHeight,
                    backgroundColor: node.isRemembered ? theme.cardSoft : theme.card,
                    borderColor: isSelected
                      ? theme.brand
                      : node.isRemembered
                      ? theme.borderSoft
                      : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                    shadowColor: isSelected ? theme.brand : theme.border,
                    zIndex: Math.round(proj.depth),
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${member.name}, ${member.role || 'Family member'}, ${kinshipTier.label}, generation ${node.generation}, ${node.isRemembered ? 'remembered' : 'living'}`}
                accessibilityHint={isGuardian
                  ? 'Select to view details and family record actions.'
                  : 'Select to view family details.'}
                accessibilityState={{ selected: isSelected }}
              >
                {/* Selection Highlight Ring (Required by test contract) */}
                {isSelected ? (
                  <View
                    pointerEvents="none"
                    style={[styles.selectionRing, { borderColor: theme.brand }]}
                  />
                ) : null}

                {/* Card Top Row: Kinship Pill & Memorial Diya */}
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
                      style={[styles.kinshipPillText, { color: theme.brand, fontSize: 9 * scale }]}
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
                      <Text style={[styles.diyaIcon, { fontSize: 10 * scale }]}>🪔</Text>
                    </View>
                  ) : node.data.linked_user_id ? (
                    <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
                  ) : (
                    <View style={{ width: 4 }} />
                  )}
                </View>

                {/* Avatar Initial Circle */}
                <View style={[styles.avatarCircle, { backgroundColor: theme.brandSoft, width: 26 * scale, height: 26 * scale, borderRadius: 13 * scale }]}>
                  <Text style={{ fontFamily: FONTS.serifBold, fontSize: 12 * scale, color: theme.brand }}>
                    {member.name.trim().charAt(0).toUpperCase() || 'ॐ'}
                  </Text>
                </View>

                {/* Member Name & Role */}
                <View style={styles.memberBody}>
                  <Text
                    style={[
                      styles.memberName,
                      { color: theme.text, fontFamily: FONTS.serifBold, fontSize: 11 * scale, textAlign: 'center' },
                    ]}
                    numberOfLines={1}
                  >
                    {member.name}
                  </Text>
                  <Text
                    style={[
                      styles.memberRole,
                      { color: theme.dim, fontFamily: FONTS.sans, fontSize: 9 * scale, textAlign: 'center' },
                    ]}
                    numberOfLines={1}
                  >
                    {member.role || 'Family member'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </GestureDetector>

      {/* Selected Member Quick HUD (Bottom Inspector) */}
      <VanshBottomHud selectedNode={selectedNode} theme={theme} />

      {/* Floating Canvas Zoom Controls */}
      <VanshControlsDock
        onZoomIn={() => adjustZoom(0.25)}
        onZoomOut={() => adjustZoom(-0.25)}
        onResetZoom={handleResetZoom}
        isDark={isDark}
      />

      {/* Kinship Explainer Tooltip Modal */}
      <VanshKinshipModal
        activeKinshipTier={activeKinshipTier}
        onClose={() => setActiveKinshipTier(null)}
        isDark={isDark}
      />
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 72,
  },
  viewport: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  memberCard3D: {
    position: 'absolute',
    borderRadius: RADII.lg,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
  },
  selectionRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RADII.lg,
    borderWidth: 2,
  },
  cardHeaderRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kinshipPill: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: RADII.pill, borderWidth: 0.5 },
  kinshipPillText: { fontFamily: FONTS.sansSemiBold },
  smritiPill: { paddingHorizontal: 3, paddingVertical: 1, borderRadius: RADII.pill, borderWidth: 0.5 },
  diyaIcon: { textAlign: 'center' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  avatarCircle: { alignItems: 'center', justifyContent: 'center', marginVertical: 2 },
  memberBody: { width: '100%', alignItems: 'center' },
  memberName: { width: '100%' },
  memberRole: { width: '100%' },
});
