import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, LinearGradient as SvgLinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { Theme } from '@/components/dyuta/types';
import { COLORS } from '@/lib/constants';

type Vec = { x: number; y: number };
function cubicPoint(p0: Vec, p1: Vec, p2: Vec, p3: Vec, t: number): Vec {
  const u = 1 - t;
  return { x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y };
}

/**
 * Cusped (multifoil) pointed arch from `left` to `right`, springing at
 * `spring` and peaking at `apex`, closed down to `floor`. Each lobe bulges
 * outward between inward-pointing cusps, the classic Mughal opening.
 */
function multifoilArch(left: number, right: number, spring: number, apex: number, floor: number, lobes = 4): string {
  const width = right - left;
  const mid = left + width / 2;
  const leftCurve = [{ x: left, y: spring }, { x: left, y: spring - width * 0.5 }, { x: mid - width * 0.14, y: apex + width * 0.1 }, { x: mid, y: apex }] as const;
  const rightCurve = [{ x: mid, y: apex }, { x: mid + width * 0.14, y: apex + width * 0.1 }, { x: right, y: spring - width * 0.5 }, { x: right, y: spring }] as const;
  const centre = { x: mid, y: spring };
  const depth = width * 0.05;
  const points: Vec[] = [];
  for (let index = 0; index <= lobes; index += 1) points.push(cubicPoint(...leftCurve, index / lobes));
  for (let index = 1; index <= lobes; index += 1) points.push(cubicPoint(...rightCurve, index / lobes));
  let d = `M ${left} ${floor} L ${left} ${spring}`;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]; const to = points[index];
    const m = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const away = { x: m.x - centre.x, y: m.y - centre.y };
    const length = Math.hypot(away.x, away.y) || 1;
    d += ` Q ${m.x + (away.x / length) * depth} ${m.y + (away.y / length) * depth} ${to.x} ${to.y}`;
  }
  return `${d} L ${right} ${floor} Z`;
}

/**
 * Palace hall behind the in-game header, after the mockup: a cream wall with
 * three sunlit multifoil arches on capitals, a jali screen in the centre
 * opening, hanging brass diyas with glowing flames and potted plants, fading
 * into the floor the table sits on. Decorative only; it scrolls with the page.
 */
