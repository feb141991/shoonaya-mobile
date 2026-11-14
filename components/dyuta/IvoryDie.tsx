import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient as SvgLinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { COLORS } from '@/lib/constants';

const DIE_PIPS: Record<number, readonly number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

// Pip centres on a unit face, indexed like DIE_PIPS (row-major 3×3).
const PIP_GRID = [0.24, 0.5, 0.76] as const;
// Faces visible beside each front value; opposite faces of a standard die sum to seven.
const DIE_NEIGHBOURS: Record<number, [number, number]> = { 1: [2, 3], 2: [3, 1], 3: [1, 2], 4: [5, 1], 5: [1, 3], 6: [2, 4] };

type Point = readonly [number, number];
/** Closed SVG path through `points` with every corner rounded by up to `radius`. */
function roundedPath(points: readonly Point[], radius: number): string {
  const n = points.length;
  const toward = (from: Point, to: Point): Point => { const dx = to[0] - from[0]; const dy = to[1] - from[1]; const length = Math.hypot(dx, dy) || 1; const r = Math.min(radius, length / 2); return [from[0] + (dx / length) * r, from[1] + (dy / length) * r]; };
  return points.map((point, index) => {
    const before = toward(point, points[(index - 1 + n) % n]);
    const after = toward(point, points[(index + 1) % n]);
    return `${index === 0 ? 'M' : 'L'} ${before[0]} ${before[1]} Q ${point[0]} ${point[1]} ${after[0]} ${after[1]}`;
  }).join(' ') + ' Z';
}

/**
 * Ivory cube in oblique projection with rounded edges: the front face carries
 * the value, the top and right faces show neighbouring faces, a soft rim light
 * runs along the top edge and a shadow sits on the mat. A concealed die keeps
 * every face blank.
 */
export function IvoryDie({ value, label, tilt, size = 92, airborne = false }: { value: number | null; label: string; tilt: string; size?: number; airborne?: boolean }) {
  const x0 = 12, y0 = 32, s = 54, d = 15;
  const x1 = x0 + s, y1 = y0 + s;
  const tl: Point = [x0, y0], tr: Point = [x1, y0], br: Point = [x1, y1], bl: Point = [x0, y1];
  const btl: Point = [x0 + d, y0 - d], btr: Point = [x1 + d, y0 - d], bbr: Point = [x1 + d, y1 - d];
  const pipsFor = (face: number) => DIE_PIPS[face] ?? [];
  const [topFace, sideFace] = value ? DIE_NEIGHBOURS[value] : [0, 0];
  const inset = 0.08;
  const grid = (index: number) => inset + (1 - inset * 2) * PIP_GRID[index];
  const frontPips = value ? pipsFor(value).map((cell) => ({ cx: x0 + s * grid(cell % 3), cy: y0 + s * grid(Math.floor(cell / 3)) })) : [];
  const topPips = value ? pipsFor(topFace).map((cell) => { const u = grid(cell % 3); const v = 1 - grid(Math.floor(cell / 3)); return { cx: x0 + s * u + d * v, cy: y0 - d * v }; }) : [];
  const sidePips = value ? pipsFor(sideFace).map((cell) => { const u = grid(cell % 3); const v = 1 - grid(Math.floor(cell / 3)); return { cx: x1 + d * u, cy: y1 - d * u - s * v }; }) : [];
  return <View accessible accessibilityRole="image" accessibilityLabel={airborne ? `${label}: rolling` : value ? `${label}: ${value}` : `${label}: concealed`} style={{ width: size, height: size, transform: [{ rotate: tilt }] }}>
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <SvgLinearGradient id="dieFront" x1="0" y1="0" x2="1" y2="1"><Stop offset={0} stopColor={COLORS.dyutaIvory} /><Stop offset={1} stopColor={COLORS.dyutaIvoryShade} /></SvgLinearGradient>
        <SvgLinearGradient id="dieTop" x1="0" y1="1" x2="1" y2="0"><Stop offset={0} stopColor={COLORS.dyutaIvory} /><Stop offset={1} stopColor={COLORS.dyutaIvoryShade} /></SvgLinearGradient>
        <SvgLinearGradient id="dieSide" x1="0" y1="0" x2="1" y2="1"><Stop offset={0} stopColor={COLORS.dyutaIvoryShade} /><Stop offset={1} stopColor={COLORS.dyutaIvoryEdge} /></SvgLinearGradient>
        <RadialGradient id="dieShadow" cx="50%" cy="50%" r="50%"><Stop offset={0} stopColor={COLORS.dyutaDieShadow} /><Stop offset={1} stopColor={COLORS.dyutaDieShadow} stopOpacity={0} /></RadialGradient>
      </Defs>
      {airborne ? null : <Ellipse cx={x0 + s / 2 + 10} cy={y1 + 3} rx={s * 0.66} ry={7.5} fill="url(#dieShadow)" />}
      {/* silhouette doubles as the softened edge between faces */}
      <Path d={roundedPath([bl, tl, btl, btr, bbr, br], 9)} fill={COLORS.dyutaIvoryEdge} />
      <Path d={roundedPath([tr, btr, bbr, br], 7)} fill="url(#dieSide)" transform="translate(-0.6 0.4)" />
      <Path d={roundedPath([tl, btl, btr, tr], 7)} fill="url(#dieTop)" transform="translate(0.4 0.5)" />
      <Path d={roundedPath([tl, tr, br, bl], 10)} fill="url(#dieFront)" />
      <Path d={`M ${x0 + 9} ${y0 + 1.4} H ${x1 - 9}`} stroke={COLORS.navGlowIvoryLight} strokeWidth={1.6} strokeLinecap="round" />
      <Path d={`M ${x0 + 1.4} ${y0 + 9} V ${y1 - 9}`} stroke={COLORS.navGlowIvoryLight} strokeWidth={1.2} strokeLinecap="round" />
      {topPips.map((pip, index) => <Ellipse key={`t${index}`} cx={pip.cx} cy={pip.cy} rx={3.2} ry={1.5} fill={COLORS.ink} fillOpacity={0.85} />)}
      {sidePips.map((pip, index) => <Ellipse key={`s${index}`} cx={pip.cx} cy={pip.cy} rx={1.4} ry={3.4} fill={COLORS.ink} fillOpacity={0.8} />)}
      {frontPips.map((pip, index) => <Circle key={`f${index}`} cx={pip.cx} cy={pip.cy} r={5} fill={COLORS.ink} />)}
    </Svg>
    {value === null ? <View style={{ position: 'absolute', left: (x0 / 100) * size, top: (y0 / 100) * size, width: (s / 100) * size, height: (s / 100) * size, alignItems: 'center', justifyContent: 'center' }}><Feather name="help-circle" size={24} color={COLORS.brandEarthLight} /></View> : null}
  </View>;
}
