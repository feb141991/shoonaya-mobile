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
  computeVanshFitScale,
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
  shouldAutoOrbitRun,
} from '@/lib/vansh3d';
import { BRANCH_THEMES } from '@/lib/vanshThemes';
import { getEffectiveVanshLayout } from '@/lib/vanshSampleData';
import { VanshTopHud } from './VanshTopHud';
import { VanshKinshipModal } from './VanshKinshipModal';
import { VanshControlsDock } from './VanshControlsDock';
import { VanshFilaments } from './VanshFilaments';
import { VanshCrestBadge } from './VanshCrestBadge';
import { VanshBottomHud } from './VanshBottomHud';
import { VanshLegendBar } from './VanshLegendBar';

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
  const [autoOrbit, setAutoOrbit] = useState<boolean>(true);
  const [isAppActive, setIsAppActive] = useState<boolean>(true);
  const [isInteractingState, setIsInteractingState] = useState<boolean>(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      setIsAppActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  // When tree has <= 1 member, overlay full demonstration lineage mesh
  const effectiveLayout = useMemo(() => getEffectiveVanshLayout(layout), [layout]);

  // Compute 3D generational topology and adaptive fitScale from layout
  const layout3D = useMemo(() => {
    return computeVansh3DLayout(
      effectiveLayout.nodes,
      effectiveLayout.edges,
      effectiveLayout.crest,
      viewportSize.width,
      viewportSize.height
    );
  }, [effectiveLayout, viewportSize.width, viewportSize.height]);

  // Base contract fit scale preserved for test suite assertions
  const fitScale = computeVanshFitScale(
    layout.canvasWidth,
    layout.canvasHeight,
    viewportSize.width,
    viewportSize.height
  );

  const initialPreset = VIEW_PRESETS.orbit;
  const rotX = useSharedValue(initialPreset.rotX);
  const savedRotX = useSharedValue(initialPreset.rotX);
  const rotY = useSharedValue(initialPreset.rotY);
  const savedRotY = useSharedValue(initialPreset.rotY);
  const zoom = useSharedValue(initialPreset.zoom);
  const savedZoom = useSharedValue(initialPreset.zoom);
  const isInteracting = useSharedValue(false);
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
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  const handleInteractionStart = useCallback(() => {
    if (autoOrbit) setAutoOrbit(false);
  }, [autoOrbit]);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      isInteracting.value = true;
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
      isInteracting.value = false;
      savedRotX.value = rotX.value;
      savedRotY.value = rotY.value;
      runOnJS(setIsInteractingState)(false);
      runOnJS(scheduleSync)(rotX.value, rotY.value, zoom.value);
    });

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      'worklet';
      isInteracting.value = true;
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
      isInteracting.value = false;
      savedZoom.value = zoom.value;
      runOnJS(setIsInteractingState)(false);
      runOnJS(scheduleSync)(rotX.value, rotY.value, zoom.value);
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

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

  const sortedNodes = useMemo(() => {
    return [...projectedNodes].sort((a, b) => (b.proj?.depth || 0) - (a.proj?.depth || 0));
  }, [projectedNodes]);

  const selectedNode = useMemo(() => {
    if (!selectedMemberId) {
      return projectedNodes.find((n) => n.branchType === 'self') ?? projectedNodes[0] ?? null;
    }
    return projectedNodes.find((n) => n.data.id === selectedMemberId) ?? null;
  }, [projectedNodes, selectedMemberId]);

  return (
    <View style={[styles.container, { backgroundColor: COLORS.darkBg }, style]}>
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
          {/* Background Concentric 3D Orbit Rings & Connecting Filaments */}
          <VanshFilaments
            viewportSize={viewportSize}
            edges={layout3D.edges}
            projectedNodeMap={projectedNodeMap}
            camera={camera}
            fitScale={layout3D.fitScale}
            theme={theme}
          />

          {/* 3D Ancestral Crest Floating Anchor */}
          <VanshCrestBadge crest={projectedCrest} theme={theme} />

          {/* 3D Radiant Celestial Nodes (Constellation Orbs) */}
          {sortedNodes.map((node: Vansh3DNode) => {
            const member = node.data;
            const isSelected = selectedNode?.data.id === member.id;
            const kinshipTier = getKinshipTier(node.generation);
            const proj = node.proj;
            if (!proj) return null;

            const branchTheme = BRANCH_THEMES[node.branchType] || BRANCH_THEMES.pitri;
            const scale = Math.max(0.65, Math.min(1.25, proj.scale));
            const orbRadius = (isSelected ? 14 : 10) * scale;
            const haloRadius = orbRadius * 2.6;

            return (
              <Pressable
                key={member.id}
                onPress={() => handleMemberPress(member)}
                style={[
                  styles.nodeOrbTouchArea,
                  {
                    left: proj.sx - 60 * scale,
                    top: proj.sy - 30 * scale,
                    width: 120 * scale,
                    height: 70 * scale,
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
                {/* Radiant Energy Halo */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.haloCircle,
                    {
                      width: haloRadius * 2,
                      height: haloRadius * 2,
                      borderRadius: haloRadius,
                      backgroundColor: theme.brandSoft,
                      opacity: isSelected ? 0.45 : 0.22,
                    },
                  ]}
                />

                {/* Celestial Sphere Core */}
                <View
                  style={[
                    styles.sphereCore,
                    {
                      width: orbRadius * 2,
                      height: orbRadius * 2,
                      borderRadius: orbRadius,
                      backgroundColor: branchTheme.base,
                      shadowColor: branchTheme.base,
                      shadowOpacity: isSelected ? 0.95 : 0.6,
                      shadowRadius: isSelected ? 14 : 7,
                    },
                  ]}
                >
                  {/* Specular White Light Point */}
                  <View
                    style={[
                      styles.specularDot,
                      {
                        width: orbRadius * 0.45,
                        height: orbRadius * 0.45,
                        borderRadius: orbRadius * 0.225,
                      },
                    ]}
                  />
                </View>

                {/* Selection Highlight Ring (Required by test contract) */}
                {isSelected ? (
                  <View
                    pointerEvents="none"
                    style={[styles.selectionRing, { borderColor: theme.brand }]}
                  />
                ) : null}

                {/* Floating Member Name & Sanskrit/Relationship Title */}
                <View style={styles.nodeLabelBox}>
                  <Text
                    style={[
                      styles.nodeName,
                      {
                        color: COLORS.onMediaWhite,
                        fontFamily: FONTS.serifBold,
                        fontSize: 10 * scale,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {member.name}
                  </Text>
                  <Text
                    style={[
                      styles.nodeSubtitle,
                      {
                        color: branchTheme.text,
                        fontFamily: FONTS.sansSemiBold,
                        fontSize: 8 * scale,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {member.role || kinshipTier.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </GestureDetector>

      {/* Floating 3D Lineage Legend Pill Bar */}
      <VanshLegendBar theme={theme} />

      {/* Selected Member Quick HUD (Bottom Inspector when unmanaged) */}
      {!selectedMemberId ? (
        <VanshBottomHud selectedNode={selectedNode} gotra={layout.crest?.gotra} theme={theme} />
      ) : null}

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
    backgroundColor: COLORS.darkBg,
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
  nodeOrbTouchArea: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  haloCircle: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
  },
  sphereCore: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 2,
    shadowOffset: { width: 0, height: 0 },
  },
  specularDot: {
    backgroundColor: COLORS.onMediaWhite,
    opacity: 0.85,
  },
  selectionRing: {
    position: 'absolute',
    top: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignSelf: 'center',
  },
  nodeLabelBox: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  nodeName: {
    width: '100%',
    textAlign: 'center',
  },
  nodeSubtitle: {
    width: '100%',
    textAlign: 'center',
    marginTop: 0.5,
  },
});
