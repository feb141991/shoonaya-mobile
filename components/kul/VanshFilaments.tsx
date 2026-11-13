import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle as SvgCircle,
  G,
  Text as SvgText,
} from 'react-native-svg';
import {
  project3D,
  type Vansh3DEdge,
  type Vansh3DNode,
} from '@/lib/vansh3d';
import { COLORS } from '@/lib/constants';
import { GENERATION_ORBIT_LEVELS } from '@/lib/vanshThemes';

interface VanshFilamentsProps {
  viewportSize: { width: number; height: number };
  edges: Vansh3DEdge[];
  projectedNodeMap: Map<string, Vansh3DNode>;
  camera: { rotX: number; rotY: number; zoom: number };
  fitScale: number;
  theme: {
    brand: string;
    brandStrong: string;
    brandSoft: string;
    text: string;
    dim: string;
  };
}

export function VanshFilaments({
  viewportSize,
  edges,
  projectedNodeMap,
  camera,
  fitScale,
  theme,
}: VanshFilamentsProps) {
  // Compute 3D generational concentric orbit rings
  const orbitRings = useMemo(() => {
    return GENERATION_ORBIT_LEVELS.map((level) => {
      const steps = 24;
      let pathD = '';
      for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const x = Math.cos(angle) * 230;
        const z = Math.sin(angle) * 115;
        const y = level.yTier;
        const proj = project3D(
          { x, y, z },
          camera.rotX,
          camera.rotY,
          camera.zoom,
          viewportSize.width,
          viewportSize.height,
          fitScale
        );
        if (i === 0) {
          pathD += `M ${proj.sx.toFixed(1)} ${proj.sy.toFixed(1)}`;
        } else {
          pathD += ` L ${proj.sx.toFixed(1)} ${proj.sy.toFixed(1)}`;
        }
      }
      pathD += ' Z';

      // Label coordinate on the edge of the ring
      const labelProj = project3D(
        { x: 235, y: level.yTier, z: 0 },
        camera.rotX,
        camera.rotY,
        camera.zoom,
        viewportSize.width,
        viewportSize.height,
        fitScale
      );

      return {
        key: `ring-${level.gen}`,
        d: pathD,
        labelProj,
        label: level.label,
      };
    });
  }, [camera, fitScale, viewportSize]);

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width={viewportSize.width}
      height={viewportSize.height}
    >
      <Defs>
        <LinearGradient id="vanshGoldGradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={COLORS.radiantGold} stopOpacity="0.95" />
          <Stop offset="1" stopColor={COLORS.tileGold} stopOpacity="0.65" />
        </LinearGradient>
        <LinearGradient id="vanshRoseGradient" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={COLORS.like} stopOpacity="0.95" />
          <Stop offset="1" stopColor={COLORS.deityRose} stopOpacity="0.65" />
        </LinearGradient>
      </Defs>

      {/* 3D Concentric Generational Orbit Rings */}
      {orbitRings.map((ring) => (
        <G key={ring.key}>
          <Path
            d={ring.d}
            fill="none"
            stroke={COLORS.tileGold}
            strokeWidth={1}
            strokeDasharray="4,4"
            opacity={0.35}
          />
          {ring.labelProj.scale > 0.4 && (
            <SvgText
              x={ring.labelProj.sx + 8}
              y={ring.labelProj.sy + 3}
              fill={COLORS.onMediaWhite}
              fontSize={9 * Math.max(ring.labelProj.scale, 0.75)}
              opacity={0.55}
            >
              {ring.label}
            </SvgText>
          )}
        </G>
      ))}

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
              stroke={isSpouse ? COLORS.deityRose : COLORS.tileGold}
              strokeWidth={isSpouse ? 3.0 : 4.5}
              strokeLinecap="round"
              strokeDasharray={isSpouse ? '4,4' : undefined}
              opacity={isSpouse ? 0.35 : 0.45}
            />
            {/* Central radiant thread */}
            <Path
              d={d}
              fill="none"
              stroke={isSpouse ? 'url(#vanshRoseGradient)' : 'url(#vanshGoldGradient)'}
              strokeWidth={isSpouse ? 1.5 : 2.0 * avgScale}
              strokeLinecap="round"
              strokeDasharray={isSpouse ? '4,4' : undefined}
            />
            <SvgCircle
              cx={sx}
              cy={sy}
              r={2.6 * avgScale}
              fill={isSpouse ? COLORS.deityRose : COLORS.tileGold}
            />
            <SvgCircle
              cx={ex}
              cy={ey}
              r={3.0 * avgScale}
              fill={isSpouse ? COLORS.deityRose : COLORS.tileGold}
            />
          </G>
        );
      })}
    </Svg>
  );
}
