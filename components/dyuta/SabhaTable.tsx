import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient as SvgLinearGradient, Path, Polygon, RadialGradient, Stop } from 'react-native-svg';

import type { Theme } from '@/components/dyuta/types';
import { COLORS } from '@/lib/constants';

/**
 * Octagonal carved table drawn in a 100×100 box and squashed vertically for a
 * seated perspective: a heavy sandstone slab with a lotus-relief rim, a carved
 * lip, a gold filigree band and a layered mandala on the mat.
 */
export function SabhaTable({ width, theme, isDark, children }: { width: number; theme: Theme; isDark: boolean; children: React.ReactNode }) {
  const height = Math.round(width * 0.76);
  const rim = isDark ? COLORS.dyutaRimDark : COLORS.dyutaRimLight;
  const edge = isDark ? COLORS.dyutaRimEdgeDark : COLORS.dyutaRimEdgeLight;
  const mat = isDark ? COLORS.dyutaMatDark : COLORS.dyutaMatLight;
  const highlight = isDark ? COLORS.navGlowIvoryDark : COLORS.navGlowIvoryLight;
  const gold = theme.brand;
  const cy = 47;
  const octagon = (radius: number, dy = 0) => Array.from({ length: 8 }, (_, index) => { const angle = Math.PI / 8 + (index * Math.PI) / 4; return `${50 + radius * Math.cos(angle)},${cy + dy + radius * Math.sin(angle)}`; }).join(' ');
  const ring = (count: number, radius: number, offset = 0) => Array.from({ length: count }, (_, index) => { const angle = offset + (index * 2 * Math.PI) / count; return { x: 50 + radius * Math.cos(angle), y: cy + radius * Math.sin(angle), deg: (angle * 180) / Math.PI }; });
  // Radial lotus petal centred on (x, y), pointing outward.
  const petal = (x: number, y: number, deg: number, length: number, girth: number) => `M ${-length} 0 Q 0 ${-girth} ${length} 0 Q 0 ${girth} ${-length} 0 Z`;
  return <View style={{ width, height, alignSelf: 'center' }}>
    <Svg width={width} height={height} viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute' }}>
      <Defs>
        <SvgLinearGradient id="dyutaSlab" x1="0" y1="0" x2="0" y2="1"><Stop offset={0} stopColor={rim} /><Stop offset={0.55} stopColor={rim} /><Stop offset={1} stopColor={edge} /></SvgLinearGradient>
        <RadialGradient id="dyutaMat" cx={50} cy={cy} r={37} gradientUnits="userSpaceOnUse"><Stop offset={0} stopColor={mat} /><Stop offset={0.82} stopColor={mat} /><Stop offset={1} stopColor={rim} /></RadialGradient>
        <RadialGradient id="dyutaFloor" cx="50%" cy="50%" r="50%"><Stop offset={0} stopColor={COLORS.dyutaDieShadow} /><Stop offset={1} stopColor={COLORS.dyutaDieShadow} stopOpacity={0} /></RadialGradient>
      </Defs>
      {/* floor shadow and slab thickness */}
      <Ellipse cx={50} cy={cy + 8} rx={50} ry={46} fill="url(#dyutaFloor)" />
      <Polygon points={octagon(49.5, 4)} fill={edge} />
      <Polygon points={octagon(49.5, 2)} fill={edge} stroke={edge} strokeWidth={0.4} />
      <Polygon points={octagon(49.5)} fill="url(#dyutaSlab)" stroke={edge} strokeWidth={0.6} />
      {/* faceted stone panels: faces turned away from the light (lower half) carry more shade */}
      <G>{Array.from({ length: 8 }, (_, index) => {
        const corner = (radius: number, step: number) => { const angle = Math.PI / 8 + (step * Math.PI) / 4; return `${50 + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`; };
        const facing = Math.sin(Math.PI / 8 + ((index + 0.5) * Math.PI) / 4);
        return <G key={index}>
          <Polygon points={`${corner(49.5, index)} ${corner(49.5, index + 1)} ${corner(39.5, index + 1)} ${corner(39.5, index)}`} fill={edge} fillOpacity={0.12 + Math.max(0, facing) * 0.4} />
          <Line x1={50 + 49.5 * Math.cos(Math.PI / 8 + (index * Math.PI) / 4)} y1={cy + 49.5 * Math.sin(Math.PI / 8 + (index * Math.PI) / 4)} x2={50 + 39.5 * Math.cos(Math.PI / 8 + (index * Math.PI) / 4)} y2={cy + 39.5 * Math.sin(Math.PI / 8 + (index * Math.PI) / 4)} stroke={edge} strokeWidth={0.5} />
        </G>;
      })}</G>
      <Polygon points={octagon(47.4)} fill="none" stroke={highlight} strokeWidth={0.6} />
      {/* lotus relief: each petal is carved (edge tone) with a lit upper lip */}
      <G>{ring(28, 42).map(({ x, y, deg }, index) => <G key={index} transform={`translate(${x} ${y}) rotate(${deg})`}>
        <Path d={petal(x, y, deg, 2.7, 1.9)} fill={edge} fillOpacity={0.55} />
        <Path d={petal(x, y, deg, 2.7, 1.9)} fill="none" stroke={highlight} strokeWidth={0.35} transform="translate(-0.25 -0.25)" />
      </G>)}</G>
      <G>{ring(28, 42, Math.PI / 28).map(({ x, y }, index) => <Circle key={index} cx={x} cy={y} r={0.45} fill={edge} />)}</G>
      {/* carved lip around the mat */}
      <Circle cx={50} cy={cy} r={38.4} fill="none" stroke={edge} strokeWidth={1.1} />
      <Circle cx={50} cy={cy} r={39.3} fill="none" stroke={highlight} strokeWidth={0.4} />
      {/* gold filigree band */}
      <Circle cx={50} cy={cy} r={37.4} fill="url(#dyutaMat)" stroke={gold} strokeWidth={0.7} />
      <Circle cx={50} cy={cy} r={35.2} fill="none" stroke={gold} strokeWidth={0.35} />
      <G>{ring(36, 36.3).map(({ x, y, deg }, index) => <Ellipse key={index} cx={x} cy={y} rx={0.5} ry={1} fill={gold} fillOpacity={0.75} transform={`rotate(${deg} ${x} ${y})`} />)}</G>
      <Circle cx={50} cy={cy} r={31.5} fill="none" stroke={gold} strokeWidth={0.3} strokeDasharray="0.8 1.2" />
      <G>{ring(12, 31.5).map(({ x, y, deg }, index) => <Path key={index} d={`M ${x} ${y - 2} Q ${x + 1.5} ${y} ${x} ${y + 2} Q ${x - 1.5} ${y} ${x} ${y - 2} Z`} fill="none" stroke={gold} strokeWidth={0.35} strokeOpacity={0.8} transform={`rotate(${deg + 90} ${x} ${y})`} />)}</G>
      {/* layered centre mandala */}
      <Circle cx={50} cy={cy} r={25} fill="none" stroke={gold} strokeWidth={0.35} strokeOpacity={0.55} />
      <G>{Array.from({ length: 16 }, (_, index) => <Ellipse key={index} cx={50} cy={cy - 18} rx={2.3} ry={5.2} fill="none" stroke={gold} strokeWidth={0.35} strokeOpacity={0.55} transform={`rotate(${index * 22.5} 50 ${cy})`} />)}</G>
      <G>{Array.from({ length: 8 }, (_, index) => <Ellipse key={index} cx={50} cy={cy - 11} rx={2.8} ry={6} fill="none" stroke={gold} strokeWidth={0.35} strokeOpacity={0.55} transform={`rotate(${index * 45 + 22.5} 50 ${cy})`} />)}</G>
      <Circle cx={50} cy={cy} r={8.5} fill="none" stroke={gold} strokeWidth={0.35} strokeOpacity={0.55} />
      <Circle cx={50} cy={cy} r={3} fill={gold} fillOpacity={0.35} />
    </Svg>
    <View style={{ position: 'absolute', top: 0, right: 0, bottom: height * 0.06, left: 0, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
  </View>;
}
