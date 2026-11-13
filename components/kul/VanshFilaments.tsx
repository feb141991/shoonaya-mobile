import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle as SvgCircle,
  G,
} from 'react-native-svg';
import type { Vansh3DEdge, Vansh3DNode } from '@/lib/vansh3d';

interface VanshFilamentsProps {
  viewportSize: { width: number; height: number };
  edges: Vansh3DEdge[];
  projectedNodeMap: Map<string, Vansh3DNode>;
  theme: {
    brand: string;
    brandStrong: string;
    brandSoft: string;
  };
}

export function VanshFilaments({
  viewportSize,
  edges,
  projectedNodeMap,
  theme,
}: VanshFilamentsProps) {
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width={viewportSize.width}
      height={viewportSize.height}
    >
      <Defs>
        <LinearGradient id="vanshGoldGradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.brand} stopOpacity="0.85" />
          <Stop offset="1" stopColor={theme.brandStrong} stopOpacity="0.45" />
        </LinearGradient>
      </Defs>

      {/* 3D Lineage Edges */}
      {edges.map((edge: Vansh3DEdge) => {
        const startNode = projectedNodeMap.get(edge.fromId);
        const endNode = projectedNodeMap.get(edge.toId);
        if (!startNode?.proj || !endNode?.proj) return null;

        const isSpouse = edge.type === 'spouse';
        const sx = startNode.proj.sx;
        const sy = startNode.proj.sy;
        const ex = endNode.proj.sx;
        const ey = endNode.proj.sy;
        const avgScale = (startNode.proj.scale + endNode.proj.scale) / 2;

        let d = '';
        if (isSpouse) {
          const midX = (sx + ex) / 2;
          const midY = (sy + ey) / 2 - 14 * avgScale;
          d = `M ${sx} ${sy} Q ${midX} ${midY} ${ex} ${ey}`;
        } else {
          const midY = (sy + ey) / 2;
          d = `M ${sx} ${sy} C ${sx} ${midY} ${ex} ${midY} ${ex} ${ey}`;
        }

        return (
          <G key={edge.id}>
            {/* Outer subtle glow */}
            <Path
              d={d}
              fill="none"
              stroke={theme.brandSoft}
              strokeWidth={isSpouse ? 3.5 : 5.0}
              strokeLinecap="round"
              strokeDasharray={isSpouse ? '4,4' : undefined}
            />
            {/* Central radiant thread */}
            <Path
              d={d}
              fill="none"
              stroke={isSpouse ? theme.brandSoft : 'url(#vanshGoldGradient)'}
              strokeWidth={isSpouse ? 1.6 : 2.2 * avgScale}
              strokeLinecap="round"
              strokeDasharray={isSpouse ? '4,4' : undefined}
            />
            <SvgCircle
              cx={sx}
              cy={sy}
              r={2.4 * avgScale}
              fill={theme.brand}
            />
            <SvgCircle
              cx={ex}
              cy={ey}
              r={2.8 * avgScale}
              fill={theme.brand}
            />
          </G>
        );
      })}
    </Svg>
  );
}
