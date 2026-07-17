import Svg, { Circle, Defs, Ellipse, G, Line, Path, RadialGradient, Stop } from 'react-native-svg';

import { COLORS } from '@/lib/constants';
import type { MalaSkin } from '@/lib/mala-skins';

type Props = {
  skin: MalaSkin;
  size?: number;
  glow?: boolean;
};

function PendantGlyph({ skin, center, y, scale }: { skin: MalaSkin; center: number; y: number; scale: number }) {
  const gold = skin.threadColor;
  const dark = skin.beadBorder;

  if (skin.pendant === 'trishul') {
    return (
      <>
        <Line x1={center} y1={y - 14 * scale} x2={center} y2={y + 15 * scale} stroke={dark} strokeWidth={2.5 * scale} strokeLinecap="round" />
        <Path d={`M ${center - 9 * scale} ${y - 11 * scale} Q ${center - 6 * scale} ${y - 1 * scale} ${center} ${y - 4 * scale} Q ${center + 6 * scale} ${y - 1 * scale} ${center + 9 * scale} ${y - 11 * scale}`} stroke={dark} strokeWidth={2 * scale} fill="none" strokeLinecap="round" />
        <Circle cx={center} cy={y + 2 * scale} r={4 * scale} fill={gold} opacity={0.7} />
      </>
    );
  }

  if (skin.pendant === 'flute') {
    return (
      <>
        <Line x1={center - 15 * scale} y1={y + 8 * scale} x2={center + 15 * scale} y2={y - 8 * scale} stroke={dark} strokeWidth={4 * scale} strokeLinecap="round" />
        {[-7, 0, 7].map((offset) => (
          <Circle key={offset} cx={center + offset * scale} cy={y - offset * 0.48 * scale} r={1.4 * scale} fill={COLORS.onMediaWhite} opacity={0.8} />
        ))}
      </>
    );
  }

  if (skin.pendant === 'leaf' || skin.pendant === 'bodhi') {
    return (
      <>
        <Path d={`M ${center} ${y - 17 * scale} C ${center - 20 * scale} ${y - 4 * scale}, ${center - 12 * scale} ${y + 18 * scale}, ${center} ${y + 19 * scale} C ${center + 12 * scale} ${y + 18 * scale}, ${center + 20 * scale} ${y - 4 * scale}, ${center} ${y - 17 * scale} Z`} fill={gold} opacity={0.72} />
        <Line x1={center} y1={y - 10 * scale} x2={center} y2={y + 14 * scale} stroke={dark} strokeWidth={1.5 * scale} strokeLinecap="round" opacity={0.75} />
      </>
    );
  }

  if (skin.pendant === 'lotus') {
    return (
      <>
        {[-2, -1, 0, 1, 2].map((petal) => (
          <Path
            key={petal}
            d={`M ${center} ${y + 16 * scale} Q ${center + petal * 8 * scale} ${y - 12 * scale} ${center + petal * 4 * scale} ${y + 3 * scale}`}
            stroke={dark}
            strokeWidth={2 * scale}
            fill="none"
            strokeLinecap="round"
          />
        ))}
        <Ellipse cx={center} cy={y + 12 * scale} rx={16 * scale} ry={5 * scale} fill={gold} opacity={0.65} />
      </>
    );
  }

  if (skin.pendant === 'halo') {
    return (
      <>
        <Circle cx={center} cy={y} r={15 * scale} fill="none" stroke={dark} strokeWidth={2 * scale} opacity={0.7} />
        {Array.from({ length: 8 }).map((_, ray) => {
          const angle = (Math.PI * 2 * ray) / 8;
          return (
            <Line
              key={ray}
              x1={center + Math.cos(angle) * 11 * scale}
              y1={y + Math.sin(angle) * 11 * scale}
              x2={center + Math.cos(angle) * 19 * scale}
              y2={y + Math.sin(angle) * 19 * scale}
              stroke={dark}
              strokeWidth={1.8 * scale}
              strokeLinecap="round"
            />
          );
        })}
      </>
    );
  }

  return (
    <>
      <Circle cx={center} cy={y - 7 * scale} r={7 * scale} fill={dark} opacity={0.8} />
      <Path d={`M ${center - 14 * scale} ${y + 16 * scale} C ${center - 9 * scale} ${y - 1 * scale}, ${center + 9 * scale} ${y - 1 * scale}, ${center + 14 * scale} ${y + 16 * scale}`} fill={dark} opacity={0.72} />
      <Path d={`M ${center - 9 * scale} ${y + 7 * scale} Q ${center} ${y + 21 * scale} ${center + 9 * scale} ${y + 7 * scale}`} stroke={gold} strokeWidth={2 * scale} fill="none" strokeLinecap="round" opacity={0.9} />
      <Circle cx={center - 3 * scale} cy={y - 8 * scale} r={1.1 * scale} fill={COLORS.onMediaWhite} opacity={0.75} />
      <Circle cx={center + 3 * scale} cy={y - 8 * scale} r={1.1 * scale} fill={COLORS.onMediaWhite} opacity={0.75} />
    </>
  );
}

