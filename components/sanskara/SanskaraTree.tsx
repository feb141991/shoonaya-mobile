import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { useReducedMotion } from '@/components/ui/Motion';
import { MIN_TOUCH_TARGET, RADII, SHADOWS, SPACING, TYPE, themeColor } from '@/lib/constants';
import type { SanskaraRecord } from '@/lib/sanskaraContract';
import { computeSanskaraLayout, dateAtSanskaraPosition, SANSKARA_INITIAL_VIEWPORT, SANSKARA_MIN_SCALE, SANSKARA_MAX_SCALE, type SanskaraViewport } from '@/lib/sanskaraLayout';

export type { SanskaraViewport } from '@/lib/sanskaraLayout';
export interface SanskaraTreeProps {
  subjectKey: string;
  records: SanskaraRecord[];
  editable: boolean;
  selectedId?: string;
  viewport?: SanskaraViewport;
  onViewportChange?: (viewport: SanskaraViewport) => void;
  onSelect: (record: SanskaraRecord) => void;
  onAdd: (plannedDate?: string) => void;
}

type Node = ReturnType<typeof computeSanskaraLayout>['nodes'][number];
function MilestoneNode({ node, selected, onPress }: { node: Node; selected: boolean; onPress: () => void }) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const reducedMotion = useReducedMotion();
  const bloom = useSharedValue(1);
  const previousState = useRef(node.state);
  useEffect(() => {
    if (previousState.current !== 'completed' && node.state === 'completed') {
      if (!reducedMotion) bloom.value = withSequence(withSpring(1.12), withSpring(1));
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    previousState.current = node.state;
    if (reducedMotion) bloom.value = 1;
  }, [node.state, reducedMotion, bloom]);
  const animation = useAnimatedStyle(() => ({ transform: [{ scale: bloom.value }] }));
  return <Animated.View style={[animation, { position: 'absolute', left: node.x - node.width / 2, top: node.y - node.height / 2, width: node.width, height: node.height }]}>
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}
      accessibilityLabel={`${node.record.custom_title ?? 'Milestone'}, ${node.state}${node.date ? `, ${node.date}` : ''}`}
      style={[styles.node, { backgroundColor: theme.card, borderColor: selected ? theme.brand : theme.border, boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light }]}>
      <Svg width={32} height={32} accessibilityElementsHidden>
        {node.state === 'completed' ? <>
          {[0, 60, 120].map(angle => <Ellipse key={angle} cx={16} cy={16} rx={6} ry={14} rotation={angle} origin="16,16" fill={theme.brandSoft} stroke={theme.brand} />)}
          <Circle cx={16} cy={16} r={4} fill={theme.brand} />
        </> : node.state === 'planned'
          ? <><Path d="M 16 30 L 16 16" stroke={theme.brand} strokeWidth={2} /><Ellipse cx={16} cy={11} rx={7} ry={10} fill={theme.brandSoft} stroke={theme.brand} /></>
          : <><Path d="M 16 28 L 16 20" stroke={theme.dim} strokeWidth={2} /><Ellipse cx={16} cy={15} rx={5} ry={7} fill={theme.border} /></>}
      </Svg>
      <Text numberOfLines={2} style={[TYPE.label, { color: theme.text, textAlign: 'center' }]}>{node.record.custom_title ?? 'Milestone'}</Text>
      <Text numberOfLines={1} style={[TYPE.caption, { color: theme.dim }]}>{node.date ?? 'Undated'}</Text>
    </Pressable>
  </Animated.View>;
}

