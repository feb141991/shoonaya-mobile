import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle as SvgCircle } from 'react-native-svg';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { Lineage, LineageNode } from '@/lib/lineage-data';
import { computeLineageLayout, LayoutNode, LayoutEdge } from '@/lib/lineageLayout';
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, SHADOWS, themeColor } from '@/lib/constants';

interface LineageGraphCanvasProps {
  lineage: Lineage;
  selectedNodeId?: string;
  onSelectNode: (node: LineageNode) => void;
}

export function LineageGraphCanvas({
  lineage,
  selectedNodeId,
  onSelectNode,
}: LineageGraphCanvasProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const layout = useMemo(() => computeLineageLayout(lineage), [lineage]);

  const handleNodePress = (node: LineageNode) => {
    void Haptics.selectionAsync();
    onSelectNode(node);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalContainer}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.verticalContainer,
          { width: layout.canvasWidth, height: layout.canvasHeight },
        ]}
      >
        <View style={{ width: layout.canvasWidth, height: layout.canvasHeight }}>
          {/* Background SVG Connectors */}
          <Svg
            style={StyleSheet.absoluteFill}
            width={layout.canvasWidth}
            height={layout.canvasHeight}
          >
            <Defs>
              <LinearGradient id="edgeGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={isDark ? '#D97706' : '#B45309'} stopOpacity="0.8" />
                <Stop offset="1" stopColor={isDark ? '#F59E0B' : '#D97706'} stopOpacity="0.4" />
              </LinearGradient>
            </Defs>

            {layout.edges.map((edge: LayoutEdge, idx: number) => (
              <React.Fragment key={`edge-${idx}`}>
                {/* Glow under-path */}
                <Path
                  d={edge.pathD}
                  fill="none"
                  stroke={isDark ? 'rgba(217, 119, 6, 0.25)' : 'rgba(180, 83, 9, 0.18)'}
                  strokeWidth={6}
                  strokeLinecap="round"
                />
                {/* Main line */}
                <Path
                  d={edge.pathD}
                  fill="none"
                  stroke="url(#edgeGradient)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                {/* Start and end decorative dots */}
                <SvgCircle cx={edge.startX} cy={edge.startY} r={3} fill={theme.brand} />
                <SvgCircle cx={edge.endX} cy={edge.endY} r={3.5} fill={COLORS.brandGold} />
              </React.Fragment>
            ))}
          </Svg>

          {/* Edge Text Badges */}
          {layout.edges.map((edge, idx) =>
            edge.label ? (
              <View
                key={`edge-label-${idx}`}
                style={[
                  styles.edgeLabelBadge,
                  {
                    left: edge.labelX - 44,
                    top: edge.labelY,
                    backgroundColor: isDark ? '#1F2937' : '#FEF3C7',
                    borderColor: isDark ? '#374151' : '#FDE68A',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.edgeLabelText,
                    { color: isDark ? '#FDE68A' : '#92400E' },
                  ]}
                  numberOfLines={1}
                >
                  {edge.label}
                </Text>
              </View>
            ) : null
          )}

          {/* Interactive Foreground Nodes */}
          {layout.nodes.map((node: LayoutNode) => {
            const isSelected = selectedNodeId === node.data.id;
            const left = node.x - node.width / 2;
            const top = node.y - node.height / 2;

            return (
              <Pressable
                key={node.data.id}
                onPress={() => handleNodePress(node.data)}
                style={[
                  styles.nodeCard,
                  {
                    left,
                    top,
                    width: node.width,
                    height: node.height,
                    backgroundColor: isDark ? '#111827' : '#FFFFFF',
                    borderColor: isSelected
                      ? COLORS.brandGold
                      : isDark
                      ? '#374151'
                      : '#E5E7EB',
                    shadowColor: isSelected ? COLORS.brandGold : '#000',
                    shadowOpacity: isSelected ? 0.35 : 0.08,
                    shadowRadius: isSelected ? 12 : 4,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${node.data.name}, ${node.data.title}`}
              >
                {/* Selection Highlight Ring */}
                {isSelected ? <View style={styles.selectionRing} /> : null}

                {/* Node Icon Avatar */}
                <View
                  style={[
                    styles.nodeAvatar,
                    {
                      backgroundColor: isDark ? 'rgba(217, 119, 6, 0.16)' : '#FEF3C7',
                      borderColor: isDark ? 'rgba(217, 119, 6, 0.3)' : '#FDE68A',
                    },
                  ]}
                >
                  <Feather
                    name="award"
                    size={18}
                    color={node.data.colorAccent || theme.brand}
                  />
                </View>

                {/* Node Info */}
                <Text
                  style={[styles.nodeName, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {node.data.name}
                </Text>

                {node.data.sanskritName ? (
                  <Text
                    style={[styles.nodeSanskrit, { color: theme.brand }]}
                    numberOfLines={1}
                  >
                    {node.data.sanskritName}
                  </Text>
                ) : null}

                <Text
                  style={[styles.nodeEra, { color: theme.dim }]}
                  numberOfLines={1}
                >
                  {node.data.era}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  horizontalContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeCard: {
    position: 'absolute',
    borderRadius: RADII.lg,
    borderWidth: 1.5,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    minHeight: MIN_TOUCH_TARGET,
  },
  selectionRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: RADII.lg,
    borderWidth: 2,
    borderColor: COLORS.brandGold,
    pointerEvents: 'none',
  },
  nodeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  nodeName: {
    fontFamily: FONTS.serifBold,
    fontSize: 12.5,
    lineHeight: 16,
    textAlign: 'center',
  },
  nodeSanskrit: {
    fontFamily: FONTS.serif,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  nodeEra: {
    fontFamily: FONTS.sans,
    fontSize: 9.5,
    marginTop: 2,
    textAlign: 'center',
  },
  edgeLabelBadge: {
    position: 'absolute',
    width: 88,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: RADII.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  edgeLabelText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 9,
    textAlign: 'center',
  },
});