export function SabhaHallBackdrop({ width, theme, isDark }: { width: number; theme: Theme; isDark: boolean }) {
  const height = 560;
  const wall = theme.cardSoft;
  const lightTop = isDark ? COLORS.homeHeroDark : COLORS.homeHeroLight;
  const lightBottom = isDark ? COLORS.homeRaisedDark : COLORS.homeRaisedLight;
  const glow = isDark ? COLORS.navGlowGoldDark : COLORS.navGlowGoldLight;
  const column = width * 0.075;
  const span = (width - column * 4) / 3;
  const spring = 250;
  const apex = 96;
  const opening = (index: number) => { const left = column + index * (span + column); return { left, right: left + span }; };
  const centre = opening(1);
  const lamp = (x: number) => <G key={x}>
    {Array.from({ length: 9 }, (_, index) => <Ellipse key={index} cx={x} cy={4 + index * 6} rx={1.6} ry={2.8} fill="none" stroke={theme.brandStrong} strokeWidth={1} />)}
    <Circle cx={x} cy={66} r={30} fill="url(#hallFlame)" />
    <Path d={`M ${x - 16} 66 Q ${x} 86 ${x + 16} 66 Z`} fill={theme.brand} stroke={theme.brandStrong} strokeWidth={1} />
    <Path d={`M ${x - 18} 66 H ${x + 18}`} stroke={theme.brandStrong} strokeWidth={1.6} strokeLinecap="round" />
    <Circle cx={x} cy={80} r={2.2} fill={theme.brandStrong} />
    <Path d={`M ${x} 50 Q ${x + 4} 58 ${x} 64 Q ${x - 4} 58 ${x} 50 Z`} fill={theme.brand} />
    <Ellipse cx={x} cy={60} rx={1.4} ry={2.6} fill={COLORS.dyutaIvory} />
  </G>;
  const plant = (x: number, flip: 1 | -1) => <G key={x} transform={`translate(${x} 40) scale(${flip * 0.6} 0.6)`}>
    {[[-22, 120, -38], [-10, 108, -14], [6, 112, 14], [18, 126, 36], [-2, 98, 2], [-30, 140, -60], [26, 142, 58]].map(([dx, cy, deg], index) => <Ellipse key={index} cx={dx} cy={cy} rx={6} ry={20} fill={COLORS.sage} fillOpacity={0.55 + (index % 3) * 0.12} transform={`rotate(${deg} ${dx} ${cy})`} />)}
    <Path d="M -20 150 H 20 L 15 182 Q 0 188 -15 182 Z" fill={theme.brand} />
    <Path d="M -22 150 H 22" stroke={theme.brandStrong} strokeWidth={3} strokeLinecap="round" />
  </G>;
  return <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
    <Svg width={width} height={height}>
      <Defs>
        <SvgLinearGradient id="hallLight" x1="0" y1="0" x2="0" y2="1"><Stop offset={0} stopColor={lightTop} /><Stop offset={1} stopColor={lightBottom} /></SvgLinearGradient>
        <SvgLinearGradient id="hallFade" x1="0" y1="0" x2="0" y2="1"><Stop offset={0} stopColor={theme.bg} stopOpacity={0} /><Stop offset={1} stopColor={theme.bg} stopOpacity={1} /></SvgLinearGradient>
        <RadialGradient id="hallSun" cx="50%" cy="40%" r="50%"><Stop offset={0} stopColor={glow} stopOpacity={0.55} /><Stop offset={1} stopColor={glow} stopOpacity={0} /></RadialGradient>
        <RadialGradient id="hallFlame" cx="50%" cy="50%" r="50%"><Stop offset={0} stopColor={glow} /><Stop offset={1} stopColor={glow} stopOpacity={0} /></RadialGradient>
        <ClipPath id="hallJali"><Path d={multifoilArch(centre.left + 14, centre.right - 14, spring + 30, apex + 60, height)} /></ClipPath>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill={wall} />
      {[0, 1, 2].map((index) => { const { left, right } = opening(index); return <G key={index}>
        <Path d={multifoilArch(left - 5, right + 5, spring, apex - 7, height)} fill="none" stroke={theme.premiumBorder} strokeWidth={6} />
        <Path d={multifoilArch(left, right, spring, apex, height)} fill="url(#hallLight)" stroke={theme.brand} strokeOpacity={0.35} strokeWidth={1.2} />
      </G>; })}
      {/* jali screen in the centre opening */}
      <G clipPath="url(#hallJali)">
        <Rect x={centre.left} y={apex} width={span} height={height - apex} fill={theme.brandSoft} />
        {Array.from({ length: 30 }, (_, index) => { const offset = index * 14 - 160; return <G key={index}>
          <Line x1={centre.left + offset} y1={height} x2={centre.left + offset + height} y2={0} stroke={theme.brand} strokeOpacity={0.35} strokeWidth={1} />
          <Line x1={centre.left + offset} y1={0} x2={centre.left + offset + height} y2={height} stroke={theme.brand} strokeOpacity={0.35} strokeWidth={1} />
        </G>; })}
      </G>
      <Ellipse cx={width / 2} cy={spring} rx={width * 0.5} ry={spring * 0.9} fill="url(#hallSun)" />
      {/* columns with capitals and bases */}
      {[0, 1, 2, 3].map((index) => { const x = index * (span + column); return <G key={index}>
        <Rect x={x + column * 0.18} y={spring - 4} width={column * 0.64} height={height - spring} fill={wall} stroke={theme.premiumBorder} strokeWidth={1} />
        <Rect x={x - 2} y={spring - 14} width={column + 4} height={10} rx={2} fill={wall} stroke={theme.brand} strokeOpacity={0.35} strokeWidth={1} />
        <Path d={`M ${x + column * 0.5} ${spring - 26} l 5 8 l -5 4 l -5 -4 Z`} fill={theme.brand} fillOpacity={0.6} />
      </G>; })}
      {[width * 0.24, width * 0.76].map(lamp)}
      {plant(width * 0.03, 1)}
      {plant(width * 0.97, -1)}
      <Rect x={0} y={height - 200} width={width} height={200} fill="url(#hallFade)" />
    </Svg>
  </View>;
}