/** Gesture and modal vocabulary matches Parampara; records are supplied for exactly one subject by the parent. */
export function SanskaraTree({ subjectKey, records, editable, selectedId, viewport = SANSKARA_INITIAL_VIEWPORT, onViewportChange, onSelect, onAdd }: SanskaraTreeProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const layout = useMemo(() => computeSanskaraLayout(records), [records]);
  const [listMode, setListMode] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isScreenReaderEnabled().then(value => { if (mounted) setScreenReader(value); });
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  const scale = useSharedValue(viewport.scale);
  const savedScale = useSharedValue(viewport.scale);
  const x = useSharedValue(viewport.x);
  const savedX = useSharedValue(viewport.x);
  const y = useSharedValue(viewport.y);
  const savedY = useSharedValue(viewport.y);
  const enter = useSharedValue(1);
  const initialViewport = useRef(viewport);
  useEffect(() => {
    const initial = initialViewport.current;
    scale.value = savedScale.value = initial.scale;
    x.value = savedX.value = initial.x;
    y.value = savedY.value = initial.y;
    enter.value = reducedMotion ? 1 : 0;
    if (!reducedMotion) enter.value = withTiming(1, { duration: 180 });
  }, [subjectKey, reducedMotion, scale, savedScale, x, savedX, y, savedY, enter]);
  const persist = (next: SanskaraViewport) => onViewportChange?.(next);
  const pan = Gesture.Pan().maxPointers(2).onUpdate(event => {
    x.value = savedX.value + event.translationX;
    y.value = savedY.value + event.translationY;
  }).onEnd(() => {
    savedX.value = x.value; savedY.value = y.value;
    runOnJS(persist)({ x: x.value, y: y.value, scale: scale.value });
  });
  const pinch = Gesture.Pinch().onUpdate(event => {
    scale.value = Math.min(SANSKARA_MAX_SCALE, Math.max(SANSKARA_MIN_SCALE, savedScale.value * event.scale));
  }).onEnd(() => {
    savedScale.value = scale.value;
    runOnJS(persist)({ x: x.value, y: y.value, scale: scale.value });
  });
  const canvasStyle = useAnimatedStyle(() => ({ opacity: enter.value, transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }] }));
  const zoom = (next: number) => {
    const bounded = Math.min(SANSKARA_MAX_SCALE, Math.max(SANSKARA_MIN_SCALE, next));
    scale.value = reducedMotion ? bounded : withTiming(bounded, { duration: 180 });
    savedScale.value = bounded;
    persist({ x: x.value, y: y.value, scale: bounded });
  };
  const useList = listMode || screenReader;
  return <View style={[styles.container, { backgroundColor: theme.bg }]}>
    <View style={styles.toolbar}>
      <Text style={[TYPE.caption, { flex: 1, color: theme.dim }]}>{useList ? 'Your milestones' : 'Pan, pinch, or tap a milestone'}</Text>
      {!screenReader && <PressableSurface onPress={() => setListMode(value => !value)} style={styles.control} accessibilityLabel={useList ? 'Show milestone tree' : 'Show accessible milestone list'}>
        <Feather name={useList ? 'git-branch' : 'list'} size={20} color={theme.brand} />
      </PressableSurface>}
    </View>
    {useList ? <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md, paddingBottom: insets.bottom + SPACING.xxl }}>
      {layout.nodes.map(node => <PressableSurface key={node.record.id} onPress={() => onSelect(node.record)} style={[styles.listRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[TYPE.body, { flex: 1, color: theme.text }]}>{node.record.custom_title ?? 'Milestone'}</Text>
        <Text style={[TYPE.caption, { color: theme.dim }]}>{node.state}{node.date ? ` · ${node.date}` : ''}</Text>
      </PressableSurface>)}
      {editable && <PressableSurface onPress={() => onAdd()} style={[styles.add, { backgroundColor: theme.brandSoft }]}><Text style={[TYPE.label, { color: theme.brand }]}>{records.length ? 'Plant a milestone' : 'Plant your first milestone'}</Text></PressableSurface>}
    </ScrollView> : <>
      <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
        <Animated.View style={styles.viewport}>
          <Animated.View style={[canvasStyle, { width: layout.canvasWidth, height: layout.canvasHeight }]}>
            <Svg style={StyleSheet.absoluteFill} width={layout.canvasWidth} height={layout.canvasHeight} pointerEvents="none">
              <Path d={`M ${layout.trunkX} ${layout.canvasHeight - 28} Q ${layout.trunkX - 12} ${layout.canvasHeight / 2} ${layout.trunkX} 64`} stroke={theme.brand} strokeWidth={6} fill="none" strokeLinecap="round" />
              {!layout.hasDatedMilestone && <><Ellipse cx={layout.trunkX - 16} cy={75} rx={20} ry={9} rotation={30} origin={`${layout.trunkX - 16},75`} fill={theme.brandSoft} stroke={theme.brand} /><Ellipse cx={layout.trunkX + 16} cy={57} rx={20} ry={9} rotation={-30} origin={`${layout.trunkX + 16},57`} fill={theme.brandSoft} stroke={theme.brand} /></>}
              {layout.nodes.map(node => <Path key={node.record.id} d={node.branch} stroke={theme.brand} strokeWidth={2} fill="none" />)}
            </Svg>
            {editable && <Pressable accessibilityRole="button" accessibilityLabel="Plant a milestone" accessibilityHint="Hold near a dated branch to use that chosen date, or tap to choose a date."
              onPress={() => onAdd()} onLongPress={event => onAdd(dateAtSanskaraPosition(layout, event.nativeEvent.locationY))}
              style={{ position: 'absolute', left: layout.trunkX - MIN_TOUCH_TARGET / 2, width: MIN_TOUCH_TARGET, top: 0, height: layout.canvasHeight }} />}
            {layout.nodes.map(node => <MilestoneNode key={node.record.id} node={node} selected={node.record.id === selectedId} onPress={() => onSelect(node.record)} />)}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
      <View style={[styles.hudDock, { bottom: insets.bottom + 72 }]}>
        <View style={[styles.hud, { backgroundColor: theme.glass, borderColor: theme.border }]}>
          <PressableSurface style={styles.control} accessibilityLabel="Zoom in" onPress={() => zoom(scale.value + 0.25)}><Feather name="plus" size={20} color={theme.text} /></PressableSurface>
          <PressableSurface style={styles.control} accessibilityLabel="Zoom out" onPress={() => zoom(scale.value - 0.25)}><Feather name="minus" size={20} color={theme.text} /></PressableSurface>
          <PressableSurface style={styles.control} accessibilityLabel="Center milestone tree" onPress={() => {
            x.value = savedX.value = 0; y.value = savedY.value = 0; zoom(1);
          }}><Feather name="maximize-2" size={20} color={theme.brand} /></PressableSurface>
        </View>
      </View>
    </>}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', minHeight: 360 },
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  viewport: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  node: { flex: 1, borderWidth: 1, borderRadius: RADII.lg, padding: SPACING.sm, alignItems: 'center', justifyContent: 'center' },
  control: { minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  hudDock: { position: 'absolute', right: SPACING.lg, zIndex: 10 },
  hud: { flexDirection: 'row', borderWidth: 1, borderRadius: RADII.pill, paddingHorizontal: SPACING.sm },
  add: { minHeight: MIN_TOUCH_TARGET, padding: SPACING.md, borderRadius: RADII.pill, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  listRow: { borderWidth: 1, borderRadius: RADII.lg, padding: SPACING.lg, minHeight: MIN_TOUCH_TARGET, gap: SPACING.sm },
});
