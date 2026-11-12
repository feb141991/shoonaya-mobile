import { COLORS, FEATURE_COLORS } from '@/lib/constants';
import { Circle, G, Line, Path } from 'react-native-svg';

// Bead-ring constants and the Meru crown live at module scope: a component
// declared inside JapaScreen would be a new type on every render and remount
// on every bead tap.
export const NAVARATNA_GEMS = [
  { id: 'ruby', name: 'Manikya', color: FEATURE_COLORS.japa.rubyGem, dark: FEATURE_COLORS.japa.rubyDark, light: FEATURE_COLORS.japa.rubyLight, rim: COLORS.radiantGold },
  { id: 'pearl', name: 'Mukta', color: FEATURE_COLORS.japa.pearlGem, dark: FEATURE_COLORS.japa.pearlDark, light: COLORS.onMediaWhite, rim: FEATURE_COLORS.japa.pearlRim },
  { id: 'coral', name: 'Moonga', color: FEATURE_COLORS.japa.coralGem, dark: FEATURE_COLORS.japa.coralDark, light: FEATURE_COLORS.japa.coralLight, rim: COLORS.radiantGold },
  { id: 'emerald', name: 'Marakata', color: FEATURE_COLORS.japa.emeraldGem, dark: FEATURE_COLORS.japa.emeraldDark, light: FEATURE_COLORS.japa.emeraldLight, rim: COLORS.radiantGold },
  { id: 'topaz', name: 'Pukhraj', color: FEATURE_COLORS.japa.topazGem, dark: FEATURE_COLORS.japa.topazDark, light: FEATURE_COLORS.japa.topazLight, rim: COLORS.radiantGold },
  { id: 'diamond', name: 'Heera', color: FEATURE_COLORS.japa.diamondGem, dark: FEATURE_COLORS.japa.diamondDark, light: COLORS.onMediaWhite, rim: FEATURE_COLORS.japa.diamondRim },
  { id: 'sapphire', name: 'Neelam', color: FEATURE_COLORS.japa.sapphireGem, dark: FEATURE_COLORS.japa.sapphireDark, light: FEATURE_COLORS.japa.sapphireLight, rim: COLORS.radiantGold },
  { id: 'hessonite', name: 'Gomed', color: COLORS.warningLight, dark: FEATURE_COLORS.japa.hessoniteDark, light: FEATURE_COLORS.japa.hessoniteLight, rim: COLORS.radiantGold },
  { id: 'catseye', name: 'Vaidurya', color: FEATURE_COLORS.japa.catseyeGem, dark: FEATURE_COLORS.japa.catseyeDark, light: FEATURE_COLORS.japa.catseyeLight, rim: COLORS.radiantGold },
] as const;

export function MeruCrownApex({
  cx,
  cy,
  glowColor,
  threadColor,
}: {
  cx: number;
  cy: number;
  glowColor: string;
  threadColor: string;
}) {
  const r = 20;
  const rays = Array.from({ length: 12 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 12;
    const rInner = r + 3;
    const rOuter = r + 12;
    return {
      x1: cx + Math.cos(angle) * rInner,
      y1: cy + Math.sin(angle) * rInner,
      x2: cx + Math.cos(angle) * rOuter,
      y2: cy + Math.sin(angle) * rOuter,
    };
  });

  return (
    <G>
      {/* Radiant Golden Rays */}
      {rays.map((ray, i) => (
        <Line
          key={`meru-ray-${i}`}
          x1={ray.x1}
          y1={ray.y1}
          x2={ray.x2}
          y2={ray.y2}
          stroke={COLORS.radiantGold}
          strokeWidth={i % 2 === 0 ? 2 : 1.2}
          strokeOpacity={i % 2 === 0 ? 0.9 : 0.6}
          strokeLinecap="round"
        />
      ))}

      {/* Luminous aura glow */}
      <Circle cx={cx} cy={cy} r={r + 8} fill={glowColor} opacity={0.42} />

      {/* Drop shadow */}
      <Circle cx={cx + 2} cy={cy + 3} r={r} fill={FEATURE_COLORS.japa.fill} />

      {/* 3D Filigree Meru Sphere */}
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        fill="url(#grad-meru-gold)"
        stroke={FEATURE_COLORS.japa.stroke}
        strokeWidth={1.6}
      />

      {/* Sacred Filigree Yantra Lattice */}
      <Circle
        cx={cx}
        cy={cy}
        r={r * 0.72}
        fill="none"
        stroke={FEATURE_COLORS.japa.stroke2}
        strokeWidth={0.9}
        strokeDasharray="3,2"
        opacity={0.88}
      />
      <Circle
        cx={cx}
        cy={cy}
        r={r * 0.44}
        fill="none"
        stroke={FEATURE_COLORS.japa.stroke2}
        strokeWidth={0.8}
        opacity={0.92}
      />

      {/* Filigree Petal Arches */}
      <Path
        d={`M ${cx - r * 0.6} ${cy} Q ${cx} ${cy - r * 0.6} ${cx + r * 0.6} ${cy} Q ${cx} ${cy + r * 0.6} ${cx - r * 0.6} ${cy}`}
        fill="none"
        stroke={FEATURE_COLORS.japa.stroke2}
        strokeWidth={0.8}
        opacity={0.75}
      />
      <Path
        d={`M ${cx} ${cy - r * 0.6} Q ${cx - r * 0.6} ${cy} ${cx} ${cy + r * 0.6} Q ${cx + r * 0.6} ${cy} ${cx} ${cy - r * 0.6}`}
        fill="none"
        stroke={FEATURE_COLORS.japa.stroke2}
        strokeWidth={0.8}
        opacity={0.75}
      />

      {/* Top Bindu & Crown Specular Sparkle */}
      <Circle cx={cx - r * 0.3} cy={cy - r * 0.32} r={r * 0.24} fill={COLORS.onMediaWhite} opacity={0.95} />
      <Circle cx={cx} cy={cy} r={2.8} fill={COLORS.onMediaWhite} stroke={COLORS.warningLight} strokeWidth={0.8} />

      {/* Left/Right Thread Connectors */}
      <Circle cx={cx - r - 2} cy={cy} r={3.2} fill={threadColor} stroke={COLORS.radiantGold} strokeWidth={0.8} />
      <Circle cx={cx + r + 2} cy={cy} r={3.2} fill={threadColor} stroke={COLORS.radiantGold} strokeWidth={0.8} />
    </G>
  );
}