export function JapaMalaArtwork({ skin, size = 96, glow = true }: Props) {
  const view = 128;
  const center = view / 2;
  const ringRadius = 43;
  const beadCount = 28;
  const gradientSuffix = skin.label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${view} ${view}`}>
      <Defs>
        <RadialGradient id={`art-bead-${gradientSuffix}`} cx="30%" cy="24%" r="78%">
          <Stop offset="0%" stopColor={COLORS.onMediaWhite} stopOpacity="0.95" />
          <Stop offset="40%" stopColor={skin.beadColor} stopOpacity="0.95" />
          <Stop offset="100%" stopColor={skin.beadBorder} stopOpacity="1" />
        </RadialGradient>
        <RadialGradient id={`art-gold-${gradientSuffix}`} cx="32%" cy="22%" r="80%">
          <Stop offset="0%" stopColor={COLORS.onMediaWhite} stopOpacity="0.85" />
          <Stop offset="42%" stopColor={skin.threadColor} stopOpacity="1" />
          <Stop offset="100%" stopColor={skin.beadBorder} stopOpacity="1" />
        </RadialGradient>
      </Defs>
      {glow ? <Circle cx={center} cy={center} r={56} fill={skin.glowColor} opacity={0.18} /> : null}
      <Line x1={center} y1={center + ringRadius - 4} x2={center} y2={center + ringRadius + 19} stroke={skin.threadColor} strokeWidth={2.5} strokeLinecap="round" opacity={0.76} />
      {Array.from({ length: 5 }).map((_, i) => {
        const offset = (i - 2) * 4.3;
        return (
          <Path
            key={`tassel-${i}`}
            d={`M ${center} ${center + ringRadius + 12} C ${center + offset * 0.5} ${center + ringRadius + 22}, ${center + offset} ${center + ringRadius + 27}, ${center + offset} ${center + ringRadius + 34}`}
            stroke={skin.threadColor}
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
            opacity={0.82}
          />
        );
      })}
      {Array.from({ length: beadCount }).map((_, index) => {
        const angle = (Math.PI * 2 * index) / beadCount - Math.PI / 2;
        const x = center + Math.cos(angle) * ringRadius;
        const y = center + Math.sin(angle) * ringRadius;
        const isGuru = index === Math.floor(beadCount / 2);
        const r = isGuru ? 11 : 6.6;
        const spacerX = center + Math.cos(angle + Math.PI / beadCount) * ringRadius;
        const spacerY = center + Math.sin(angle + Math.PI / beadCount) * ringRadius;
        return (
          <G key={`bead-${index}`}>
            <Ellipse cx={spacerX} cy={spacerY} rx={2.5} ry={4.2} fill={skin.threadColor} opacity={0.72} transform={`rotate(${(angle * 180) / Math.PI}, ${spacerX}, ${spacerY})`} />
            <Circle cx={x + r * 0.18} cy={y + r * 0.24} r={r} fill={skin.beadBorder} opacity={0.28} />
            <Circle cx={x} cy={y} r={r} fill={`url(#art-bead-${gradientSuffix})`} stroke={skin.beadBorder} strokeWidth={0.75} />
            <Circle cx={x - r * 0.35} cy={y - r * 0.38} r={Math.max(1.1, r * 0.24)} fill={COLORS.onMediaWhite} opacity={0.64} />
            {isGuru ? <PendantGlyph skin={skin} center={x} y={y} scale={0.72} /> : null}
          </G>
        );
      })}
      <Circle cx={center} cy={center + ringRadius + 7} r={7} fill={`url(#art-gold-${gradientSuffix})`} stroke={skin.beadBorder} strokeWidth={0.8} />
    </Svg>
  );
}
